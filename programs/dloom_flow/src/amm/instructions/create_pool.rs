// FILE: programs/dloom_flow/src/instructions/amm_create_pool.rs

use crate::{amm::state::AmmPool, constants::*, errors::DloomError, events::AmmPoolCreated};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

/// The handler for the `create_amm_pool` instruction.
pub fn handle_create_amm_pool(
    ctx: Context<CreateAmmPool>,
    fee_rate: u16,
    protocol_fee_share: u16,
    referrer_fee_share: u16,
) -> Result<()> {
    require!(
        fee_rate as u128 <= BASIS_POINT_MAX,
        DloomError::InvalidFeeRates
    );
    require!(
        protocol_fee_share as u128 <= BASIS_POINT_MAX,
        DloomError::InvalidFeeRates
    );
    require!(
        referrer_fee_share as u128 <= BASIS_POINT_MAX,
        DloomError::InvalidFeeRates
    );

    let total_fee_share = (protocol_fee_share as u128)
        .checked_add(referrer_fee_share as u128)
        .ok_or(DloomError::MathOverflow)?;
    require!(
        total_fee_share <= BASIS_POINT_MAX,
        DloomError::FeeShareExceedsTotal
    );

    let amm_pool = &mut ctx.accounts.amm_pool;
    amm_pool.bump = ctx.bumps.amm_pool;
    amm_pool.authority = ctx.accounts.authority.key();
    amm_pool.token_a_mint = ctx.accounts.token_a_mint.key();
    amm_pool.token_b_mint = ctx.accounts.token_b_mint.key();
    amm_pool.token_a_vault = ctx.accounts.token_a_vault.key();
    amm_pool.token_b_vault = ctx.accounts.token_b_vault.key();
    amm_pool.lp_mint = ctx.accounts.lp_mint.key();
    amm_pool.fee_rate = fee_rate;
    amm_pool.protocol_fee_share = protocol_fee_share;
    amm_pool.referrer_fee_share = referrer_fee_share;
    amm_pool.protocol_fee_vault_a = ctx.accounts.protocol_fee_vault_a.key();
    amm_pool.protocol_fee_vault_b = ctx.accounts.protocol_fee_vault_b.key();
    amm_pool.reserves_a = 0;
    amm_pool.reserves_b = 0;
    amm_pool.price_a_cumulative_last_fee_update = 0;

    emit!(AmmPoolCreated {
        pool_address: ctx.accounts.amm_pool.key(),
        token_a_mint: ctx.accounts.token_a_mint.key(),
        token_b_mint: ctx.accounts.token_b_mint.key(),
        lp_mint: ctx.accounts.lp_mint.key(),
        fee_rate,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CreateAmmPool<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: The authority for the protocol, passed in to be stored.
    pub authority: AccountInfo<'info>,

    #[account(constraint = token_a_mint.key() < token_b_mint.key() @ DloomError::InvalidMintOrder)]
    pub token_a_mint: InterfaceAccount<'info, Mint>,
    pub token_b_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = payer,
        space = 8 + 390,
        seeds = [b"amm_pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    #[account(
        init,
        payer = payer,
        seeds = [b"lp_mint", amm_pool.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = amm_pool,
        mint::token_program = token_program
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = payer,
        seeds = [b"vault", amm_pool.key().as_ref(), token_a_mint.key().as_ref()],
        bump,
        token::mint = token_a_mint,
        token::authority = amm_pool,
        token::token_program = token_a_program
    )]
    pub token_a_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [b"vault", amm_pool.key().as_ref(), token_b_mint.key().as_ref()],
        bump,
        token::mint = token_b_mint,
        token::authority = amm_pool,
        token::token_program = token_b_program
    )]
    pub token_b_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [b"protocol_fee_vault", amm_pool.key().as_ref(), token_a_mint.key().as_ref()],
        bump,
        token::mint = token_a_mint,
        token::authority = authority,
        token::token_program = token_a_program
    )]
    pub protocol_fee_vault_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [b"protocol_fee_vault", amm_pool.key().as_ref(), token_b_mint.key().as_ref()],
        bump,
        token::mint = token_b_mint,
        token::authority = authority,
        token::token_program = token_b_program
    )]
    pub protocol_fee_vault_b: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_a_program: Interface<'info, TokenInterface>,
    pub token_b_program: Interface<'info, TokenInterface>,
    pub token_program: Interface<'info, TokenInterface>,

    pub rent: Sysvar<'info, Rent>,
}
