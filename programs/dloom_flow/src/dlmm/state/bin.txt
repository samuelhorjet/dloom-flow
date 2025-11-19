// FILE: programs/dloom_flow/src/state/bin.rs

use anchor_lang::prelude::*;

#[account(zero_copy)]
#[repr(C)]
#[derive(Debug)]
pub struct Bin {
    pub liquidity: u128,
    pub fee_growth_per_unit_a: u128,
    pub fee_growth_per_unit_b: u128,
}
