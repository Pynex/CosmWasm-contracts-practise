use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Coin;

#[cw_serde]
pub struct InstantiateMsg {}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    #[returns(BalanceResponse)]
    Balance { user: String },

    /// Вернуть адрес деплоера контракта
    #[returns(DeployerResponse)]
    Deployer {},
}

#[cw_serde]
pub struct BalanceResponse {
    pub balance: Coin,
}

#[cw_serde]
pub struct DeployerResponse {
    pub deployer: String,
}
