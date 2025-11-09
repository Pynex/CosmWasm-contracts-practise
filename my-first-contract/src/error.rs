use cosmwasm_std::StdError;
use thiserror::Error;
use cw_ownable::OwnershipError;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("{0}")]
    Ownership(#[from] OwnershipError),

    #[error("Count cannot be negative")]
    NegativeCount {},
}