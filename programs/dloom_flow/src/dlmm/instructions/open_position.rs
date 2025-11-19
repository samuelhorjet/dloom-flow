// FILE: programs/dloom_flow/src/instructions/dlmm_open_position.rs

use crate::{
    constants::MAX_BINS_PER_POSITION,
    errors::DloomError,
    events::DlmmPositionOpened,
    dlmm::{state::{DlmmPool, Position}},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface},
};
use mpl_token_metadata::{
    accounts::{MasterEdition, Metadata},
    instructions::{
        CreateMasterEditionV3Cpi, CreateMasterEditionV3CpiAccounts,
        CreateMasterEditionV3InstructionArgs, CreateMetadataAccountV3Cpi,
        CreateMetadataAccountV3CpiAccounts, CreateMetadataAccountV3InstructionArgs,
    },
    types::DataV2,
    ID as TOKEN_METADATA_ID,
};

/// Handler for the `dlmm_open_position` instruction.
pub fn handle_dlmm_open_position(
    ctx: Context<DlmmOpenPosition>,
    lower_bin_id: i32,
    upper_bin_id: i32,
) -> Result<()> {
    // 1. Validate the bin range.
    require!(lower_bin_id < upper_bin_id, DloomError::InvalidBinRange);
    let bin_step = ctx.accounts.dlmm_pool.bin_step as i32;
    require!(
        lower_bin_id % bin_step == 0 && upper_bin_id % bin_step == 0,
        DloomError::InvalidBinId
    );

    let range = (upper_bin_id - lower_bin_id) / bin_step as i32;
    require!(range <= MAX_BINS_PER_POSITION, DloomError::RangeTooWide);

    // 2. Initialize the Position account.
    let position = &mut ctx.accounts.position;
    position.pool = ctx.accounts.dlmm_pool.key(); // Reference the DLMM pool
    position.owner = ctx.accounts.owner.key();
    position.lower_bin_id = lower_bin_id;
    position.upper_bin_id = upper_bin_id;
    position.liquidity = 0; // Positions are created with zero liquidity
    position.position_mint = ctx.accounts.position_mint.key();
    position.fee_growth_snapshot_a = 0;
    position.fee_growth_snapshot_b = 0;

    // 3. Mint the Position NFT to the user.
    token_interface::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.position_mint.to_account_info(),
                to: ctx.accounts.user_position_nft_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        1, // It's an NFT, so only 1 is minted.
    )?;

    let base_uri = "https://api.yourprotocol.com/metadata/";
    let mint_key_string = ctx.accounts.position_mint.key().to_string();
    let dynamic_uri = format!("{}{}", base_uri, mint_key_string);
    // 4. Create the metadata account for the Position NFT (Metaplex CPI).
    CreateMetadataAccountV3Cpi::new(
        &ctx.accounts.token_metadata_program,
        CreateMetadataAccountV3CpiAccounts {
            metadata: &ctx.accounts.metadata_account,
            mint: &ctx.accounts.position_mint.to_account_info(),
            mint_authority: &ctx.accounts.owner.to_account_info(),
            payer: &ctx.accounts.owner.to_account_info(),
            update_authority: (&ctx.accounts.owner.to_account_info(), true),
            system_program: &ctx.accounts.system_program,
            rent: Some(&ctx.accounts.rent.to_account_info()),
        },
        CreateMetadataAccountV3InstructionArgs {
            data: DataV2 {
                name: "DLMM Position".to_string(),
                symbol: "DLMMLP".to_string(),
                uri: dynamic_uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            is_mutable: true,
            collection_details: None,
        },
    )
    .invoke()?;

    // 5. Create the master edition account to make it a true NFT (Metaplex CPI).
    CreateMasterEditionV3Cpi::new(
        &ctx.accounts.token_metadata_program,
        CreateMasterEditionV3CpiAccounts {
            edition: &ctx.accounts.master_edition_account,
            mint: &ctx.accounts.position_mint.to_account_info(),
            update_authority: &ctx.accounts.owner.to_account_info(),
            mint_authority: &ctx.accounts.owner.to_account_info(),
            payer: &ctx.accounts.owner.to_account_info(),
            metadata: &ctx.accounts.metadata_account,
            token_program: &ctx.accounts.token_program,
            system_program: &ctx.accounts.system_program,
            rent: Some(&ctx.accounts.rent.to_account_info()),
        },
        CreateMasterEditionV3InstructionArgs {
            max_supply: Some(0),
        },
    )
    .invoke()?;

    emit!(DlmmPositionOpened {
        pool_address: ctx.accounts.dlmm_pool.key(),
        owner: ctx.accounts.owner.key(),
        position_address: ctx.accounts.position.key(),
        position_mint: ctx.accounts.position_mint.key(),
        lower_bin_id,
        upper_bin_id,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct DlmmOpenPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    // Use the DlmmPool struct
    pub dlmm_pool: Box<Account<'info, DlmmPool>>,

    #[account(
        init,
        payer = owner,
        space = 8 + 256, // Allocate space for Position struct
        seeds = [b"position", position_mint.key().as_ref()],
        bump
    )]
    pub position: Box<Account<'info, Position>>,

    #[account(
        init,
        payer = owner,
        mint::decimals = 0,
        mint::authority = owner,
        mint::freeze_authority = owner
    )]
    pub position_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = owner,
        associated_token::mint = position_mint,
        associated_token::authority = owner
    )]
    pub user_position_nft_account: InterfaceAccount<'info, TokenAccount>,

    // Metadata accounts required by the Metaplex Token Metadata program
    #[account(mut, address = Metadata::find_pda(&position_mint.key()).0)]
    /// CHECK: Address is checked via constraint.
    pub metadata_account: AccountInfo<'info>,

    #[account(mut, address = MasterEdition::find_pda(&position_mint.key()).0)]
    /// CHECK: Address is checked via constraint.
    pub master_edition_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(address = TOKEN_METADATA_ID)]
    /// CHECK: This is the Metaplex program ID.
    pub token_metadata_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
}
