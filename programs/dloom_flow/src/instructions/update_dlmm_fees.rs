// FILE: programs/dloom_flow/src/instructions/update_dlmm_fees.rs

use crate::{errors::DloomError, state::{ProtocolConfig}, dlmm::{state::{DlmmPool}}, events::DlmmFeesUpdated};
use anchor_lang::prelude::*;

pub fn handle_update_dlmm_fees(ctx: Context<UpdateDlmmFees>, new_fee_rate: Option<u16>) -> Result<()> {
    let dlmm_pool = &mut ctx.accounts.dlmm_pool;
    let now = Clock::get()?.unix_timestamp;

    if let Some(manual_fee_rate) = new_fee_rate {
        // MANUAL UPDATE:
        // The authority is providing a specific new fee rate. This is a permissioned override.
        // We still check that the authority matches the one in the protocol_config.
        dlmm_pool.fee_rate = manual_fee_rate;

    } else {
        // AUTOMATED UPDATE:
        // This is a simplified formula for demonstration. A real-world formula would be
        // the result of extensive economic research and modeling.
        let time_elapsed = now.checked_sub(dlmm_pool.last_fee_update_timestamp).ok_or(DloomError::MathOverflow)?;
        
        // Require at least an hour to pass before another auto-update to prevent spam.
        require!(time_elapsed > 3600, DloomError::UpdateNotNeeded);

        // Simple metric: volatility = (bins_crossed * 100) / time_in_seconds
        // We use u128 for precision during the calculation.
        let volatility = (dlmm_pool.volatility_accumulator as u128)
            .checked_mul(100) // Scale factor for better precision
            .ok_or(DloomError::MathOverflow)?
            .checked_div(time_elapsed as u128)
            .ok_or(DloomError::MathOverflow)?;

        // Example Formula: Base fee of 0.1% + volatility component
        // Capped at a total of 1% fee (100 basis points).
        let base_fee = 10; // 0.1% in basis points
        let dynamic_fee = (volatility as u16).min(90); // Cap dynamic part at 0.9%
        
        dlmm_pool.fee_rate = base_fee + dynamic_fee;
    }

    // Reset the accumulator and update timestamp after any kind of update
    dlmm_pool.volatility_accumulator = 0;
    dlmm_pool.last_fee_update_timestamp = now;

    emit!(DlmmFeesUpdated {
    pool_address: dlmm_pool.key(),
    new_fee_rate: dlmm_pool.fee_rate,
});
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateDlmmFees<'info> {
    /// The authority must sign for any fee update.
    pub authority: Signer<'info>,

    /// The protocol config, to verify the signer is the true master authority.
    #[account(
        seeds = [b"protocol_config"],
        bump,
        has_one = authority,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        // The pool must be an "Official" pool created by the master authority
        // to be eligible for this type of update.
        constraint = dlmm_pool.authority == authority.key() @ DloomError::Unauthorized,
        constraint = dlmm_pool.pool_type == crate::dlmm::state::PoolType::Official @ DloomError::Unauthorized,
    )]
    pub dlmm_pool: Box<Account<'info, DlmmPool>>,
}