// FILE: programs/dloom_flow/src/instructions/setup_bins.rs

use crate::state::TransactionBins;
use anchor_lang::prelude::*;

pub fn handle_setup_bins(ctx: Context<SetupBins>, bin_pubkeys: Vec<Pubkey>) -> Result<()> {
    let transaction_bins = &mut ctx.accounts.transaction_bins;
    transaction_bins.owner = ctx.accounts.owner.key();
    transaction_bins.bins = bin_pubkeys;
    Ok(())
}

#[derive(Accounts)]
pub struct SetupBins<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        // The space calculation allows for a generous number of bins per transaction.
        // 8 (discriminator) + 32 (owner) + 4 (vec prefix) + (70 * 32) (70 bins) = 2284
        space = 8 + 32 + 4 + (70 * 32),
        seeds = [b"transaction_bins", owner.key().as_ref()],
        bump
    )]
    pub transaction_bins: Account<'info, TransactionBins>,

    pub system_program: Program<'info, System>,
}