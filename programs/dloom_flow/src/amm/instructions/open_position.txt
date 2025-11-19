// FILE: programs/dloom_flow/src/instructions/open_amm_position.rs
use crate::{
    amm::{
        state::{AmmPool, AmmPosition, FeePreference}, 
    },
};
use anchor_lang::prelude::*;

pub fn handle_open_amm_position(
    ctx: Context<OpenAmmPosition>,
    fee_preference: FeePreference,
) -> Result<()> {
    let position = &mut ctx.accounts.amm_position;
    position.pool = ctx.accounts.amm_pool.key();
    position.owner = ctx.accounts.owner.key();
    position.lp_token_amount = 0;
    position.fee_growth_snapshot_a = 0;
    position.fee_growth_snapshot_b = 0;
    position.fee_preference = fee_preference;

    Ok(())
}

#[derive(Accounts)]
pub struct OpenAmmPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"amm_pool", amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8 + 16 + 16 + 1 + 16, // Extra space for new field and padding
        seeds = [b"amm_position", owner.key().as_ref(), amm_pool.key().as_ref()],
        bump
    )]
    pub amm_position: Box<Account<'info, AmmPosition>>,

    pub system_program: Program<'info, System>,
}