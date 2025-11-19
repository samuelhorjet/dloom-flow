// FILE: programs/dloom_flow/src/instructions/initialize_dlmm_parameters.rs

use crate::state::{DlmmParameter, DlmmParameters};
use anchor_lang::prelude::*;

pub fn handle_initialize_dlmm_parameters(
    ctx: Context<InitializeDlmmParameters>,
    official_params: Vec<DlmmParameter>,
    community_params: Vec<DlmmParameter>,
) -> Result<()> {
    let params_account = &mut ctx.accounts.dlmm_parameters;
    params_account.authority = ctx.accounts.authority.key();

    params_account.official_parameters = official_params;
    params_account.community_parameters = community_params;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeDlmmParameters<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 4 + (20 * (2 + 2)) + 4 + (20 * (2 + 2)), // Max 20 params per list
        seeds = [b"dlmm_parameters"],
        bump
    )]
    pub dlmm_parameters: Account<'info, DlmmParameters>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}