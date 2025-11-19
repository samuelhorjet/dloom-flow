// FILE: programs/dloom_flow/src/dlmm/instructions/remove_liquidity.rs

use crate::{
    errors::DloomError,
    dlmm::{
        math, 
        state::{Bin, DlmmPool, Position}, 
    },
    state::{TransactionBins},
    events::DlmmLiquidityUpdate 
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use std::collections::HashMap; 

pub fn handle_dlmm_remove_liquidity<'info>(
    ctx: Context<'_, '_, 'info, 'info, DlmmRemoveLiquidity<'info>>,
    liquidity_to_remove: u128,
    min_amount_a: u64,
    min_amount_b: u64,
) -> Result<()> {
    require!(liquidity_to_remove > 0, DloomError::ZeroLiquidity);
    require!(
        liquidity_to_remove <= ctx.accounts.position.liquidity,
        DloomError::InsufficientLiquidity
    );

    // --- New Validation Step ---
    // Create a HashMap for quick lookup of provided bin accounts.
    let account_infos_map: HashMap<Pubkey, &'info AccountInfo<'info>> = ctx
    .remaining_accounts
    .iter()
    .map(|acc| (acc.key(), acc)) // Simply pass the reference, no .clone()
    .collect();

    // Ensure every bin public key cached in the transaction account was actually provided.
    for bin_pubkey in &ctx.accounts.transaction_bins.bins {
        require!(
            account_infos_map.contains_key(bin_pubkey),
            DloomError::BinCacheMismatch
        );
    }
    // --- End Validation ---

    // Calculate the principal amounts to be withdrawn.
    let (principal_a, principal_b) = math::calculate_claimable_amounts(
        &ctx.accounts.dlmm_pool,
        &ctx.accounts.position,
        liquidity_to_remove,
    )?;

    let mut total_fees_a: u64 = 0;
    let mut total_fees_b: u64 = 0;
    let mut final_fee_growth_a: u128 = ctx.accounts.position.fee_growth_snapshot_a;
    let mut final_fee_growth_b: u128 = ctx.accounts.position.fee_growth_snapshot_b;
    let mut current_bin_id = ctx.accounts.position.lower_bin_id;

    // Iterate through the validated bin pubkeys from the cache to calculate fees.
    for bin_pubkey in &ctx.accounts.transaction_bins.bins {
        // Safe to unwrap due to the validation check above.
        let bin_info = account_infos_map.get(bin_pubkey).unwrap();

        let (expected_pda, _) = Pubkey::find_program_address(
            &[
                b"bin",
                ctx.accounts.dlmm_pool.key().as_ref(),
                &current_bin_id.to_le_bytes(),
            ],
            ctx.program_id,
        );
        require_keys_eq!(bin_info.key(), expected_pda, DloomError::InvalidBinAccount);

        let bin_loader = AccountLoader::<'_, Bin>::try_from(bin_info)?;
        let bin = bin_loader.load()?;
        let (fees_a, fees_b) = math::calculate_accrued_fees(&ctx.accounts.position, &bin);

        total_fees_a = total_fees_a.checked_add(fees_a).ok_or(DloomError::MathOverflow)?;
        total_fees_b = total_fees_b.checked_add(fees_b).ok_or(DloomError::MathOverflow)?;
        final_fee_growth_a = std::cmp::max(final_fee_growth_a, bin.fee_growth_per_unit_a);
        final_fee_growth_b = std::cmp::max(final_fee_growth_b, bin.fee_growth_per_unit_b);
        current_bin_id = current_bin_id
            .checked_add(ctx.accounts.dlmm_pool.bin_step as i32)
            .ok_or(DloomError::MathOverflow)?;
    }

    let total_withdrawal_a = (principal_a as u64)
        .checked_add(total_fees_a)
        .ok_or(DloomError::MathOverflow)?;
    let total_withdrawal_b = (principal_b as u64)
        .checked_add(total_fees_b)
        .ok_or(DloomError::MathOverflow)?;
    require!(
        total_withdrawal_a >= min_amount_a,
        DloomError::SlippageExceeded
    );
    require!(
        total_withdrawal_b >= min_amount_b,
        DloomError::SlippageExceeded
    );

    // --- Perform CPIs to withdraw tokens ---
    let bin_step_bytes = &ctx.accounts.dlmm_pool.bin_step.to_le_bytes()[..];
    let bump = &[ctx.accounts.dlmm_pool.bump][..];
    let signer_seeds = &[
        b"dlmm_pool",
        ctx.accounts.dlmm_pool.token_a_mint.as_ref(),
        ctx.accounts.dlmm_pool.token_b_mint.as_ref(),
        bin_step_bytes,
        bump,
    ][..];

    if total_withdrawal_a > 0 {
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_a_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.token_a_vault.to_account_info(),
                    to: ctx.accounts.user_token_a_account.to_account_info(),
                    authority: ctx.accounts.dlmm_pool.to_account_info(),
                    mint: ctx.accounts.token_a_mint.to_account_info(),
                },
                &[signer_seeds],
            ),
            total_withdrawal_a,
            ctx.accounts.token_a_mint.decimals,
        )?;
    }
    if total_withdrawal_b > 0 {
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_b_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.token_b_vault.to_account_info(),
                    to: ctx.accounts.user_token_b_account.to_account_info(),
                    authority: ctx.accounts.dlmm_pool.to_account_info(),
                    mint: ctx.accounts.token_b_mint.to_account_info(),
                },
                &[signer_seeds],
            ),
            total_withdrawal_b,
            ctx.accounts.token_b_mint.decimals,
        )?;
    }

    // --- Update State ---
    let dlmm_pool = &mut ctx.accounts.dlmm_pool;
    if total_withdrawal_a > 0 {
        dlmm_pool.reserves_a = dlmm_pool
            .reserves_a
            .checked_sub(total_withdrawal_a)
            .ok_or(DloomError::MathOverflow)?;
    }
    if total_withdrawal_b > 0 {
        dlmm_pool.reserves_b = dlmm_pool
            .reserves_b
            .checked_sub(total_withdrawal_b)
            .ok_or(DloomError::MathOverflow)?;
    }

    let position = &mut ctx.accounts.position;
    position.liquidity = position
        .liquidity
        .checked_sub(liquidity_to_remove)
        .ok_or(DloomError::MathOverflow)?;
    position.fee_growth_snapshot_a = final_fee_growth_a;
    position.fee_growth_snapshot_b = final_fee_growth_b;

    emit!(DlmmLiquidityUpdate {
    position_address: ctx.accounts.position.key(),
    liquidity_added: -(liquidity_to_remove as i128), // This is a removal
    amount_a: total_withdrawal_a,
    amount_b: total_withdrawal_b,
});

    Ok(())
}

