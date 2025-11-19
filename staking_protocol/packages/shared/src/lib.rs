use cosmwasm_schema::cw_serde;
use cosmwasm_std::Uint128;

#[cw_serde]
pub struct Cw20Coin {
    pub address: String,
    pub amount: Uint128,
}