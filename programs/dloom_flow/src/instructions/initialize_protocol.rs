// FILE: programs/dloom_flow/src/instructions/initialize_protocol.rs

use crate::state::ProtocolConfig;
use anchor_lang::prelude::*;

/// This instruction should be called only once to initialize the protocol's
/// configuration and set the initial master authority.
pub fn handle_initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.authority = ctx.accounts.authority.key();
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32, 
        seeds = [b"protocol_config"],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}