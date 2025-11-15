use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};
use cosmwasm_schema::cw_serde;

#[cw_serde]
pub struct TokenInfo  {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: Uint128,
}

pub const TOKEN_INFO: Item<TokenInfo> = Item::new("token_info");
pub const BALANCES: Map<&Addr, Uint128> = Map::new("balance");
pub const ALLOWANCES: Map<(&Addr, &Addr), Uint128> = Map::new("allowance");