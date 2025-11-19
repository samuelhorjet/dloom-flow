// FILE: programs/dloom_flow/src/state/protocol_config.rs

use anchor_lang::prelude::*;

/// A singleton account that holds the protocol-wide configuration,
/// including the master authority key.
#[account]
#[derive(Default, Debug)]
pub struct ProtocolConfig {
    /// The master authority that can perform admin actions, like creating
    /// official pools or updating protocol-level parameters.
    pub authority: Pubkey,
}