// FILE: programs/dloom_flow/src/state/dlmm_pool.rs

use anchor_lang::prelude::*;

/// Distinguishes between official and community-created pools.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PoolType {
    Official,
    Community,
}

impl Default for PoolType {
    fn default() -> Self {
        PoolType::Official
    }
}

/// State for a Discretized Liquidity Market Maker (DLMM) pool.
#[account]
#[derive(Default, Debug)]
pub struct DlmmPool {
    /// The PDA bump.
    pub bump: u8,
    /// The protocol authority that created this pool. For community pools, this is the creator.
    pub authority: Pubkey,
    /// Distinguishes the type of the pool (Official or Community).
    pub pool_type: PoolType,

    // --- Mint and Vault Keys ---
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub token_a_vault: Pubkey,
    pub token_b_vault: Pubkey,

    // --- Core DLMM Parameters ---
    pub active_bin_id: i32,
    pub bin_step: u16,

    // --- Fee Parameters ---
    pub fee_rate: u16,
    pub protocol_fee_share: u16,
    pub referrer_fee_share: u16,
    pub protocol_fee_vault_a: Pubkey,
    pub protocol_fee_vault_b: Pubkey,

    // --- Dynamic Fee Fields ---
    /// Accumulator for market volatility, based on bins crossed during swaps.
    pub volatility_accumulator: u64,
    /// The timestamp of the last dynamic fee update.
    pub last_fee_update_timestamp: i64,

    // --- State Tracking ---
    pub reserves_a: u64,
    pub reserves_b: u64,
}