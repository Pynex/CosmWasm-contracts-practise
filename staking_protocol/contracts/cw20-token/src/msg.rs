use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Uint128;

#[cw_serde]
pub struct InstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub minter: Option<String>,
}

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
    UpdateMinter {
        new_minter: Option<String>,
    },
}

#[derive(QueryResponses)]
#[cw_serde]
pub enum QueryMsg {
    #[returns(BalanceResponse)]
    Balance {address: String},

    #[returns(AllowanceResponse)]
    Allowance {owner: String, spender: String},

    #[returns(TokenInfoResponse)]
    TokenInfo {},

    #[returns(MinterResponse)]
    Minter {},
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

#[cw_serde]
pub struct MinterResponse {
    pub minter: Option<String>,
}
