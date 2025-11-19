use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Uint128; 
use cw_ownable::Action;

#[cw_serde]
pub struct InstantiateMsg {
    pub owner: String,
    pub token_address: String,
    pub reward_rate: u64,
    pub lockup_period: u64,
}

#[cw_serde]
pub enum ExecuteMsg {
    Stake {
        amount: Uint128,
    },
    Unstake {
        amount: Uint128
    },
    ClaimRewards {},
    ChangeConfig {
        new_apr: u64,
        new_lockup_period: u64,
    },
    UpdateOwnership(Action),
}

#[derive(QueryResponses)]
#[cw_serde]
pub enum QueryMsg {
    #[returns(StakeResponse)]
    Stake {address: String},

    #[returns(ConfigResponse)]
    Config {},

    #[returns(RewardResponse)]
    Reward {address: String},

    #[returns(TotalStakedResponse)]
    TotalStaked {},

    #[returns(cw_ownable::Ownership<cosmwasm_std::Addr>)]
    Ownership {},
}

#[cw_serde]
pub struct StakeResponse {
    pub amount: Uint128,
    pub stake_time: u64,
}

#[cw_serde]
pub struct ConfigResponse {
    pub token_address: String,
    pub apr: u64,
    pub lockup_period: u64,
}

#[cw_serde]
pub struct RewardResponse {
    pub amount: Uint128,
}

#[cw_serde]
pub struct TotalStakedResponse {
    pub total: Uint128,
}

