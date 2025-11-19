// FILE: programs/dloom_flow/src/instructions/amm_swap.rs

use crate::{
    amm::{
        math,           
        state::AmmPool, 
    },
    constants::*,
    errors::DloomError,
    events::AmmSwap,
};
use anchor_lang::prelude::*;
use anchor_lang::AccountDeserialize;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

/// Updates the oracle's cumulative price values.
/// This is made public within the crate (`pub(crate)`) so that `add_liquidity` and
/// `remove_liquidity` can also call it, ensuring the oracle is always up-to-date.
pub(crate) fn update_oracle(pool: &mut Account<AmmPool>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // On the very first action, just set the initial timestamp.
    if pool.last_update_timestamp == 0 {
        pool.last_update_timestamp = now;
        return Ok(());
    }

    let time_elapsed = now
        .checked_sub(pool.last_update_timestamp)
        .ok_or(DloomError::MathOverflow)?;

    // Only update if time has passed and there are reserves to calculate a price.
    if time_elapsed > 0 && pool.reserves_a > 0 && pool.reserves_b > 0 {
        // price = reserves_b / reserves_a. We use u128 and scale for fixed-point math.
        let price_a = (pool.reserves_b as u128)
            .checked_mul(1_000_000_000) // Scale for precision
            .ok_or(DloomError::MathOverflow)?
            .checked_div(pool.reserves_a as u128)
            .ok_or(DloomError::MathOverflow)?;

        pool.price_a_cumulative = pool
            .price_a_cumulative
            .checked_add(
                price_a
                    .checked_mul(time_elapsed as u128)
                    .ok_or(DloomError::MathOverflow)?,
            )
            .ok_or(DloomError::MathOverflow)?;

        // Do the same for the inverse price
        let price_b = (pool.reserves_a as u128)
            .checked_mul(1_000_000_000) // Scale for precision
            .ok_or(DloomError::MathOverflow)?
            .checked_div(pool.reserves_b as u128)
            .ok_or(DloomError::MathOverflow)?;

        pool.price_b_cumulative = pool
            .price_b_cumulative
            .checked_add(
                price_b
                    .checked_mul(time_elapsed as u128)
                    .ok_or(DloomError::MathOverflow)?,
            )
            .ok_or(DloomError::MathOverflow)?;
    }

    pool.last_update_timestamp = now;
    Ok(())
}

