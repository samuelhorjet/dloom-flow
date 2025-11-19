// FILE: programs/dloom_flow/src/instructions/reinvest_lp_fees.rs

use crate::{
    constants::PRECISION,
    errors::DloomError,
    amm::{
        math,                              
        state::{AmmPool, AmmPosition, FeePreference}, 
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface};

pub fn handle_reinvest_lp_fees(ctx: Context<ReinvestLpFees>) -> Result<()> {
    // 1. Ensure the user has selected the auto-compounding preference.
    require!(
        ctx.accounts.amm_position.fee_preference == FeePreference::AutoCompound,
        DloomError::InvalidFeePreference
    );

    let amm_pool = &ctx.accounts.amm_pool;
    let position = &mut ctx.accounts.amm_position;

    // 2. Calculate pending fees (same logic as claim_lp_fees).
    let fee_growth_a = amm_pool
        .fee_growth_per_lp_token_a
        .checked_sub(position.fee_growth_snapshot_a)
        .unwrap_or(0);
    let fee_growth_b = amm_pool
        .fee_growth_per_lp_token_b
        .checked_sub(position.fee_growth_snapshot_b)
        .unwrap_or(0);

    let fees_to_reinvest_a = (fee_growth_a
        .checked_mul(position.lp_token_amount as u128)
        .unwrap_or(0)
        .checked_div(PRECISION)
        .unwrap_or(0)) as u64;
    let fees_to_reinvest_b = (fee_growth_b
        .checked_mul(position.lp_token_amount as u128)
        .unwrap_or(0)
        .checked_div(PRECISION)
        .unwrap_or(0)) as u64;

    // 3. Update snapshots immediately.
    position.fee_growth_snapshot_a = amm_pool.fee_growth_per_lp_token_a;
    position.fee_growth_snapshot_b = amm_pool.fee_growth_per_lp_token_b;

    // 4. Treat the fees as a new liquidity deposit to calculate LP tokens to mint.
    // This function correctly handles cases where one of the amounts is zero.
    let (_amount_a_to_deposit, _amount_b_to_deposit, lp_tokens_to_mint) =
        math::calculate_lp_tokens_to_mint(
            &ctx.accounts.amm_pool,
            &ctx.accounts.lp_mint,
            fees_to_reinvest_a,
            fees_to_reinvest_b,
        )?;

    if lp_tokens_to_mint == 0 {
        return Ok(()); // Nothing to do if no fees accrued or are too small
    }

    // 5. Mint new LP tokens to the user.
    let bump = &[ctx.accounts.amm_pool.bump][..];
    let signer_seeds = &[
        b"amm_pool",
        ctx.accounts.amm_pool.token_a_mint.as_ref(),
        ctx.accounts.amm_pool.token_b_mint.as_ref(),
        bump,
    ][..];
    token_interface::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.user_lp_token_account.to_account_info(),
                authority: ctx.accounts.amm_pool.to_account_info(),
            },
            &[signer_seeds],
        ),
        lp_tokens_to_mint,
    )?;

    position.lp_token_amount = position.lp_token_amount.checked_add(lp_tokens_to_mint).ok_or(DloomError::MathOverflow)?;


    Ok(())
}

#[derive(Accounts)]
pub struct ReinvestLpFees<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, seeds = [b"amm_pool", amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()], bump = amm_pool.bump)]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    #[account(mut, has_one = owner, seeds = [b"amm_position", owner.key().as_ref(), amm_pool.key().as_ref()], bump)]
    pub amm_position: Box<Account<'info, AmmPosition>>,

    #[account(mut, address = amm_pool.lp_mint)]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(mut, token::mint = lp_mint, token::authority = owner)]
    pub user_lp_token_account: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
}