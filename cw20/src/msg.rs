use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Uint128;
use cw_ownable::{cw_ownable_execute, cw_ownable_query}; 

#[cw_serde]
pub struct InstantiateMsg {
    pub owner: Option<String>,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
}

#[cw_serde]
pub struct BalanceResponse {
    pub balance: Uint128,
}

#[cw_serde]
pub struct AllowanceResponse {
    pub allowance: Uint128,
}

#[cw_serde]
pub struct TokenInfoResponse {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: Uint128,
}

#[cw_ownable_execute]
#[cw_serde]
pub enum ExecuteMsg {
    Transfer {
        recipient: String,
        amount: Uint128,
    },
    Burn {
        amount: Uint128
    },
    Mint {
        recipient: String,
        amount: Uint128,
    },
    Approve {
        spender: String,
        amount: Uint128,
    },
    TransferFrom {
        owner: String,
        recipient: String,
        amount: Uint128,
    },
}

#[derive(QueryResponses)]
#[cw_ownable_query]
#[cw_serde]
pub enum QueryMsg {
    #[returns(BalanceResponse)]
    Balance {address: String},

    #[returns(AllowanceResponse)]
    Allowance {owner: String, spender: String},

    #[returns(TokenInfoResponse)]
    TokenInfo {},
}


