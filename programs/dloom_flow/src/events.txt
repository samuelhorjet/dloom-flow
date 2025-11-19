// FILE: programs/dloom_flow/src/events.rs

use anchor_lang::prelude::*;
use crate::{ParameterAction, ParameterList};

// --- AMM Events ---

#[event]
pub struct AmmPoolCreated {
    pub pool_address: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub lp_mint: Pubkey,
    pub fee_rate: u16,
}

#[event]
pub struct AmmFeesUpdated {
    pub pool_address: Pubkey,
    pub new_fee_rate: u16,
}

#[event]
pub struct AmmLiquidityAdded {
    pub pool_address: Pubkey,
    pub user: Pubkey,
    pub lp_tokens_minted: u64,
    pub amount_a_deposited: u64,
    pub amount_b_deposited: u64,
}

#[event]
pub struct AmmLiquidityRemoved {
    pub pool_address: Pubkey,
    pub user: Pubkey,
    pub lp_tokens_burned: u64,
    pub amount_a_received: u64,
    pub amount_b_received: u64,
}

#[event]
pub struct AmmSwap {
    pub pool_address: Pubkey,
    pub trader: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub protocol_fee: u64,
    pub lp_fee: u64,
    pub referrer: Option<Pubkey>,
}

#[event]
pub struct AmmFeesClaimed {
    pub pool_address: Pubkey,
    pub user: Pubkey,
    pub fees_claimed_a: u64,
    pub fees_claimed_b: u64,
}


// --- DLMM Events ---

#[event]
pub struct DlmmPoolCreated {
    pub pool_address: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub bin_step: u16,
    pub fee_rate: u16,
}

#[event]
pub struct DlmmFeesUpdated {
    pub pool_address: Pubkey,
    pub new_fee_rate: u16,
}

#[event]
pub struct DlmmPositionOpened {
    pub pool_address: Pubkey,
    pub owner: Pubkey,
    pub position_address: Pubkey,
    pub position_mint: Pubkey,
    pub lower_bin_id: i32,
    pub upper_bin_id: i32,
}

#[event]
pub struct DlmmLiquidityUpdate {
    pub position_address: Pubkey,
    pub liquidity_added: i128, // Can be positive (add) or zero (for modify/remove)
    pub amount_a: u64,
    pub amount_b: u64,
}

#[event]
pub struct DlmmSwapResult {
    pub pool_address: Pubkey,
    pub trader: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub protocol_fee: u64,
    // Note: LP fee in DLMM is implicitly part of the price improvement. We log the protocol fee.
    pub final_active_bin_id: i32,
    pub referrer: Option<Pubkey>,
}

#[event]
pub struct DlmmPositionBurned {
    pub position_address: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct DlmmParametersUpdated {
    pub list: ParameterList,
    pub action: ParameterAction,
    pub bin_step: u16,
    pub fee_rate: u16,
}

#[event]
pub struct DlmmLiquidityModified {
    pub owner: Pubkey,
    pub pool_address: Pubkey,
    pub old_position_address: Pubkey,
    pub new_position_address: Pubkey,
    pub liquidity_to_move: u128,
    pub surplus_a_out: u64,
    pub surplus_b_out: u64,
}