// FILE: programs/dloom_flow/src/math/dlmm_math.rs

use crate::{
    constants::{BASIS_POINT_MAX, PRECISION},
    errors::DloomError,
    state::{TransactionBins},
    dlmm::{state::{Bin, DlmmPool, Position}}
};
use anchor_lang::prelude::*;
use std::collections::HashMap;

// ====================================================================================
// UNCHANGED FUNCTIONS
// These functions are correct and do not need modification.
// ====================================================================================

pub fn get_price_at_bin(bin_id: i32, bin_step: u16) -> Result<u128> {
    if bin_step == 0 {
        return err!(DloomError::InvalidBinStep);
    }
    let basis_point_step = bin_step as u128;
    // The base for the power calculation is 1 + bin_step (in basis points).
    // e.g., for a bin_step of 20 (0.2%), the base is 1.002, represented as 10020.
    let base = BASIS_POINT_MAX
        .checked_add(basis_point_step)
        .ok_or(DloomError::MathOverflow)?;

    // Use absolute value for the exponent
    let power = bin_id.unsigned_abs() as u128;

    let price_ratio = power_fp(base, power)?;

    if bin_id >= 0 {
        // For positive bin_id, price = 1 * (1.002)^bin_id
        Ok(price_ratio)
    } else {
        // For negative bin_id, price = 1 / (1.002)^|bin_id|
        PRECISION
            .checked_mul(PRECISION)
            .ok_or(DloomError::MathOverflow)?
            .checked_div(price_ratio)
            .ok_or(DloomError::MathOverflow.into())
    }
}

// Fixed-point exponentiation
fn power_fp(base: u128, exp: u128) -> Result<u128> {
    let mut res = PRECISION;
    let mut base_fp = base;
    let mut exp_rem = exp;

    if exp == 0 {
        return Ok(PRECISION);
    }

    while exp_rem > 0 {
        if exp_rem % 2 == 1 {
            res = res
                .checked_mul(base_fp)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(BASIS_POINT_MAX)
                .ok_or(DloomError::MathOverflow)?;
        }
        base_fp = base_fp
            .checked_mul(base_fp)
            .ok_or(DloomError::MathOverflow)?
            .checked_div(BASIS_POINT_MAX)
            .ok_or(DloomError::MathOverflow)?;
        exp_rem /= 2;
    }
    Ok(res)
}

pub fn calculate_required_for_bin(
    active_bin_id: i32,
    bin_id: i32,
    bin_step: u16,
    liquidity_amount: u128,
) -> Result<(u128, u128)> {
    let mut required_a: u128 = 0;
    let mut required_b: u128 = 0;

    if bin_id > active_bin_id {
        // Bins above the active one are composed entirely of token A.
        required_a = liquidity_amount;
    } else if bin_id < active_bin_id {
        // Bins below the active one are composed entirely of token B.
        let price = get_price_at_bin(bin_id, bin_step)?;
        required_b = liquidity_amount
            .checked_mul(price)
            .ok_or(DloomError::MathOverflow)?
            .checked_div(PRECISION)
            .ok_or(DloomError::MathOverflow)?;
    } else {
        // The active bin can contain both tokens.
        let price = get_price_at_bin(bin_id, bin_step)?;
        required_a = liquidity_amount;
        required_b = liquidity_amount
            .checked_mul(price)
            .ok_or(DloomError::MathOverflow)?
            .checked_div(PRECISION)
            .ok_or(DloomError::MathOverflow)?;
    }
    Ok((required_a, required_b))
}

pub fn calculate_required_token_amounts(
    pool: &DlmmPool,
    lower_bin_id: i32,
    upper_bin_id: i32,
    amount_to_deposit: u128,
) -> Result<(u128, u128)> {
    let mut amount_a: u128 = 0;
    let mut amount_b: u128 = 0;

    let num_bins = ((upper_bin_id - lower_bin_id) as u128 / pool.bin_step as u128)
        .checked_add(1)
        .ok_or(DloomError::MathOverflow)?;
    if num_bins == 0 {
        return Ok((0, 0));
    }

    let liquidity_per_bin = amount_to_deposit
        .checked_div(num_bins)
        .ok_or(DloomError::MathOverflow)?;

    for bin_id in (lower_bin_id..=upper_bin_id).step_by(pool.bin_step as usize) {
        let (required_a, required_b) = calculate_required_for_bin(
            pool.active_bin_id,
            bin_id,
            pool.bin_step,
            liquidity_per_bin,
        )?;
        amount_a = amount_a
            .checked_add(required_a)
            .ok_or(DloomError::MathOverflow)?;
        amount_b = amount_b
            .checked_add(required_b)
            .ok_or(DloomError::MathOverflow)?;
    }
    Ok((amount_a, amount_b))
}

