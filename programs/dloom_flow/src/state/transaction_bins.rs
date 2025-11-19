// FILE: programs/dloom_flow/src/state/transaction_bins.rs

use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug)]
pub struct TransactionBins {
    pub owner: Pubkey,
    pub bins: Vec<Pubkey>,
}