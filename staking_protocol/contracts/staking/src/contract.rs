use cosmwasm_std::{Binary, Deps, DepsMut, Env, MessageInfo, Response, entry_point, to_json_binary, Uint128, StdResult, WasmMsg, CosmosMsg};
use cw20::Cw20ExecuteMsg;
use cw_ownable::initialize_owner;
use crate::msg::{
    ConfigResponse, ExecuteMsg, InstantiateMsg, QueryMsg, 
    RewardResponse, StakeResponse, TotalStakedResponse,
};
use crate::error::ContractError;
use crate::state::{Config, StakeInfo, CONFIG, STAKES, TOTAL_STAKED};

#[entry_point]
pub fn instantiate (
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    initialize_owner(deps.storage, deps.api, &msg.owner)?;
    let token = deps.api.addr_validate(&msg.token_address)?;

    let config = Config{
        token_address: token,
        apr: msg.reward_rate,
        lockup_period: msg.lockup_period,
    };

    CONFIG.save(deps.storage, &config)?;

    TOTAL_STAKED.save(deps.storage, &Uint128::zero())?;

    Ok(Response::new()
        .add_attribute("action", "instantiate"))
}

#[entry_point]
pub fn execute (
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::UpdateOwnership(action) => {
            cw_ownable::update_ownership(deps, &env.block, &info.sender, action)?;
            Ok(Response::new().add_attribute("action", "update_ownership"))
        }
        ExecuteMsg::Stake {amount} => {
            execute_stake(deps, env, info, amount)
        }
        ExecuteMsg::Unstake {amount} => {
            execute_unstake(deps, env, info, amount)
        }
        ExecuteMsg::ClaimRewards {} => {
            execute_claim_rewards(deps, env, info)
        }
        ExecuteMsg::ChangeConfig { new_apr, new_lockup_period } => {
            execute_change_config(deps, info, new_apr, new_lockup_period)
        }
    }
}

#[entry_point]
pub fn query (
    deps: Deps,
    env: Env,
    msg: QueryMsg,
) -> StdResult<Binary> {
    match msg {
        QueryMsg::Ownership {} => {
            to_json_binary(&cw_ownable::get_ownership(deps.storage)?)
        }
        QueryMsg::Stake{address} => to_json_binary(&query_stake(deps, env, address)?),
        QueryMsg::Config{} => to_json_binary(&query_config(deps)?),
        QueryMsg::Reward {address} => to_json_binary(&query_reward(deps, env, address)?),
        QueryMsg::TotalStaked {} => to_json_binary(&query_total_staked(deps)?),
    }
}

pub fn execute_stake(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    let transfer_msg = CosmosMsg::Wasm(WasmMsg:: Execute {
        contract_addr: config.token_address.to_string(),
        msg: to_json_binary(&Cw20ExecuteMsg::TransferFrom{
            owner: info.sender.to_string(),
            recipient: env.contract.address.to_string(),
            amount,
        })?,
        funds: vec![],
    });

    STAKES.update(deps.storage, &info.sender, |stake| -> StdResult<_> {
        match stake {
            Some(mut s) => {
                s.amount += amount;
                Ok(s)
            }
            None => Ok(StakeInfo {
                amount: amount,
                stake_time: env.block.time,
            }),
        }
    })?;

    TOTAL_STAKED.update(deps.storage, |total| -> StdResult<_> {
        Ok(total + amount)
    })?;

    Ok(Response::new()
        .add_message(transfer_msg)
        .add_attribute("action", "stake")
        .add_attribute("from", info.sender)
        .add_attribute("amount", amount))
}

pub fn execute_unstake(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    amount: Uint128,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let stake_info = STAKES.load(deps.storage, &info.sender)?;

    if stake_info.amount < amount{
        return Err(ContractError::InsufficientStake {});
    }

    let staked_time = env.block.time.seconds() - stake_info.stake_time.seconds();
    if staked_time < config.lockup_period {
        return Err(ContractError::LockupNotExpired {});
    }

    let reward_amount = calculate_reward_apr(stake_info.amount, staked_time, config.apr);
    let mut messages = vec![];

    if !reward_amount.is_zero() {
        messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr: config.token_address.to_string(),
            msg: to_json_binary(&Cw20ExecuteMsg::Mint { 
                recipient: info.sender.to_string(),
                amount: reward_amount,
            })?,
            funds: vec![],
        }));
    }

    messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: config.token_address.to_string(),
        msg: to_json_binary(&Cw20ExecuteMsg::Transfer {
            recipient: info.sender.to_string(),
            amount: amount,
        })?,
        funds: vec![],
    }));

    let staking_remain = stake_info.amount - amount;
    if staking_remain.is_zero() {
        STAKES.remove(deps.storage, &info.sender);
    } else {
        STAKES.save(deps.storage, &info.sender, &StakeInfo {
            amount: staking_remain,
            stake_time: env.block.time,
        })?;
    }

    TOTAL_STAKED.update(deps.storage, |total| -> StdResult<_> {
        Ok(total.checked_sub(amount)?)
    })?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "unstake")
        .add_attribute("to", info.sender)
        .add_attribute("amount", amount)
        .add_attribute("reward", reward_amount))
}

