// FILE: programs/dloom_flow/src/math/amm_math.rs

use crate::{constants::BASIS_POINT_MAX, errors::DloomError, amm::{state::AmmPool}};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

/// Calculates the optimal deposit amounts and the number of LP tokens to mint.
pub fn calculate_lp_tokens_to_mint(
    amm_pool: &AmmPool,
    lp_mint: &InterfaceAccount<Mint>, // Accept the lp_mint account
    amount_a_desired: u64,
    amount_b_desired: u64,
) -> Result<(u64, u64, u64)> {
    let reserves_a = amm_pool.reserves_a as u128;
    let reserves_b = amm_pool.reserves_b as u128;
    let lp_total_supply = lp_mint.supply as u128; // Get supply from the account

    if lp_total_supply == 0 {
        // This is the first deposit. The amount of LP tokens is the geometric mean of the two amounts.
        let lp_to_mint = (amount_a_desired as u128)
            .checked_mul(amount_b_desired as u128)
            .ok_or(DloomError::MathOverflow)?
            .sqrt();

        Ok((amount_a_desired, amount_b_desired, lp_to_mint as u64))
    } else {
        // This is a subsequent deposit. We must maintain the current price ratio.
        let optimal_amount_b = (amount_a_desired as u128)
            .checked_mul(reserves_b)
            .ok_or(DloomError::MathOverflow)?
            .checked_div(reserves_a)
            .ok_or(DloomError::MathOverflow)?;

        let (amount_a_to_deposit, amount_b_to_deposit) =
            if optimal_amount_b <= amount_b_desired as u128 {
                (amount_a_desired, optimal_amount_b as u64)
            } else {
                let optimal_amount_a = (amount_b_desired as u128)
                    .checked_mul(reserves_a)
                    .ok_or(DloomError::MathOverflow)?
                    .checked_div(reserves_b)
                    .ok_or(DloomError::MathOverflow)?;
                (optimal_amount_a as u64, amount_b_desired)
            };

        let lp_from_a = (amount_a_to_deposit as u128)
            .checked_mul(lp_total_supply)
            .ok_or(DloomError::MathOverflow)?
            .checked_div(reserves_a)
            .ok_or(DloomError::MathOverflow)?;

        let lp_from_b = (amount_b_to_deposit as u128)
            .checked_mul(lp_total_supply)
            .ok_or(DloomError::MathOverflow)?
            .checked_div(reserves_b)
            .ok_or(DloomError::MathOverflow)?;

        let lp_to_mint = lp_from_a.min(lp_from_b);

        Ok((amount_a_to_deposit, amount_b_to_deposit, lp_to_mint as u64))
    }
}

/// Calculates the result of a swap.
pub fn calculate_swap_out_amount(
    amm_pool: &AmmPool,
    amount_in: u64,
    source_reserves: u64,
    destination_reserves: u64,
) -> Result<(u64, u64, u64)> {
    require!(amount_in > 0, DloomError::ZeroAmount);
    require!(
        source_reserves > 0 && destination_reserves > 0,
        DloomError::InsufficientLiquidityForSwap
    );

    let amount_in_u128 = amount_in as u128;
    let source_reserves_u128 = source_reserves as u128;
    let destination_reserves_u128 = destination_reserves as u128;

    let total_fee = amount_in_u128
        .checked_mul(amm_pool.fee_rate as u128)
        .ok_or(DloomError::MathOverflow)?
        .checked_div(BASIS_POINT_MAX)
        .ok_or(DloomError::MathOverflow)?;

    let protocol_fee = total_fee
        .checked_mul(amm_pool.protocol_fee_share as u128)
        .ok_or(DloomError::MathOverflow)?
        .checked_div(BASIS_POINT_MAX)
        .ok_or(DloomError::MathOverflow)?;

    let lp_fee = total_fee
        .checked_sub(protocol_fee)
        .ok_or(DloomError::MathOverflow)?;

    let amount_in_after_fees = amount_in_u128
        .checked_sub(total_fee)
        .ok_or(DloomError::MathOverflow)?;

    let numerator = destination_reserves_u128
        .checked_mul(amount_in_after_fees)
        .ok_or(DloomError::MathOverflow)?;
    let denominator = source_reserves_u128
        .checked_add(amount_in_after_fees)
        .ok_or(DloomError::MathOverflow)?;
    let amount_out = numerator
        .checked_div(denominator)
        .ok_or(DloomError::MathOverflow)?;

    Ok((amount_out as u64, protocol_fee as u64, lp_fee as u64))
}

/// Calculates the amount of underlying assets to return for a given amount of LP tokens.
pub fn calculate_assets_to_withdraw(
    reserves_a: u64,
    reserves_b: u64,
    lp_total_supply: u64,
    lp_tokens_to_burn: u64,
) -> Result<(u64, u64)> {
    require!(lp_total_supply > 0, DloomError::InsufficientLiquidity);

    let reserves_a_u128 = reserves_a as u128;
    let reserves_b_u128 = reserves_b as u128;
    let lp_total_supply_u128 = lp_total_supply as u128;
    let lp_tokens_to_burn_u128 = lp_tokens_to_burn as u128;

    let amount_a_to_withdraw = reserves_a_u128
        .checked_mul(lp_tokens_to_burn_u128)
        .ok_or(DloomError::MathOverflow)?
        .checked_div(lp_total_supply_u128)
        .ok_or(DloomError::MathOverflow)?;

    let amount_b_to_withdraw = reserves_b_u128
        .checked_mul(lp_tokens_to_burn_u128)
        .ok_or(DloomError::MathOverflow)?
        .checked_div(lp_total_supply_u128)
        .ok_or(DloomError::MathOverflow)?;

    Ok((amount_a_to_withdraw as u64, amount_b_to_withdraw as u64))
}

trait U128Sqrt {
    fn sqrt(&self) -> Self;
}
impl U128Sqrt for u128 {
    fn sqrt(&self) -> Self {
        if *self < 2 {
            return *self;
        }
        let mut x = *self / 2;
        let mut y = (x + *self / x) / 2;
        while y < x {
            x = y;
            y = (x + *self / x) / 2;
        }
        x
    }
}