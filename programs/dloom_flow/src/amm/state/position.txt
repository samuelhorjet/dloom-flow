// FILE: programs/dloom_flow/src/state/amm_position.rs

use anchor_lang::prelude::*;

/// The user's choice for how their LP fees should be handled.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum FeePreference {
    /// Fees must be claimed manually via the `claim_lp_fees` instruction.
    ManualClaim,
    /// Fees can be reinvested into the pool via the `reinvest_lp_fees` instruction.
    AutoCompound,
}

impl Default for FeePreference {
    fn default() -> Self {
        FeePreference::ManualClaim
    }
}

/// Represents a user's liquidity position in a specific AMM pool.
#[account]
#[derive(Default, Debug)]
pub struct AmmPosition {
    /// The AMM pool this position belongs to.
    pub pool: Pubkey,
    /// The owner of this position.
    pub owner: Pubkey,
    /// The number of LP tokens this position represents.
    pub lp_token_amount: u64,
    /// Snapshot of the pool's fee growth per LP token for token A.
    pub fee_growth_snapshot_a: u128,
    /// Snapshot of the pool's fee growth per LP token for token B.
    pub fee_growth_snapshot_b: u128,
    // --- NEW FIELD ---
    /// The user's chosen strategy for handling accrued fees.
    pub fee_preference: FeePreference,
}