pub fn calculate_claimable_amounts(
    pool: &DlmmPool,
    position: &Position,
    liquidity_to_remove: u128,
) -> Result<(u128, u128)> {
    let total_bins_in_pos = ((position.upper_bin_id - position.lower_bin_id) as u128
        / pool.bin_step as u128)
        .checked_add(1)
        .ok_or(DloomError::MathOverflow)?;
    if total_bins_in_pos == 0 {
        return Ok((0, 0));
    }

    let liquidity_per_bin = liquidity_to_remove
        .checked_div(total_bins_in_pos)
        .ok_or(DloomError::MathOverflow)?;

    let mut amount_a: u128 = 0;
    let mut amount_b: u128 = 0;

    for bin_id in (position.lower_bin_id..=position.upper_bin_id).step_by(pool.bin_step as usize) {
        if bin_id > pool.active_bin_id {
            amount_a = amount_a
                .checked_add(liquidity_per_bin)
                .ok_or(DloomError::MathOverflow)?;
        } else if bin_id < pool.active_bin_id {
            let price = get_price_at_bin(bin_id, pool.bin_step)?;
            let amount_b_in_bin = liquidity_per_bin
                .checked_mul(price)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(PRECISION)
                .ok_or(DloomError::MathOverflow)?;
            amount_b = amount_b
                .checked_add(amount_b_in_bin)
                .ok_or(DloomError::MathOverflow)?;
        } else {
            let price = get_price_at_bin(bin_id, pool.bin_step)?;
            let amount_b_in_bin = liquidity_per_bin
                .checked_mul(price)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(PRECISION)
                .ok_or(DloomError::MathOverflow)?;
            amount_a = amount_a
                .checked_add(liquidity_per_bin)
                .ok_or(DloomError::MathOverflow)?;
            amount_b = amount_b
                .checked_add(amount_b_in_bin)
                .ok_or(DloomError::MathOverflow)?;
        }
    }

    Ok((amount_a, amount_b))
}

pub fn calculate_accrued_fees(position: &Position, bin: &Bin) -> (u64, u64) {
    let fee_growth_a = bin
        .fee_growth_per_unit_a
        .checked_sub(position.fee_growth_snapshot_a)
        .unwrap_or(0);
    let fee_growth_b = bin
        .fee_growth_per_unit_b
        .checked_sub(position.fee_growth_snapshot_b)
        .unwrap_or(0);

    let fees_a = fee_growth_a
        .checked_mul(position.liquidity)
        .unwrap_or(0)
        .checked_div(PRECISION)
        .unwrap_or(0) as u64;
    let fees_b = fee_growth_b
        .checked_mul(position.liquidity)
        .unwrap_or(0)
        .checked_div(PRECISION)
        .unwrap_or(0) as u64;

    (fees_a, fees_b)
}

// ====================================================================================
// NEW & REFACTORED FUNCTIONS
// This is the core of the new architecture.
// ====================================================================================

/// A helper function to safely map the provided AccountInfos to the Pubkeys
/// listed in the TransactionBins account. This is a crucial validation step that
/// ensures the client isn't passing malicious or incorrect accounts.
fn get_validated_bin_map<'info>(
    transaction_bins: &Account<'info, TransactionBins>,
    account_infos: &'info [AccountInfo<'info>],
) -> Result<HashMap<Pubkey, &'info AccountInfo<'info>>> {
    // <--- CHANGE 1: Return a map of REFERENCES
    // 1. Create a quick lookup map of all the accounts the user *actually provided*.
    // This map will also store references.
    let mut account_map: HashMap<Pubkey, &'info AccountInfo<'info>> =
        HashMap::with_capacity(account_infos.len());
    for acc_info in account_infos.iter() {
        account_map.insert(acc_info.key(), acc_info); // <--- CHANGE 2: No .clone()
    }

    // 2. Iterate through the list of bins the user *claimed* they would provide.
    let mut validated_map = HashMap::with_capacity(transaction_bins.bins.len());
    for bin_key in &transaction_bins.bins {
        // 3. For each claimed bin, check if it was actually provided. If not, it's an error.
        let account_info = account_map.get(bin_key).ok_or(DloomError::BinCacheMismatch)?;
        validated_map.insert(*bin_key, *account_info); // <--- CHANGE 3: Dereference the reference-to-a-reference
    }

    Ok(validated_map)
}

