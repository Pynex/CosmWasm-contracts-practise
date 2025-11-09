use cosmwasm_schema::{cw_serde, QueryResponses};
use cw_ownable::{cw_ownable_execute, cw_ownable_query}; 

#[cw_serde]
pub struct InstantiateMsg {
    pub count: i32,
    pub owner: Option<String>,
}

#[cw_ownable_execute] // импорты функций ownable
#[cw_serde]
pub enum ExecuteMsg {
    Increment {},
    Reset { count: i32},
}

#[cw_ownable_query]
#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg  {
    #[returns(CountResponse)]
    GetCount {},
}

#[cw_serde]
pub struct CountResponse{
    pub count: i32,
}

