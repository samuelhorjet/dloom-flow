// FILE: programs/dloom_flow/src/instructions/update_fee_preference.rs

use crate::amm::{state::{AmmPool, AmmPosition, FeePreference}};
use anchor_lang::prelude::*;

pub fn handle_update_fee_preference(
    ctx: Context<UpdateFeePreference>,
    new_preference: FeePreference,
) -> Result<()> {
    ctx.accounts.amm_position.fee_preference = new_preference;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateFeePreference<'info> {
    pub owner: Signer<'info>,

    // This is needed just to validate the position PDA seeds
    pub amm_pool: Box<Account<'info, AmmPool>>,

    #[account(
        mut,
        has_one = owner,
        seeds = [b"amm_position", owner.key().as_ref(), amm_pool.key().as_ref()],
        bump
    )]
    pub amm_position: Box<Account<'info, AmmPosition>>,
}