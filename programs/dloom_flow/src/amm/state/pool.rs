// FILE: programs/dloom_flow/src/state/amm_pool.rs

use anchor_lang::prelude::*;

/// State for a permissionless, constant-product AMM pool.
///
/// Follows the x * y = k model.
#[account]
#[derive(Default, Debug)]
pub struct AmmPool {
    /// The PDA bump.
    pub bump: u8,

    /// The authority that can update protocol fees or other admin-only parameters.
    /// Can be a multi-sig or DAO.
    pub authority: Pubkey,

    // --- Mint and Vault Keys ---
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub token_a_vault: Pubkey,
    pub token_b_vault: Pubkey,
    pub lp_mint: Pubkey,

    // --- Fee Parameters ---
    pub fee_rate: u16,
    pub protocol_fee_share: u16,
    pub referrer_fee_share: u16,
    pub protocol_fee_vault_a: Pubkey,
    pub protocol_fee_vault_b: Pubkey,

    // --- Liquidity State ---
    pub reserves_a: u64,
    pub reserves_b: u64,

    // --- Fee Growth Accumulators (NEW) ---
    /// Total fees of token A accrued per LP token.
    pub fee_growth_per_lp_token_a: u128,
    /// Total fees of token B accrued per LP token.
    pub fee_growth_per_lp_token_b: u128,
    
    // --- Oracle Fields ---
    /// The cumulative price of token A in terms of token B.
    pub price_a_cumulative: u128,
    /// The cumulative price of token B in terms of token A.
    pub price_b_cumulative: u128,
    /// The timestamp of the last update to the reserves and oracle.
    pub last_update_timestamp: i64,
    pub last_fee_update_timestamp: i64,
    /// Snapshot of the cumulative price at the last fee update, used for volatility calculation.
    pub price_a_cumulative_last_fee_update: u128,
}