pub fn handle_swap_on_amm(
    ctx: Context<SwapOnAmm>,
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    if let Some(referrer_account_info) = &ctx.accounts.referrer_fee_account {
        // Manually deserialize the account data.
        let data = referrer_account_info.try_borrow_data()?;
        let referrer_token_account = TokenAccount::try_deserialize(&mut &data[..])?;

        // Now, perform the constraint check on the deserialized account
        require!(
            referrer_token_account.mint == ctx.accounts.user_source_token_account.mint,
            DloomError::InvalidMint
        );
    }

    // 1. Update the oracle with the pre-trade reserves.
    update_oracle(&mut ctx.accounts.amm_pool)?;

    let amm_pool = &ctx.accounts.amm_pool;
    let is_a_to_b = ctx.accounts.user_source_token_account.mint == amm_pool.token_a_mint;

    let (source_reserves, destination_reserves, source_mint_decimals, destination_mint_decimals) =
        if is_a_to_b {
            (
                amm_pool.reserves_a,
                amm_pool.reserves_b,
                ctx.accounts.token_a_mint.decimals,
                ctx.accounts.token_b_mint.decimals,
            )
        } else {
            require_keys_eq!(
                ctx.accounts.user_source_token_account.mint,
                amm_pool.token_b_mint,
                DloomError::InvalidMint
            );
            (
                amm_pool.reserves_b,
                amm_pool.reserves_a,
                ctx.accounts.token_b_mint.decimals,
                ctx.accounts.token_a_mint.decimals,
            )
        };
    
    let (source_token_program, destination_token_program) = if is_a_to_b {
        (ctx.accounts.token_a_program.to_account_info(), ctx.accounts.token_b_program.to_account_info())
    } else {
        (ctx.accounts.token_b_program.to_account_info(), ctx.accounts.token_a_program.to_account_info())
    };

    // 2. Calculate swap results based on the current state.
    let (amount_out, protocol_fee, lp_fee) = math::calculate_swap_out_amount(
        amm_pool,
        amount_in,
        source_reserves,
        destination_reserves,
    )?;
    require!(amount_out >= min_amount_out, DloomError::SlippageExceeded);

    // 3. Transfer from user to the appropriate source vault.
    let (source_vault_info, source_mint_info) = if is_a_to_b {
        (
            ctx.accounts.token_a_vault.to_account_info(),
            ctx.accounts.token_a_mint.to_account_info(),
        )
    } else {
        (
            ctx.accounts.token_b_vault.to_account_info(),
            ctx.accounts.token_b_mint.to_account_info(),
        )
    };
    token_interface::transfer_checked(
        CpiContext::new(
            source_token_program.clone(),
            TransferChecked {
                from: ctx.accounts.user_source_token_account.to_account_info(),
                to: source_vault_info,
                authority: ctx.accounts.trader.to_account_info(),
                mint: source_mint_info,
            },
        ),
        amount_in,
        source_mint_decimals,
    )?;

    // 4. Prepare signer seeds for all subsequent PDA-controlled transfers.
    let bump = &[amm_pool.bump][..];
    let signer_seeds = &[
        b"amm_pool",
        amm_pool.token_a_mint.as_ref(),
        amm_pool.token_b_mint.as_ref(),
        bump,
    ][..];

    // 5. Handle fee distribution (Referral and Protocol).
    let mut actual_protocol_fee = protocol_fee;

    if protocol_fee > 0 && amm_pool.referrer_fee_share > 0 {
        if let Some(referrer_account) = &ctx.accounts.referrer_fee_account {
            let referral_fee = (protocol_fee as u128)
                .checked_mul(amm_pool.referrer_fee_share as u128)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(BASIS_POINT_MAX as u128)
                .ok_or(DloomError::MathOverflow)? as u64;

            if referral_fee > 0 {
                actual_protocol_fee = protocol_fee
                    .checked_sub(referral_fee)
                    .ok_or(DloomError::MathOverflow)?;

                let (fee_source_vault, fee_mint) = if is_a_to_b {
                    (
                        ctx.accounts.token_a_vault.to_account_info(),
                        ctx.accounts.token_a_mint.to_account_info(),
                    )
                } else {
                    (
                        ctx.accounts.token_b_vault.to_account_info(),
                        ctx.accounts.token_b_mint.to_account_info(),
                    )
                };

                token_interface::transfer_checked(
                    CpiContext::new_with_signer(
                        source_token_program.clone(),
                        TransferChecked {
                            from: fee_source_vault,
                            to: referrer_account.to_account_info(),
                            authority: amm_pool.to_account_info(),
                            mint: fee_mint,
                        },
                        &[signer_seeds],
                    ),
                    referral_fee,
                    source_mint_decimals,
                )?;
            }
        }
    }

    if actual_protocol_fee > 0 {
        let (source_vault, fee_vault, mint) = if is_a_to_b {
            (
                ctx.accounts.token_a_vault.to_account_info(),
                ctx.accounts.protocol_fee_vault_a.to_account_info(),
                ctx.accounts.token_a_mint.to_account_info(),
            )
        } else {
            (
                ctx.accounts.token_b_vault.to_account_info(),
                ctx.accounts.protocol_fee_vault_b.to_account_info(),
                ctx.accounts.token_b_mint.to_account_info(),
            )
        };
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                source_token_program.clone(),
                TransferChecked {
                    from: source_vault,
                    to: fee_vault,
                    authority: amm_pool.to_account_info(),
                    mint,
                },
                &[signer_seeds],
            ),
            actual_protocol_fee,
            source_mint_decimals,
        )?;
    }

    // 6. Transfer swapped amount to user.
    if amount_out > 0 {
        let (dest_vault, dest_mint) = if is_a_to_b {
            (
                ctx.accounts.token_b_vault.to_account_info(),
                ctx.accounts.token_b_mint.to_account_info(),
            )
        } else {
            (
                ctx.accounts.token_a_vault.to_account_info(),
                ctx.accounts.token_a_mint.to_account_info(),
            )
        };
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                destination_token_program.clone(),
                TransferChecked {
                    from: dest_vault,
                    to: ctx
                        .accounts
                        .user_destination_token_account
                        .to_account_info(),
                    authority: amm_pool.to_account_info(),
                    mint: dest_mint,
                },
                &[signer_seeds],
            ),
            amount_out,
            destination_mint_decimals,
        )?;
    }

    // 7. Update reserves state.
    let amm_pool_mut = &mut ctx.accounts.amm_pool;
    let amount_added_to_lp_reserves = amount_in
        .checked_sub(protocol_fee)
        .ok_or(DloomError::MathOverflow)?;
    if is_a_to_b {
        amm_pool_mut.reserves_a = source_reserves
            .checked_add(amount_added_to_lp_reserves)
            .ok_or(DloomError::MathOverflow)?;
        amm_pool_mut.reserves_b = destination_reserves
            .checked_sub(amount_out)
            .ok_or(DloomError::MathOverflow)?;
    } else {
        amm_pool_mut.reserves_b = source_reserves
            .checked_add(amount_added_to_lp_reserves)
            .ok_or(DloomError::MathOverflow)?;
        amm_pool_mut.reserves_a = destination_reserves
            .checked_sub(amount_out)
            .ok_or(DloomError::MathOverflow)?;
    }

    // 8. Update fee growth accumulators for LPs.
    let lp_mint_supply = ctx.accounts.lp_mint.supply;
    if lp_mint_supply > 0 && lp_fee > 0 {
        let fee_growth_update = (lp_fee as u128)
            .checked_mul(PRECISION) // Use the same precision constant as claim_lp_fees
            .ok_or(DloomError::MathOverflow)?
            .checked_div(lp_mint_supply as u128)
            .ok_or(DloomError::MathOverflow)?;

        if is_a_to_b {
            // Fee was in token A
            amm_pool_mut.fee_growth_per_lp_token_a = amm_pool_mut
                .fee_growth_per_lp_token_a
                .checked_add(fee_growth_update)
                .ok_or(DloomError::MathOverflow)?;
        } else {
            // Fee was in token B
            amm_pool_mut.fee_growth_per_lp_token_b = amm_pool_mut
                .fee_growth_per_lp_token_b
                .checked_add(fee_growth_update)
                .ok_or(DloomError::MathOverflow)?;
        }
    }

    emit!(AmmSwap {
        pool_address: ctx.accounts.amm_pool.key(),
        trader: ctx.accounts.trader.key(),
        input_mint: ctx.accounts.user_source_token_account.mint,
        output_mint: ctx.accounts.user_destination_token_account.mint,
        amount_in,
        amount_out,
        protocol_fee: actual_protocol_fee, // Use the final protocol fee after referral split
        lp_fee,
        referrer: ctx
            .accounts
            .referrer_fee_account
            .as_ref()
            .map(|acc| acc.key()),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct SwapOnAmm<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    #[account(
        mut,
        seeds = [b"amm_pool", amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    #[account(mut, address = amm_pool.lp_mint)]
    pub lp_mint: InterfaceAccount<'info, Mint>,

    #[account(address = amm_pool.token_a_mint)]
    pub token_a_mint: InterfaceAccount<'info, Mint>,
    #[account(address = amm_pool.token_b_mint)]
    pub token_b_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub user_source_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_destination_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = amm_pool.token_a_vault)]
    pub token_a_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = amm_pool.token_b_vault)]
    pub token_b_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = amm_pool.protocol_fee_vault_a)]
    pub protocol_fee_vault_a: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, address = amm_pool.protocol_fee_vault_b)]
    pub protocol_fee_vault_b: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: The authority of the protocol fee vaults. Safe because we check the address against the one stored in the pool account.
    #[account(address = amm_pool.authority)]
    pub authority: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: Optional account for receiving referral fees.
    /// The client is responsible for passing the correct token account for the input token.
    pub referrer_fee_account: Option<AccountInfo<'info>>,

    pub token_a_program: Interface<'info, TokenInterface>,
    pub token_b_program: Interface<'info, TokenInterface>,
}