/// Fully refactored swap function for Token A -> Token B.
pub fn swap_a_to_b<'info>(
    pool: &DlmmPool,
    amount_in: u64,
    transaction_bins: &Account<'info, TransactionBins>,
    bin_account_infos: &'info [AccountInfo<'info>],
    program_id: &Pubkey,
    pool_key: &Pubkey,
) -> Result<(u64, u64, i32)> {
    // 1. Validate that the provided accounts match the cached list of bin pubkeys.
    let validated_bins = get_validated_bin_map(transaction_bins, bin_account_infos)?;

    let mut amount_remaining_in = amount_in as u128;
    let mut total_amount_out: u128 = 0;
    let mut total_protocol_fee: u128 = 0;
    let mut current_bin_id = pool.active_bin_id;

    // 2. Iterate through the bins in the expected swap order.
    for _ in 0..transaction_bins.bins.len() {
        if amount_remaining_in == 0 {
            break;
        }

        // 3. Find the PDA for the current price bin we are processing.
        let (expected_pda, _) = Pubkey::find_program_address(
            &[b"bin", pool_key.as_ref(), &current_bin_id.to_le_bytes()],
            program_id,
        );

        // 4. Safely retrieve the validated account info for this PDA.
        let bin_info = validated_bins
            .get(&expected_pda)
            .ok_or(DloomError::BinCacheMismatch)?;

        if *bin_info.owner != *program_id {
            return err!(DloomError::InvalidBinAccount);
        }

        let bin_loader = AccountLoader::<'_, Bin>::try_from(bin_info)?;
        let mut bin = bin_loader.load_mut()?;
        let price = get_price_at_bin(current_bin_id, pool.bin_step)?;

        let available_b_in_bin = bin
            .liquidity
            .checked_mul(price)
            .ok_or(DloomError::MathOverflow)?
            .checked_div(PRECISION)
            .ok_or(DloomError::MathOverflow)?;

        if available_b_in_bin > 0 {
            let total_fee_for_chunk = amount_remaining_in
                .checked_mul(pool.fee_rate as u128)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(BASIS_POINT_MAX as u128)
                .ok_or(DloomError::MathOverflow)?;
            let protocol_fee_for_chunk = total_fee_for_chunk
                .checked_mul(pool.protocol_fee_share as u128)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(BASIS_POINT_MAX as u128)
                .ok_or(DloomError::MathOverflow)?;
            let lp_fee_for_chunk = total_fee_for_chunk
                .checked_sub(protocol_fee_for_chunk)
                .ok_or(DloomError::MathOverflow)?;
            total_protocol_fee = total_protocol_fee
                .checked_add(protocol_fee_for_chunk)
                .ok_or(DloomError::MathOverflow)?;
            let amount_in_after_fee = amount_remaining_in
                .checked_sub(total_fee_for_chunk)
                .ok_or(DloomError::MathOverflow)?;

            let amount_out_from_bin = std::cmp::min(
                amount_in_after_fee
                    .checked_mul(price)
                    .ok_or(DloomError::MathOverflow)?
                    .checked_div(PRECISION)
                    .ok_or(DloomError::MathOverflow)?,
                available_b_in_bin,
            );

            let amount_in_consumed = amount_out_from_bin
                .checked_mul(PRECISION)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(price)
                .ok_or(DloomError::MathOverflow)?;
            let actual_amount_in_with_fee = amount_in_consumed
                .checked_mul(BASIS_POINT_MAX as u128)
                .ok_or(DloomError::MathOverflow)?
                .checked_div((BASIS_POINT_MAX - pool.fee_rate as u128) as u128)
                .ok_or(DloomError::MathOverflow)?;

            if bin.liquidity > 0 {
                let fee_growth_update = lp_fee_for_chunk
                    .checked_mul(PRECISION)
                    .ok_or(DloomError::MathOverflow)?
                    .checked_div(bin.liquidity)
                    .ok_or(DloomError::MathOverflow)?;
                bin.fee_growth_per_unit_b = bin
                    .fee_growth_per_unit_b
                    .checked_add(fee_growth_update)
                    .ok_or(DloomError::MathOverflow)?;
            }

            bin.liquidity = bin
                .liquidity
                .checked_add(amount_in_consumed)
                .ok_or(DloomError::MathOverflow)?;
            total_amount_out = total_amount_out
                .checked_add(amount_out_from_bin)
                .ok_or(DloomError::MathOverflow)?;
            amount_remaining_in = amount_remaining_in
                .checked_sub(actual_amount_in_with_fee)
                .ok_or(DloomError::MathOverflow)?;
        }

        // 6. Move to the next bin in the swap direction.
        current_bin_id = current_bin_id.checked_sub(1).ok_or(DloomError::MathOverflow)?;
    }

    // 7. After iterating, if there is still an amount left, it means the user
    // did not provide enough bin accounts for the swap to complete.
    require!(
        amount_remaining_in == 0,
        DloomError::InsufficientLiquidityForSwap
    );

    Ok((
        total_amount_out as u64,
        total_protocol_fee as u64,
        current_bin_id,
    ))
}

