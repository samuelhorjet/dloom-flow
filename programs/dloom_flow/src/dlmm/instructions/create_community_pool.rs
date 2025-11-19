// FILE: programs/dloom_flow/src/dlmm/instructions/dlmm_create_community_pool.rs

use crate::{constants::*, errors::DloomError, dlmm::{state::{DlmmPool, PoolType}}, state::DlmmParameters, events::DlmmPoolCreated};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

pub fn handle_create_dlmm_community_pool(
    ctx: Context<CreateDlmmCommunityPool>,
    bin_step: u16,
    fee_rate: u16,
    protocol_fee_share: u16,
    referrer_fee_share: u16,
    initial_bin_id: i32,
) -> Result<()> {
    let is_allowed = ctx.accounts.dlmm_parameters.community_parameters.iter()
        .any(|p| p.bin_step == bin_step && p.fee_rate == fee_rate);
    require!(is_allowed, DloomError::InvalidParameters);
    require!(protocol_fee_share as u128 <= BASIS_POINT_MAX, DloomError::InvalidFeeRates);
    require!(referrer_fee_share as u128 <= BASIS_POINT_MAX, DloomError::InvalidFeeRates);

    let dlmm_pool = &mut ctx.accounts.dlmm_pool;
    let clock = Clock::get()?;

    // Set all fields for the new community pool
    dlmm_pool.bump = ctx.bumps.dlmm_pool;
    dlmm_pool.authority = ctx.accounts.payer.key(); 
    dlmm_pool.pool_type = PoolType::Community;
    dlmm_pool.token_a_mint = ctx.accounts.token_a_mint.key();
    dlmm_pool.token_b_mint = ctx.accounts.token_b_mint.key();
    dlmm_pool.token_a_vault = ctx.accounts.token_a_vault.key();
    dlmm_pool.token_b_vault = ctx.accounts.token_b_vault.key();
    dlmm_pool.protocol_fee_vault_a = ctx.accounts.protocol_fee_vault_a.key();
    dlmm_pool.protocol_fee_vault_b = ctx.accounts.protocol_fee_vault_b.key();
    dlmm_pool.active_bin_id = initial_bin_id;
    dlmm_pool.bin_step = bin_step;
    dlmm_pool.fee_rate = fee_rate;
    dlmm_pool.protocol_fee_share = protocol_fee_share;
    dlmm_pool.referrer_fee_share = referrer_fee_share;
    dlmm_pool.reserves_a = 0;
    dlmm_pool.reserves_b = 0;
    dlmm_pool.volatility_accumulator = 0;
    dlmm_pool.last_fee_update_timestamp = clock.unix_timestamp;

    emit!(DlmmPoolCreated {
        pool_address: dlmm_pool.key(),
        token_a_mint: dlmm_pool.token_a_mint,
        token_b_mint: dlmm_pool.token_b_mint,
        bin_step,
        fee_rate,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(bin_step: u16)]
pub struct CreateDlmmCommunityPool<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: This is the authority that will own the protocol fee vaults.
    pub authority: AccountInfo<'info>,

    #[account(
        seeds = [b"dlmm_parameters"],
        bump
    )]
    pub dlmm_parameters: Account<'info, DlmmParameters>,

    #[account(constraint = token_a_mint.key() < token_b_mint.key() @ DloomError::InvalidMintOrder)]
    pub token_a_mint: InterfaceAccount<'info, Mint>,
    pub token_b_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = payer,
        space = 8 + 256,
        seeds = [
            b"dlmm_pool",
            token_a_mint.key().as_ref(),
            token_b_mint.key().as_ref(),
            &bin_step.to_le_bytes()
        ],
        bump
    )]
    pub dlmm_pool: Box<Account<'info, DlmmPool>>,

    #[account(
        init,
        payer = payer,
        seeds = [b"vault", dlmm_pool.key().as_ref(), token_a_mint.key().as_ref()],
        bump,
        token::mint = token_a_mint,
        token::authority = dlmm_pool,
        token::token_program = token_a_program
    )]
    pub token_a_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        seeds = [b"vault", dlmm_pool.key().as_ref(), token_b_mint.key().as_ref()],
        bump,
        token::mint = token_b_mint,
        token::authority = dlmm_pool,
        token::token_program = token_b_program
    )]
    pub token_b_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        seeds = [b"protocol_fee_vault", dlmm_pool.key().as_ref(), token_a_mint.key().as_ref()],
        bump,
        token::mint = token_a_mint,
        token::authority = authority,
        token::token_program = token_a_program
    )]
    pub protocol_fee_vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = payer,
        seeds = [b"protocol_fee_vault", dlmm_pool.key().as_ref(), token_b_mint.key().as_ref()],
        bump,
        token::mint = token_b_mint,
        token::authority = authority, 
        token::token_program = token_b_program
    )]
    pub protocol_fee_vault_b: InterfaceAccount<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_a_program: Interface<'info, TokenInterface>,
    pub token_b_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}