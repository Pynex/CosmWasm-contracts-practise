use cosmwasm_std::{Binary, Deps, DepsMut, Env, MessageInfo, Response, entry_point, to_json_binary, Uint128, StdResult, StdError};
// use cw_ownable::{initialize_owner, is_owner};
use crate::errors::ContractError;
use crate::msg::{
    AllowanceResponse, BalanceResponse, ExecuteMsg, InstantiateMsg, 
    QueryMsg, TokenInfoResponse,
};
use crate::state::{TokenInfo, TOKEN_INFO, BALANCES, ALLOWANCES};

#[entry_point]
pub fn instantiate (
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
 ) -> Result<Response, ContractError> {
    let owner = msg.owner.as_deref().or(Some(info.sender.as_str()));
    cw_ownable::initialize_owner(deps.storage, deps.api, owner)?;

    let zero = Uint128::zero();

    let token_info = TokenInfo {
        name: msg.name,
        symbol: msg.symbol,
        decimals: msg.decimals,
        total_supply: zero,
    };

    TOKEN_INFO.save(deps.storage, &token_info)?;

    Ok(Response::new()
        .add_attribute("action", "instatiate")
        .add_attribute("owner", info.sender)
    )
}

#[entry_point]
pub fn execute (
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Transfer {recipient, amount} => {
            execute_tranfer(deps, info, recipient, amount)
        }
        ExecuteMsg::Burn {amount} => {
            execute_burn(deps, info, amount)
        }
        ExecuteMsg::Mint {recipient, amount} => {
            execute_mint(deps, info, recipient, amount)
        }
        ExecuteMsg::Approve{spender, amount} => {
            execute_approve(deps, info, spender, amount)
        }
        ExecuteMsg::TransferFrom{owner, recipient, amount} => {
            execute_tranfer_from(deps, info, owner, recipient, amount)
        }
        ExecuteMsg::UpdateOwnership(action) => {
            cw_ownable::update_ownership(deps, &env.block, &info.sender, action)?;
            Ok(Response::new().add_attribute("action", "update_ownership"))
        }
    }
}

#[entry_point]
pub fn query (
    deps: Deps,
    _env: Env,
    msg: QueryMsg,
) -> StdResult<Binary> {
    match msg {
        QueryMsg::Balance{address} => {
            let addr = deps.api.addr_validate(&address)?;
            let balance = BALANCES.may_load(deps.storage, &addr)?.unwrap_or_default();
            to_json_binary(&BalanceResponse{balance})
        }
        QueryMsg::Allowance{owner, spender} => {
            let owner = deps.api.addr_validate(&owner)?;
            let spender = deps.api.addr_validate(&spender)?;
            let allowance = ALLOWANCES.may_load(deps.storage, (&owner, &spender))?.unwrap_or_default();
            to_json_binary(&AllowanceResponse{allowance})
        }
        QueryMsg::TokenInfo{} => {
            let info = TOKEN_INFO.load(deps.storage)?;
            to_json_binary(&TokenInfoResponse{
                name: info.name,
                symbol: info.symbol,
                decimals: info.decimals,
                total_supply: info.total_supply,
            })
        }
        QueryMsg::Ownership {} => {
            to_json_binary(&cw_ownable::get_ownership(deps.storage)?)
        }
    }
}

pub fn execute_tranfer(
    deps: DepsMut,
    info: MessageInfo,
    recipient: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let rcpt = deps.api.addr_validate(&recipient)?;
    
    BALANCES.update(deps.storage, &info.sender, |bal| -> StdResult<_> {
        let bal = bal.unwrap_or_default();
        bal.checked_sub(amount)
            .map_err(|_| StdError::generic_err("Insufficient balance"))
    })?;

    BALANCES.update(deps.storage, &rcpt, |bal| -> StdResult<_> {
        Ok(bal.unwrap_or_default() + amount)
    })?;

    Ok(Response::new()
        .add_attribute("action", "transfer")
        .add_attribute("from", info.sender)
        .add_attribute("to", rcpt)
        .add_attribute("amount", amount))
}

pub fn execute_burn(
    deps: DepsMut,
    info: MessageInfo,
    amount: Uint128,
) ->Result<Response, ContractError> {
    BALANCES.update(deps.storage, &info.sender, |bal| -> StdResult<_> {
        let bal = bal.unwrap_or_default();
        bal.checked_sub(amount)
            .map_err(|_| StdError::generic_err("Insufficient balance"))
    })?;

    TOKEN_INFO.update(deps.storage, |mut info| -> StdResult<_> {
        info.total_supply = info.total_supply.checked_sub(amount)?;
        Ok(info)
    })?;

    Ok(Response::new()
        .add_attribute("action", "burn")
        .add_attribute("from", info.sender)
        .add_attribute("amount", amount))
}

pub fn execute_mint(
    deps: DepsMut,
    info: MessageInfo,
    recipient: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    cw_ownable::assert_owner(deps.storage, &info.sender)?;

    let rcpt = deps.api.addr_validate(&recipient)?;

    BALANCES.update(deps.storage, &rcpt, |bal| -> StdResult <_> {
        Ok(bal.unwrap_or_default() + amount)
    })?;

    TOKEN_INFO.update(deps.storage, |mut info| -> StdResult<_> {
        info.total_supply += amount;
        Ok(info)
    })?;

    Ok(Response::new()
        .add_attribute("action", "mint")
        .add_attribute("to", recipient)
        .add_attribute("amount", amount))
}

pub fn execute_approve(
    deps: DepsMut,
    info: MessageInfo,
    spender: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let addr = deps.api.addr_validate(&spender)?;

    ALLOWANCES.save(deps.storage, (&info.sender, &addr), &amount)?;

    Ok(Response::new()
        .add_attribute("action", "approve")
        .add_attribute("owner", info.sender)
        .add_attribute("spender", spender)
        .add_attribute("amount", amount))
}

pub fn execute_tranfer_from(
    deps: DepsMut,
    info: MessageInfo,
    owner: String,
    recipient: String,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let owner_addr = deps.api.addr_validate(&owner)?;
    let rcpt_addr = deps.api.addr_validate(&recipient)?;

    let allowance = ALLOWANCES.may_load(deps.storage, (&owner_addr, &info.sender))?.unwrap_or_default();

    if allowance < amount {
        return Err(ContractError::InsufficientAllowance {});
    }

    ALLOWANCES.save(deps.storage, (&owner_addr, &info.sender), &(allowance-amount))?;

    BALANCES.update(deps.storage, &owner_addr, |bal| -> StdResult<_> {
        let bal = bal.unwrap_or_default();
        bal.checked_sub(amount)
            .map_err(|_| StdError::generic_err("Insufficient balance"))
    })?;

    BALANCES.update(deps.storage, &rcpt_addr, |bal| -> StdResult<_>{
        Ok(bal.unwrap_or_default() + amount)
    })?;

    Ok(Response::new()
        .add_attribute("action", "transferFrom")
        .add_attribute("owner", owner)
        .add_attribute("recipient", recipient)
        .add_attribute("amount", amount))
}