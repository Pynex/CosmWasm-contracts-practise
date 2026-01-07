use cosmwasm_std::{
    entry_point, to_json_binary, Addr, BalanceResponse as BankBalanceResponse, BankQuery, Binary,
    Coin, Deps, DepsMut, Env, MessageInfo, QueryRequest, Response, StdResult,
};

use crate::msg::{BalanceResponse, DeployerResponse, InstantiateMsg, QueryMsg};
use crate::state::DEPLOYER;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    _msg: InstantiateMsg,
) -> StdResult<Response> {
    // Сохраняем адрес того, кто инициализировал контракт
    let deployer = info.sender.clone();
    DEPLOYER.save(deps.storage, &deployer)?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("deployer", deployer))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Balance { user } => {
            let address: Addr = deps.api.addr_validate(&user)?;

            let denom = "uaxm".to_string();

            let balance = query_native_balance(deps, address.to_string(), denom)?;
            let resp = BalanceResponse { balance };

            to_json_binary(&resp)
        }
        QueryMsg::Deployer {} => {
            let addr = DEPLOYER.load(deps.storage)?;
            let resp = DeployerResponse {
                deployer: addr.to_string(),
            };
            to_json_binary(&resp)
        }
    }
}

fn query_native_balance(deps: Deps, address: String, denom: String) -> StdResult<Coin> {
    let res: BankBalanceResponse = deps
        .querier
        .query(&QueryRequest::Bank(BankQuery::Balance { address, denom }))?;
    Ok(res.amount)
}
