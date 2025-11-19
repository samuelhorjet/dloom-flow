// FILE: programs/dloom_flow/src/amm/instructions/remove_liquidity.rs

use crate::{
    errors::DloomError,
    events::AmmLiquidityRemoved,
    amm::{
        instructions::swap::update_oracle,
        math,                              
        state::{AmmPool, AmmPosition},
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Burn, Mint, TokenAccount, TokenInterface, TransferChecked,
};

pub fn handle_remove_amm_liquidity(
    ctx: Context<RemoveAmmLiquidity>,
    lp_tokens_to_burn: u64,
    min_amount_a_to_receive: u64,
    min_amount_b_to_receive: u64,
) -> Result<()> {
    update_oracle(&mut ctx.accounts.amm_pool)?;
    let amm_pool_state = &ctx.accounts.amm_pool;
    let lp_mint = &ctx.accounts.lp_mint;

    let (amount_a_to_withdraw, amount_b_to_withdraw) = math::calculate_assets_to_withdraw(
        amm_pool_state.reserves_a,
        amm_pool_state.reserves_b,
        lp_mint.supply,
        lp_tokens_to_burn,
    )?;

    require!(
        amount_a_to_withdraw >= min_amount_a_to_receive,
        DloomError::SlippageExceeded
    );
    require!(
        amount_b_to_withdraw >= min_amount_b_to_receive,
        DloomError::SlippageExceeded
    );

    let bump = &[ctx.accounts.amm_pool.bump][..];
    let signer_seeds = &[
        b"amm_pool",
        ctx.accounts.amm_pool.token_a_mint.as_ref(),
        ctx.accounts.amm_pool.token_b_mint.as_ref(),
        bump,
    ][..];

    if amount_a_to_withdraw > 0 {
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_a_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.token_a_vault.to_account_info(),
                    to: ctx.accounts.user_token_a_account.to_account_info(),
                    authority: ctx.accounts.amm_pool.to_account_info(),
                    mint: ctx.accounts.token_a_mint.to_account_info(),
                },
                &[signer_seeds],
            ),
            amount_a_to_withdraw,
            ctx.accounts.token_a_mint.decimals,
        )?;
    }

    if amount_b_to_withdraw > 0 {
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_b_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.token_b_vault.to_account_info(),
                    to: ctx.accounts.user_token_b_account.to_account_info(),
                    authority: ctx.accounts.amm_pool.to_account_info(),
                    mint: ctx.accounts.token_b_mint.to_account_info(),
                },
                &[signer_seeds],
            ),
            amount_b_to_withdraw,
            ctx.accounts.token_b_mint.decimals,
        )?;
    }

    token_interface::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.lp_mint.to_account_info(),
                from: ctx.accounts.user_lp_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        lp_tokens_to_burn,
    )?;

    // Update the AmmPosition state
    ctx.accounts.amm_position.lp_token_amount = ctx
        .accounts
        .amm_position
        .lp_token_amount
        .checked_sub(lp_tokens_to_burn)
        .ok_or(DloomError::MathOverflow)?;

    // Update pool reserves
    let amm_pool = &mut ctx.accounts.amm_pool;
    amm_pool.reserves_a = amm_pool
        .reserves_a
        .checked_sub(amount_a_to_withdraw)
        .ok_or(DloomError::MathOverflow)?;
    amm_pool.reserves_b = amm_pool
        .reserves_b
        .checked_sub(amount_b_to_withdraw)
        .ok_or(DloomError::MathOverflow)?;

    emit!(AmmLiquidityRemoved {
        pool_address: ctx.accounts.amm_pool.key(),
        user: ctx.accounts.owner.key(),
        lp_tokens_burned: lp_tokens_to_burn,
        amount_a_received: amount_a_to_withdraw,
        amount_b_received: amount_b_to_withdraw,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RemoveAmmLiquidity<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"amm_pool", amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    #[account(
        mut,
        seeds = [b"amm_position", owner.key().as_ref(), amm_pool.key().as_ref()],
        bump,
        has_one = owner,
    )]
    pub amm_position: Box<Account<'info, AmmPosition>>,

    #[account(mut, address = amm_pool.lp_mint)]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(address = amm_pool.token_a_mint)]
    pub token_a_mint: InterfaceAccount<'info, Mint>,
    #[account(address = amm_pool.token_b_mint)]
    pub token_b_mint: InterfaceAccount<'info, Mint>,

    #[account(mut, address = amm_pool.token_a_vault)]
    pub token_a_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = amm_pool.token_b_vault)]
    pub token_b_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, has_one = owner)]
    pub user_lp_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, has_one = owner)]
    pub user_token_a_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, has_one = owner)]
    pub user_token_b_account: InterfaceAccount<'info, TokenAccount>,

    pub token_a_program: Interface<'info, TokenInterface>,
    pub token_b_program: Interface<'info, TokenInterface>,
    pub token_program: Interface<'info, TokenInterface>,
}