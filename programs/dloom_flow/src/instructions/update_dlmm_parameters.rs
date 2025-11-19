// FILE: programs/dloom_flow/src/instructions/update_dlmm_parameters.rs

use crate::{errors::DloomError, state::{DlmmParameter, DlmmParameters, ProtocolConfig}};
use anchor_lang::prelude::*;
use crate::{ParameterAction, ParameterList};

pub fn handle_update_dlmm_parameters(
    ctx: Context<UpdateDlmmParameters>,
    list: ParameterList,
    action: ParameterAction,    
    bin_step: u16,
    fee_rate: u16,
) -> Result<()> {
    let params_account = &mut ctx.accounts.dlmm_parameters;
    let target_list = match list {
        ParameterList::Official => &mut params_account.official_parameters,
        ParameterList::Community => &mut params_account.community_parameters,
    };
    
    let new_param = DlmmParameter { bin_step, fee_rate };

    match action {
        ParameterAction::Add => {
            // Prevent duplicates
            if !target_list.contains(&new_param) {
                target_list.push(new_param);
            }
        }
        ParameterAction::Remove => {
            target_list.retain(|&p| p != new_param);
        }
    }

    emit!(crate::events::DlmmParametersUpdated {
    list,
    action,
    bin_step,
    fee_rate,
});

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateDlmmParameters<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"protocol_config"], 
        bump, 
        has_one = authority @ DloomError::Unauthorized
    )]
    pub protocol_config: Box<Account<'info, ProtocolConfig>>,

    #[account(
        mut,
        seeds = [b"dlmm_parameters"],
        bump,
        has_one = authority @ DloomError::Unauthorized
    )]
    pub dlmm_parameters: Box<Account<'info, DlmmParameters>>,
}