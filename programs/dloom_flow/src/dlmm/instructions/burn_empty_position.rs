// FILE: programs/dloom_flow/src/instructions/dlmm_burn_empty_position.rs

use crate::{errors::DloomError, dlmm::{state::Position}, events::DlmmPositionBurned};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Burn, CloseAccount, Mint, TokenAccount, TokenInterface};

pub fn handle_dlmm_burn_empty_position(ctx: Context<DlmmBurnEmptyPosition>) -> Result<()> {
    // 1. Burn the Position NFT from the user's token account.
    token_interface::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.position_mint.to_account_info(),
                from: ctx.accounts.user_position_nft_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        1,
    )?;

    // 2. Close the user's token account for the NFT, sending the lamports to the owner.
    token_interface::close_account(CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.user_position_nft_account.to_account_info(),
            destination: ctx.accounts.owner.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    ))?;

    // 3. The `position` account is automatically closed by Anchor's `close = owner`
    // constraint, and its lamports are also sent to the owner.

    emit!(DlmmPositionBurned {
    position_address: ctx.accounts.position.key(),
    owner: ctx.accounts.owner.key(),
});
    Ok(())
}

#[derive(Accounts)]
pub struct DlmmBurnEmptyPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ DloomError::Unauthorized,
        constraint = position.liquidity == 0 @ DloomError::PositionNotEmpty,
        // This is the most important part: automatically closes the account
        // and transfers its rent lamports to the `owner`.
        close = owner
    )]
    pub position: Box<Account<'info, Position>>,

    #[account(
        mut,
        address = position.position_mint
    )]
    pub position_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = position_mint,
        has_one = owner,
    )]
    pub user_position_nft_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}
