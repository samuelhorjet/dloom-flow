// FILE: programs/dloom_flow/src/dlmm/instructions/modify_liquidity.rs

use crate::{
    dlmm::{
        math,
        state::{Bin, DlmmPool, Position},
    },
    errors::DloomError,
    events::DlmmLiquidityModified,
    state::TransactionBins,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use std::collections::HashMap; // Added for validation

pub fn handle_dlmm_modify_liquidity<'info>(
    ctx: Context<'_, '_, 'info, 'info, DlmmModifyLiquidity<'info>>,
    min_surplus_a_out: u64,
    min_surplus_b_out: u64,
) -> Result<()> {
    // --- New Validation Step ---
    // Create a HashMap for quick lookup of all provided bin accounts.
    let account_infos_map: HashMap<Pubkey, &'info AccountInfo<'info>> = ctx
        .remaining_accounts
        .iter()
        .map(|acc| (acc.key(), acc)) // Simply pass the reference, no .clone()
        .collect();

    // Verify that every pubkey cached in the transaction account was actually provided.
    for bin_pubkey in &ctx.accounts.transaction_bins.bins {
        require!(
            account_infos_map.contains_key(bin_pubkey),
            DloomError::BinCacheMismatch
        );
    }
    // --- End Validation ---

    let old_position_state = &*ctx.accounts.old_position;
    let new_position_state = &*ctx.accounts.new_position;
    let dlmm_pool_state = &*ctx.accounts.dlmm_pool;
    let bin_step = dlmm_pool_state.bin_step as i32;
    let liquidity_to_move = old_position_state.liquidity;
    require!(liquidity_to_move > 0, DloomError::PositionNotEmpty);

    // --- Calculations (Largely unchanged) ---
    // 1. Calculate what is being withdrawn from the old position.
    let (principal_a, principal_b) =
        math::calculate_claimable_amounts(dlmm_pool_state, old_position_state, liquidity_to_move)?;

    let mut total_fees_a: u128 = 0;
    let mut total_fees_b: u128 = 0;

    // 2. Separate the cached bin pubkeys for the old and new positions.
    let expected_old_bins_count =
        ((old_position_state.upper_bin_id - old_position_state.lower_bin_id) / bin_step + 1)
            as usize;
    let (old_bins_pubkeys, new_bins_pubkeys) = ctx
        .accounts
        .transaction_bins
        .bins
        .split_at(expected_old_bins_count);

    // 3. Process old bins: calculate fees and remove liquidity.
    let liquidity_per_old_bin = liquidity_to_move
        .checked_div(expected_old_bins_count as u128)
        .ok_or(DloomError::MathOverflow)?;

    for bin_pubkey in old_bins_pubkeys.iter() {
        let bin_info = account_infos_map.get(bin_pubkey).unwrap(); // Safe due to validation
        let bin_loader = AccountLoader::<'_, Bin>::try_from(bin_info)?;
        let mut bin = bin_loader.load_mut()?;
        let (fees_a, fees_b) = math::calculate_accrued_fees(old_position_state, &bin);
        total_fees_a = total_fees_a
            .checked_add(fees_a as u128)
            .ok_or(DloomError::MathOverflow)?;
        total_fees_b = total_fees_b
            .checked_add(fees_b as u128)
            .ok_or(DloomError::MathOverflow)?;
        bin.liquidity = bin
            .liquidity
            .checked_sub(liquidity_per_old_bin)
            .ok_or(DloomError::MathOverflow)?;
    }

    let total_claimable_a = principal_a
        .checked_add(total_fees_a)
        .ok_or(DloomError::MathOverflow)?;
    let total_claimable_b = principal_b
        .checked_add(total_fees_b)
        .ok_or(DloomError::MathOverflow)?;

    // 4. Calculate token amounts required for the new position.
    let (required_a, required_b) = math::calculate_required_token_amounts(
        dlmm_pool_state,
        new_position_state.lower_bin_id,
        new_position_state.upper_bin_id,
        liquidity_to_move,
    )?;

    // 5. Calculate surplus to be sent back to the user.
    let surplus_a = total_claimable_a
        .checked_sub(required_a)
        .ok_or(DloomError::MathOverflow)?;
    let surplus_b = total_claimable_b
        .checked_sub(required_b)
        .ok_or(DloomError::MathOverflow)?;
    require!(
        surplus_a >= min_surplus_a_out as u128 && surplus_b >= min_surplus_b_out as u128,
        DloomError::SlippageExceeded
    );

    // --- CPIs & State Updates (Largely unchanged) ---
    // 6. Prepare signer seeds.
    let bin_step_bytes = &dlmm_pool_state.bin_step.to_le_bytes()[..];
    let bump = &[dlmm_pool_state.bump][..];
    let signer_seeds = &[
        b"dlmm_pool",
        dlmm_pool_state.token_a_mint.as_ref(),
        dlmm_pool_state.token_b_mint.as_ref(),
        bin_step_bytes,
        bump,
    ][..];

    // 7. Transfer surplus tokens back to the user.
    if surplus_a > 0 {
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
            surplus_a as u64,
            ctx.accounts.token_a_mint.decimals,
        )?;
    }
    if surplus_b > 0 {
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
            surplus_b as u64,
            ctx.accounts.token_b_mint.decimals,
        )?;
    }

    // 8. Update state.
    let dlmm_pool = &mut ctx.accounts.dlmm_pool;
    dlmm_pool.reserves_a = dlmm_pool
        .reserves_a
        .checked_sub(surplus_a as u64)
        .ok_or(DloomError::MathOverflow)?;
    dlmm_pool.reserves_b = dlmm_pool
        .reserves_b
        .checked_sub(surplus_b as u64)
        .ok_or(DloomError::MathOverflow)?;

    ctx.accounts.old_position.liquidity = 0;

    let new_position = &mut ctx.accounts.new_position;
    new_position.liquidity = new_position
        .liquidity
        .checked_add(liquidity_to_move)
        .ok_or(DloomError::MathOverflow)?;

    let liquidity_per_new_bin = liquidity_to_move
        .checked_div(new_bins_pubkeys.len() as u128)
        .ok_or(DloomError::MathOverflow)?;
    let mut snapshot_a: u128 = 0;
    let mut snapshot_b: u128 = 0;

    for bin_pubkey in new_bins_pubkeys.iter() {
        let bin_info = account_infos_map.get(bin_pubkey).unwrap(); // Safe due to validation
        let bin_loader = AccountLoader::<'_, Bin>::try_from(bin_info)?;
        let mut bin = bin_loader.load_mut()?;
        bin.liquidity = bin
            .liquidity
            .checked_add(liquidity_per_new_bin)
            .ok_or(DloomError::MathOverflow)?;
        snapshot_a = snapshot_a.max(bin.fee_growth_per_unit_a);
        snapshot_b = snapshot_b.max(bin.fee_growth_per_unit_b);
    }
    new_position.fee_growth_snapshot_a = snapshot_a;
    new_position.fee_growth_snapshot_b = snapshot_b;

    emit!(DlmmLiquidityModified {
        owner: ctx.accounts.owner.key(),
        pool_address: ctx.accounts.dlmm_pool.key(),
        old_position_address: ctx.accounts.old_position.key(),
        new_position_address: ctx.accounts.new_position.key(),
        liquidity_to_move,
        surplus_a_out: surplus_a as u64,
        surplus_b_out: surplus_b as u64,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct DlmmModifyLiquidity<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub dlmm_pool: Box<Account<'info, DlmmPool>>,

    #[account(
        mut,
        has_one = owner @ DloomError::Unauthorized,
        constraint = old_position.pool == dlmm_pool.key() @ DloomError::InvalidPool
    )]
    pub old_position: Box<Account<'info, Position>>,

    #[account(
        mut,
        has_one = owner @ DloomError::Unauthorized,
        constraint = new_position.pool == dlmm_pool.key() @ DloomError::InvalidPool
    )]
    pub new_position: Box<Account<'info, Position>>,

    /// The temporary account holding the pubkeys of all bins for both old and new positions.
    #[account(
        mut,
        has_one = owner,
        close = owner,
        seeds = [b"transaction_bins", owner.key().as_ref()],
        bump
    )]
    pub transaction_bins: Account<'info, TransactionBins>,

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