#[derive(Accounts)]
pub struct DlmmRemoveLiquidity<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"dlmm_pool",
            dlmm_pool.token_a_mint.as_ref(),
            dlmm_pool.token_b_mint.as_ref(),
            &dlmm_pool.bin_step.to_le_bytes()
        ],
        bump = dlmm_pool.bump
    )]
    pub dlmm_pool: Box<Account<'info, DlmmPool>>,

    #[account(mut, has_one = owner @ DloomError::Unauthorized)]
    pub position: Box<Account<'info, Position>>,

    /// The temporary account that holds the pubkeys of the bins being read for fee calculations.
    #[account(
        mut,
        has_one = owner,
        close = owner,
        seeds = [b"transaction_bins", owner.key().as_ref()],
        bump
    )]
    pub transaction_bins: Box<Account<'info, TransactionBins>>,

    #[account(address = dlmm_pool.token_a_mint)]
    pub token_a_mint: InterfaceAccount<'info, Mint>,

    #[account(address = dlmm_pool.token_b_mint)]
    pub token_b_mint: InterfaceAccount<'info, Mint>,

    #[account(mut, token::mint = dlmm_pool.token_a_mint, has_one = owner)]
    pub user_token_a_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::mint = dlmm_pool.token_b_mint, has_one = owner)]
    pub user_token_b_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, address = dlmm_pool.token_a_vault)]
    pub token_a_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, address = dlmm_pool.token_b_vault)]
    pub token_b_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_a_program: Interface<'info, TokenInterface>,
    pub token_b_program: Interface<'info, TokenInterface>,
}