/// Fully refactored swap function for Token B -> Token A.
pub fn swap_b_to_a<'info>(
    pool: &DlmmPool,
    amount_in: u64,
    transaction_bins: &Account<'info, TransactionBins>,
    bin_account_infos: &'info [AccountInfo<'info>],
    program_id: &Pubkey,
    pool_key: &Pubkey,
) -> Result<(u64, u64, i32)> {
    // 1. Validate that the provided accounts match the cached list of bin pubkeys.
    let validated_bins = get_validated_bin_map(transaction_bins, bin_account_infos)?;

    let mut amount_remaining_in = amount_in as u128;
    let mut total_amount_out: u128 = 0;
    let mut total_protocol_fee: u128 = 0;
    let mut current_bin_id = pool.active_bin_id;

    // 2. Iterate through the bins in the expected swap order.
    for _ in 0..transaction_bins.bins.len() {
        if amount_remaining_in == 0 {
            break;
        }

        // 3. Find the PDA for the current price bin we are processing.
        let (expected_pda, _) = Pubkey::find_program_address(
            &[b"bin", pool_key.as_ref(), &current_bin_id.to_le_bytes()],
            program_id,
        );

        // 4. Safely retrieve the validated account info for this PDA.
        let bin_info = validated_bins
            .get(&expected_pda)
            .ok_or(DloomError::BinCacheMismatch)?;

        if *bin_info.owner != *program_id {
            return err!(DloomError::InvalidBinAccount);
        }

        let bin_loader = AccountLoader::<'_, Bin>::try_from(bin_info)?;
        let mut bin = bin_loader.load_mut()?;
        let price = get_price_at_bin(current_bin_id, pool.bin_step)?;

        let available_a_in_bin = bin.liquidity;

        if available_a_in_bin > 0 {
            let total_fee_for_chunk = amount_remaining_in
                .checked_mul(pool.fee_rate as u128)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(BASIS_POINT_MAX as u128)
                .ok_or(DloomError::MathOverflow)?;
            let protocol_fee_for_chunk = total_fee_for_chunk
                .checked_mul(pool.protocol_fee_share as u128)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(BASIS_POINT_MAX as u128)
                .ok_or(DloomError::MathOverflow)?;
            let lp_fee_for_chunk = total_fee_for_chunk
                .checked_sub(protocol_fee_for_chunk)
                .ok_or(DloomError::MathOverflow)?;
            total_protocol_fee = total_protocol_fee
                .checked_add(protocol_fee_for_chunk)
                .ok_or(DloomError::MathOverflow)?;
            let amount_in_after_fee = amount_remaining_in
                .checked_sub(total_fee_for_chunk)
                .ok_or(DloomError::MathOverflow)?;

            let amount_out_from_bin = std::cmp::min(
                amount_in_after_fee
                    .checked_mul(PRECISION)
                    .ok_or(DloomError::MathOverflow)?
                    .checked_div(price)
                    .ok_or(DloomError::MathOverflow)?,
                available_a_in_bin,
            );

            let amount_in_consumed = amount_out_from_bin
                .checked_mul(price)
                .ok_or(DloomError::MathOverflow)?
                .checked_div(PRECISION)
                .ok_or(DloomError::MathOverflow)?;
            let actual_amount_in_with_fee = amount_in_consumed
                .checked_mul(BASIS_POINT_MAX as u128)
                .ok_or(DloomError::MathOverflow)?
                .checked_div((BASIS_POINT_MAX - pool.fee_rate as u128) as u128)
                .ok_or(DloomError::MathOverflow)?;

            if bin.liquidity > 0 {
                let fee_growth_update = lp_fee_for_chunk
                    .checked_mul(PRECISION)
                    .ok_or(DloomError::MathOverflow)?
                    .checked_div(bin.liquidity)
                    .ok_or(DloomError::MathOverflow)?;
                bin.fee_growth_per_unit_a = bin
                    .fee_growth_per_unit_a
                    .checked_add(fee_growth_update)
                    .ok_or(DloomError::MathOverflow)?;
            }

            bin.liquidity = bin
                .liquidity
                .checked_sub(amount_out_from_bin)
                .ok_or(DloomError::MathOverflow)?;
            total_amount_out = total_amount_out
                .checked_add(amount_out_from_bin)
                .ok_or(DloomError::MathOverflow)?;
            amount_remaining_in = amount_remaining_in
                .checked_sub(actual_amount_in_with_fee)
                .ok_or(DloomError::MathOverflow)?;
        }

        // 6. Move to the next bin in the swap direction.
        current_bin_id = current_bin_id.checked_add(1).ok_or(DloomError::MathOverflow)?;
    }

    // 7. After iterating, if there is still an amount left, it means the user
    // did not provide enough bin accounts for the swap to complete.
    require!(
        amount_remaining_in == 0,
        DloomError::InsufficientLiquidityForSwap
    );

    Ok((
        total_amount_out as u64,
        total_protocol_fee as u64,
        current_bin_id,
    ))
}
