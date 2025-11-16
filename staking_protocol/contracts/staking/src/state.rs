use cosmwasm_std::{Addr, Uint128, Timestamp};
use cw_storage_plus::{Item, Map};
use cosmwasm_schema::cw_serde;

#[cw_serde]
pub struct Config {
    pub token_address: Addr,
    pub reward_rate: u64, // reward per second
    pub lockup_period: u64,
}

#[cw_serde]
pub struct StakeInfo {
    pub amount: Uint128,
    pub stake_time: Timestamp,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const STAKES: Map<&Addr, StakeInfo> = Map::new("stakes");
pub const TOTAL_STAKED: Item<Uint128> = Item::new("total_staked");