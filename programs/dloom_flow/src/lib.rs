// FILE: programs/dloom_flow/src/lib.rs

use anchor_lang::prelude::*;

pub mod amm;
pub mod constants;
pub mod dlmm;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use crate::state::{DlmmParameter};
use crate::{
    amm::{
        state::{FeePreference},
    },
};

use instructions::*; // For protocol-level instructions
use amm::instructions::*; // For AMM instructions
use dlmm::instructions::*; // For DLMM instructions

declare_id!("8VryDeNca4LCF7ivjQ5mNwMik6ugTtmwfTrg6Qfta23X");

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum ParameterAction {
    Add,
    Remove,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum ParameterList {
    Official,
    Community,
}

#[program]
pub mod dloom_flow {
    use super::*;

    // --- Protocol Admin Instructions ---
    pub fn initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
        instructions::initialize_protocol::handle_initialize_protocol(ctx)
    }

    pub fn update_dlmm_fees(ctx: Context<UpdateDlmmFees>, new_fee_rate: Option<u16>) -> Result<()> {
        instructions::update_dlmm_fees::handle_update_dlmm_fees(ctx, new_fee_rate)
    }

    pub fn initialize_dlmm_parameters(
        ctx: Context<InitializeDlmmParameters>,
        official_params: Vec<DlmmParameter>,
        community_params: Vec<DlmmParameter>,
    ) -> Result<()> {
        instructions::initialize_dlmm_parameters::handle_initialize_dlmm_parameters(
            ctx,
            official_params,
            community_params,
        )
    }

    pub fn update_dlmm_parameters(
        ctx: Context<UpdateDlmmParameters>,
        list: ParameterList,
        action: ParameterAction,
        bin_step: u16,
        fee_rate: u16,
    ) -> Result<()> {
        instructions::update_dlmm_parameters::handle_update_dlmm_parameters(
            ctx, list, action, bin_step, fee_rate,
        )
    }

    pub fn update_fee_preference(
        ctx: Context<UpdateFeePreference>,
        new_preference: FeePreference,
    ) -> Result<()> {
        instructions::update_fee_preference::handle_update_fee_preference(ctx, new_preference)
    }

    pub fn update_amm_fees(ctx: Context<UpdateAmmFees>, new_fee_rate: Option<u16>) -> Result<()> {
        instructions::update_amm_fees::handle_update_amm_fees(ctx, new_fee_rate)
    }

    pub fn create_amm_pool(
        ctx: Context<CreateAmmPool>,
        fee_rate: u16,
        protocol_fee_share: u16,
        referrer_fee_share: u16,
    ) -> Result<()> {
        amm::instructions::create_pool::handle_create_amm_pool(
            ctx,
            fee_rate,
            protocol_fee_share,
            referrer_fee_share,
        )
    }

    pub fn open_amm_position(
        ctx: Context<OpenAmmPosition>,
        fee_preference: FeePreference,
    ) -> Result<()> {
        amm::instructions::open_position::handle_open_amm_position(ctx, fee_preference)
    }

    pub fn add_amm_liquidity(
        ctx: Context<AddAmmLiquidity>,
        amount_a_desired: u64,
        amount_b_desired: u64,
        min_lp_tokens_to_mint: u64,
    ) -> Result<()> {
        amm::instructions::add_liquidity::handle_add_amm_liquidity(
            ctx,
            amount_a_desired,
            amount_b_desired,
            min_lp_tokens_to_mint,
        )
    }

    pub fn swap_on_amm(
        ctx: Context<SwapOnAmm>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        amm::instructions::swap::handle_swap_on_amm(ctx, amount_in, min_amount_out)
    }

    pub fn remove_amm_liquidity(
        ctx: Context<RemoveAmmLiquidity>,
        lp_tokens_to_burn: u64,
        min_amount_a_to_receive: u64,
        min_amount_b_to_receive: u64,
    ) -> Result<()> {
        amm::instructions::remove_liquidity::handle_remove_amm_liquidity(
            ctx,
            lp_tokens_to_burn,
            min_amount_a_to_receive,
            min_amount_b_to_receive,
        )
    }

    pub fn claim_lp_fees(ctx: Context<ClaimLpFees>) -> Result<()> {
        amm::instructions::claim_lp_fees::handle_claim_lp_fees(ctx)
    }

    pub fn reinvest_lp_fees(ctx: Context<ReinvestLpFees>) -> Result<()> {
        amm::instructions::reinvest_lp_fees::handle_reinvest_lp_fees(ctx)
    }

    // --- DLMM Instructions ---
    // FIX: Simplified the Context<> paths from `dlmm::instructions::StructName` to just `StructName`
    pub fn create_dlmm_pool(
        ctx: Context<CreateDlmmPool>,
        bin_step: u16,
        fee_rate: u16,
        protocol_fee_share: u16,
        referrer_fee_share: u16,
        initial_bin_id: i32,
    ) -> Result<()> {
        dlmm::instructions::create_pool::handle_create_dlmm_pool(
            ctx,
            bin_step,
            fee_rate,
            protocol_fee_share,
            referrer_fee_share,
            initial_bin_id,
        )
    }

    pub fn create_dlmm_community_pool(
        ctx: Context<CreateDlmmCommunityPool>,
        bin_step: u16,
        fee_rate: u16,
        protocol_fee_share: u16,
        referrer_fee_share: u16,
        initial_bin_id: i32,
    ) -> Result<()> {
        dlmm::instructions::create_community_pool::handle_create_dlmm_community_pool(
            ctx,
            bin_step,
            fee_rate,
            protocol_fee_share,
            referrer_fee_share,
            initial_bin_id,
        )
    }

    pub fn dlmm_open_position(
        ctx: Context<DlmmOpenPosition>,
        lower_bin_id: i32,
        upper_bin_id: i32,
    ) -> Result<()> {
        dlmm::instructions::open_position::handle_dlmm_open_position(
            ctx,
            lower_bin_id,
            upper_bin_id,
        )
    }

    pub fn dlmm_add_liquidity<'info>(
        ctx: Context<'_, '_, 'info, 'info, DlmmAddLiquidity<'info>>,
        start_bin_id: i32,
        liquidity_per_bin: u128,
    ) -> Result<()> {
        dlmm::instructions::add_liquidity::handle_dlmm_add_liquidity(
            ctx,
            start_bin_id,
            liquidity_per_bin,
        )
    }

    pub fn dlmm_swap<'info>(
        ctx: Context<'_, '_, 'info, 'info, DlmmSwap<'info>>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        dlmm::instructions::swap::handle_dlmm_swap(ctx, amount_in, min_amount_out)
    }

    pub fn dlmm_remove_liquidity<'info>(
        ctx: Context<'_, '_, 'info, 'info, DlmmRemoveLiquidity<'info>>,
        liquidity_to_remove: u128,
        min_amount_a: u64,
        min_amount_b: u64,
    ) -> Result<()> {
        dlmm::instructions::remove_liquidity::handle_dlmm_remove_liquidity(
            ctx,
            liquidity_to_remove,
            min_amount_a,
            min_amount_b,
        )
    }

    pub fn dlmm_modify_liquidity<'info>(
        ctx: Context<'_, '_, 'info, 'info, DlmmModifyLiquidity<'info>>,
        min_surplus_a_out: u64,
        min_surplus_b_out: u64,
    ) -> Result<()> {
        dlmm::instructions::modify_liquidity::handle_dlmm_modify_liquidity(
            ctx,
            min_surplus_a_out,
            min_surplus_b_out,
        )
    }

    pub fn dlmm_burn_empty_position(
        ctx: Context<DlmmBurnEmptyPosition>,
    ) -> Result<()> {
        dlmm::instructions::burn_empty_position::handle_dlmm_burn_empty_position(ctx)
    }
}