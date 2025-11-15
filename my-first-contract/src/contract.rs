use cosmwasm_std::{Binary, Deps, DepsMut, Env, MessageInfo, Response, entry_point, to_json_binary};
use crate::error::ContractError;
use crate::msg::{CountResponse, ExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::COUNT;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    if msg.count < 0 {
        return Err(ContractError::NegativeCount {});
    }
    COUNT.save(deps.storage, &msg.count)?;

    let owner = msg.owner.as_deref().or(Some(info.sender.as_str()));

    cw_ownable::initialize_owner(deps.storage, deps.api, owner)?;
    Ok(Response::new()
        .add_attribute("method", "instatiate")
        .add_attribute("count", msg.count.to_string()))
}

#[entry_point]
pub fn query(
    deps: Deps,
    _env: Env,
    msg: QueryMsg,
) -> Result<Binary, ContractError> {
    match msg {
        QueryMsg::GetCount {} => to_json_binary(&query_count(deps)?),
        QueryMsg::Ownership {} => {
            to_json_binary(&cw_ownable::get_ownership(deps.storage)?)
        }
    }
    .map_err(|e| ContractError::Std(e))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Increment {} => execute_increment(deps, info),
        ExecuteMsg::Reset { count } => execute_reset(deps, info, count),

        ExecuteMsg::UpdateOwnership(action) => {
            cw_ownable::update_ownership(deps, &env.block, &info.sender, action)?;
            Ok(Response::new().add_attribute("action", "update_ownership"))
        }
    }
}

fn query_count(deps: Deps) -> Result<CountResponse, ContractError> {
    let count = COUNT.load(deps.storage)?;

    Ok(CountResponse { count })
}

pub fn execute_increment(
    deps: DepsMut,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    cw_ownable::assert_owner(deps.storage, &info.sender)?;

    let current  = COUNT.load(deps.storage)?;
    let new_value = current + 1;
    COUNT.save(deps.storage, &new_value)?;

    Ok(Response::new().add_attribute("method", "increment"))
}

pub fn execute_reset(
    deps: DepsMut,
    info: MessageInfo,
    count: i32,
) -> Result<Response, ContractError> {
    cw_ownable::assert_owner(deps.storage, &info.sender)?;

    if count < 0 {
        return Err(ContractError::NegativeCount {});
    }

    COUNT.save(deps.storage, &count)?;

    Ok(Response::new()
        .add_attribute("method", "reset")
        .add_attribute("count", count.to_string()))
}