pub fn execute_claim_rewards(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let stake_info = STAKES.load(deps.storage, &info.sender)?;

    let staked_time = env.block.time.seconds() - stake_info.stake_time.seconds();
    if staked_time < config.lockup_period {
        return Err(ContractError::LockupNotExpired {});
    }

    let reward_amount = calculate_reward_apr(stake_info.amount, staked_time, config.apr);
    if reward_amount.is_zero() {
        return Err(ContractError::ZeroReward {});
    }

    STAKES.save(deps.storage, &info.sender, &StakeInfo{
        amount: stake_info.amount,
        stake_time: env.block.time,
    })?;

    let msg = CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: config.token_address.to_string(),
        msg: to_json_binary(&Cw20ExecuteMsg::Mint { 
            recipient: info.sender.to_string(),
            amount: reward_amount,
        })?,
        funds: vec![],
    });

    Ok(Response::new()
        .add_message(msg)
        .add_attribute("action", "claim_rewards")
        .add_attribute("to", info.sender)
        .add_attribute("reward", reward_amount))
}


pub fn execute_change_config(
    deps: DepsMut,
    info: MessageInfo,
    new_apr: u64,
    new_lockup_period: u64,
) -> Result<Response, ContractError> {
    cw_ownable::assert_owner(deps.storage, &info.sender)?;
    let curr_config = CONFIG.load(deps.storage)?;

    let config = Config {
        token_address: curr_config.token_address,
        apr: new_apr,
        lockup_period: new_lockup_period,
    };

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("action", "change_config")
        .add_attribute("new_apr", new_apr.to_string())
        .add_attribute("new_lockup_period", new_lockup_period.to_string()))
}

fn calculate_reward_apr(stake_amount: Uint128, staked_seconds: u64, annual_rate_bps: u64) -> Uint128 {
    if stake_amount.is_zero() || staked_seconds == 0 || annual_rate_bps == 0 {
        return Uint128::zero();
    }

    const SECONDS_PER_YEAR: u64 = 365 * 24 * 60 * 60;
    
    let stake = stake_amount.u128();
    let rate = annual_rate_bps as u128;
    let time = staked_seconds as u128;
    
    let reward = stake
        .checked_mul(rate).unwrap()
        .checked_mul(time).unwrap()
        .checked_div(10_000).unwrap()
        .checked_div(SECONDS_PER_YEAR as u128).unwrap();
    
    Uint128::from(reward)
}

fn query_config(
    deps: Deps,
) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        token_address: config.token_address.to_string(),
        apr: config.apr,
        lockup_period: config.lockup_period,
    })
}

fn query_reward(
    deps: Deps,
    env: Env,
    address: String,
) -> StdResult<RewardResponse> {
    let addr = deps.api.addr_validate(&address)?;
    let config = CONFIG.load(deps.storage)?;
    let stake_info = STAKES.may_load(deps.storage, &addr)?;

    let rewards = match stake_info {
        Some(s) => {
            let staked_time = env.block.time.seconds() - s.stake_time.seconds();
            calculate_reward_apr(s.amount, staked_time, config.apr)
        }
        None => Uint128::zero()
    };

    Ok(RewardResponse{
        amount: rewards,
    })
}

fn query_stake(
    deps: Deps,
    _env: Env,
    address: String
) -> StdResult<StakeResponse> {
    let addr = deps.api.addr_validate(&address)?;
    let stake_info = STAKES.may_load(deps.storage, &addr)?;

    match stake_info {
        Some(s) => Ok(StakeResponse {
            amount: s.amount,
            stake_time: s.stake_time.seconds(),
        }),
        None => Ok(StakeResponse {
            amount: Uint128::zero(),
            stake_time: 0,
        })
    }
}

fn query_total_staked(
    deps: Deps
) -> StdResult<TotalStakedResponse> {
    Ok(TotalStakedResponse{
        total: TOTAL_STAKED.load(deps.storage)?,
    })
}