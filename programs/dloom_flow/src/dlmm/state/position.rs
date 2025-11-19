// FILE: programs/dloom_flow/src/state/position.rs

use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug)]
pub struct Position {
    pub pool: Pubkey,
    pub owner: Pubkey,
    pub lower_bin_id: i32,
    pub upper_bin_id: i32,
    pub liquidity: u128,
    pub position_mint: Pubkey,
    pub fee_growth_snapshot_a: u128,
    pub fee_growth_snapshot_b: u128,
}
