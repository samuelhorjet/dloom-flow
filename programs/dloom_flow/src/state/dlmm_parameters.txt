// FILE: programs/dloom_flow/src/state/dlmm_parameters.rs

use anchor_lang::prelude::*;

/// A struct to hold a single valid (bin_step, fee_rate) pair.
/// Using a struct makes the code cleaner and more extensible.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct DlmmParameter {
    pub bin_step: u16,
    pub fee_rate: u16,
}

/// A singleton account that holds the whitelisted parameters for creating DLMM pools.
#[account]
#[derive(Debug)]
pub struct DlmmParameters {
    /// The authority that can update these parameters.
    pub authority: Pubkey,
    /// Whitelisted parameters for "Official" pools created by the protocol authority.
    pub official_parameters: Vec<DlmmParameter>,
    /// Whitelisted parameters for "Community" pools created by anyone.
    pub community_parameters: Vec<DlmmParameter>,
}