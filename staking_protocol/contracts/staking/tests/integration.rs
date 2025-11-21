use cosmwasm_std::{Addr, Empty, Uint128};
use cw_multi_test::{App, ContractWrapper, Executor};

use staking::msg::{ConfigResponse, InstantiateMsg, QueryMsg, TotalStakedResponse, StakeResponse};
use cw20_token::msg::BalanceResponse;

use crate::test_utils::TestSetup;

fn cw20_contract() -> Box<dyn cw_multi_test::Contract<Empty>> {
    let contract = ContractWrapper::new(
        cw20_token::contract::execute,
        cw20_token::contract::instantiate,
        cw20_token::contract::query,
    );
    Box::new(contract)
}

fn staking_contract() -> Box<dyn cw_multi_test::Contract<Empty>> {
    let contract = ContractWrapper::new(
        staking::contract::execute,
        staking::contract::instantiate,
        staking::contract::query,
    );
    Box::new(contract)
}

mod test_utils {

    use super::*;

    pub struct TestSetup {
        pub app: App,
        pub staking_addr: Addr,
        pub token_addr: Addr,
        pub owner: String,
        pub user1: String,
        pub apr: u64,
        pub period: u64,
    }

    impl TestSetup {
        pub fn new() -> Self {
            let mut app = App::default();
            // let owner = Addr::unchecked("owner");
            // let user1 = Addr::unchecked("user1");
            // let user2 = Addr::unchecked("user2");

            let owner = "owner".to_string();
            let user1 = "user1".to_string();

            let apr = 1000;
            let period = 60 * 60 * 24 * 30;

            let cw20_code_id = app.store_code(cw20_contract());
            let token_addr = app
                .instantiate_contract(
                    cw20_code_id,
                    Addr::unchecked("owner"),
                    &cw20_token::msg::InstantiateMsg {
                        name: "Test Token".to_string(),
                        symbol: "TST".to_string(),
                        decimals: 18,
                        minter: Some("owner".to_string()),
                    },
                    &[],
                    "Test Token",
                    None,
                )
                .unwrap();

            let staking_code_id = app.store_code(staking_contract());
            let staking_addr = app
                .instantiate_contract(
                    staking_code_id,
                    Addr::unchecked("owner"),
                    &InstantiateMsg {
                        owner: "owner".to_string(),
                        token_address: token_addr.to_string(),
                        reward_rate: apr,
                        lockup_period: period,
                    },
                    &[],
                    "Staking contract",
                    None,
                )
                .unwrap();

            TestSetup {
                app,
                staking_addr,
                token_addr,
                owner,
                user1,
                apr,
                period,
            }
        }

        pub fn mint_tokens(&mut self, recipient: &str, amount: Uint128) {
            self.app
                .execute_contract(
                    Addr::unchecked(&self.owner),
                    self.token_addr.clone(),
                    &cw20_token::msg::ExecuteMsg::Mint {
                        recipient: recipient.to_string(),
                        amount: amount,
                    },
                    &[],
                )
                .unwrap();
        }

        pub fn approve_tokens(&mut self, owner: &str, spender: &Addr, amount: Uint128) {
            self.app
                .execute_contract(
                    Addr::unchecked(owner),
                    self.token_addr.clone(),
                    &cw20_token::msg::ExecuteMsg::Approve {
                        spender: spender.to_string(),
                        amount: amount,
                    },
                    &[],
                )
                .unwrap();
        }

        pub fn stake(&mut self, user: &str, amount: Uint128) {
            self.app
                .execute_contract(
                    Addr::unchecked(user),
                    self.staking_addr.clone(),
                    &staking::msg::ExecuteMsg::Stake { amount: amount },
                    &[],
                )
                .unwrap();
        }

        pub fn change_config(&mut self, user: &str, apr: u64, lockup_period: u64) {
            self.app
                .execute_contract(
                    Addr::unchecked(user),
                    self.staking_addr.clone(),
                    &staking::msg::ExecuteMsg::ChangeConfig {
                        new_apr: apr,
                        new_lockup_period: lockup_period,
                    },
                    &[],
                )
                .unwrap();
        }

        pub fn unstake(&mut self, user: &str, amount: Uint128) {
            self.app
                .execute_contract(
                    Addr::unchecked(user),
                    self.staking_addr.clone(),
                    &staking::msg::ExecuteMsg::Unstake {
                        amount: amount,
                    },
                    &[],
                )
                .unwrap();
        }

        pub fn claim_rewards(&mut self, user: &str) {
            self.app
                .execute_contract(
                    Addr::unchecked(user),
                    self.staking_addr.clone(),
                    &staking::msg::ExecuteMsg::ClaimRewards {},
                    &[],
                ).unwrap();
        }

        pub fn set_staking_contract_minter(&mut self) {
            self.app
                .execute_contract(
                    self.get_owner_addr(),
                    self.token_addr.clone(),
                    &cw20_token::msg::ExecuteMsg::UpdateMinter {
                        new_minter: Some(self.staking_addr.to_string()),
                    },
                    &[],
                ).unwrap();
        }

        pub fn advance_time(&mut self, seconds: u64) {
            self.app.update_block(|block| {
                block.time = block.time.plus_seconds(seconds);
                block.height+=1;
            });
        }

        // pub fn staking_addr_str(&self) -> String {
        //     self.staking_addr.to_string()
        // }

        // pub fn token_addr_str(&self) -> String {
        //     self.token_addr.to_string()
        // }

        pub fn get_owner_addr(&self) -> Addr {
            Addr::unchecked(&self.owner)
        }

        // pub fn get_user1_addr(&self) -> Addr {
        //     Addr::unchecked(&self.user1)
        // }

        // pub fn get_user2_addr(&self) -> Addr {
        //     Addr::unchecked(&self.user2)
        // }
    }
}

#[test]

fn test_proper_initialization() {
    let setup = TestSetup::new();

    let config: ConfigResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::Config {})
        .unwrap();

    assert_eq!(config.apr, setup.apr);
    assert_eq!(config.lockup_period, setup.period);
    assert_eq!(config.token_address, setup.token_addr.to_string());

    let total_staked: TotalStakedResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::TotalStaked {})
        .unwrap();

    assert_eq!(total_staked.total, Uint128::zero());
}

#[test]
fn test_successful_stake() {
    let mut setup = TestSetup::new();
    let staked_amount = Uint128::from(100000u128);
    let staking_addr = setup.staking_addr.clone();

    setup.mint_tokens("user1", staked_amount);
    setup.approve_tokens("user1", &staking_addr, staked_amount);
    setup.stake("user1", staked_amount);

    let staked_info: StakeResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::Stake {
            address: setup.user1.clone(),
        })
        .unwrap();

    let total_staked_after: TotalStakedResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::TotalStaked {})
        .unwrap();

    let user1_balance_after: BalanceResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.token_addr, &cw20_token::msg::QueryMsg::Balance {
            address: setup.user1.clone(),
        })
        .unwrap();

    let staking_balance_after: BalanceResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.token_addr, &cw20_token::msg::QueryMsg::Balance {
            address: setup.staking_addr.to_string(),
        })
        .unwrap();

    assert_eq!(staked_info.amount, staked_amount);
    assert_eq!(staked_amount, total_staked_after.total);
    assert_eq!(user1_balance_after.balance, Uint128::zero());
    assert_eq!(staking_balance_after.balance, staked_amount);
}


#[test]
pub fn test_successful_unstake_after_lockup() {
    let mut setup = TestSetup::new();
    let staked_amount = Uint128::from(100000u128);
    let staking_addr = setup.staking_addr.clone();

    setup.mint_tokens("user1", staked_amount);
    setup.approve_tokens("user1", &staking_addr, staked_amount);
    setup.stake("user1", staked_amount);
    setup.set_staking_contract_minter();

    let config: ConfigResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::Config {})
        .unwrap();

    setup.advance_time(config.lockup_period);

    setup.unstake("user1", staked_amount);

    let user_balance_after_unstake: BalanceResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.token_addr, &cw20_token::msg::QueryMsg::Balance {
            address: setup.user1.clone(),
        })
        .unwrap();

    let staking_balance_after_unstake: BalanceResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.token_addr, &cw20_token::msg::QueryMsg::Balance {
            address: setup.staking_addr.to_string(),
        })
        .unwrap();

    let total_staked_after: TotalStakedResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::TotalStaked {})
        .unwrap();

    const SECONDS_PER_YEAR: u64 = 365 * 24 * 60 * 60;

    let stake = staked_amount.u128();
    let rate = config.apr as u128;
    let time = config.lockup_period as u128;
    let expected_reward = stake
        .checked_mul(rate).unwrap()
        .checked_mul(time).unwrap()
        .checked_div(10_000).unwrap()
        .checked_div(SECONDS_PER_YEAR as u128).unwrap();

    assert_eq!(user_balance_after_unstake.balance, Uint128::from(expected_reward + stake));
    assert_eq!(staking_balance_after_unstake.balance, Uint128::zero());
    assert_eq!(total_staked_after.total, Uint128::zero());
}

#[test]
pub fn test_successful_clain_rewards() {
    let mut setup = TestSetup::new();
    let staked_amount = Uint128::from(100000u128);
    let staking_addr = setup.staking_addr.clone();

    setup.mint_tokens("user1", staked_amount);
    setup.approve_tokens("user1", &staking_addr, staked_amount);
    setup.stake("user1", staked_amount);
    setup.set_staking_contract_minter();

    let config: ConfigResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::Config {})
        .unwrap();

    setup.advance_time(config.lockup_period);
    setup.claim_rewards("user1");
    let time_after_claiming = setup.app.block_info().time.seconds();

    let total_staked_after: TotalStakedResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::TotalStaked {})
        .unwrap();

    let user_balance_after_claim_rewards: BalanceResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.token_addr, &cw20_token::msg::QueryMsg::Balance {
            address: setup.user1.clone(),
        })
        .unwrap();

    let staked_info: StakeResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::Stake {
            address: setup.user1.clone(),
        })
        .unwrap();

    const SECONDS_PER_YEAR: u64 = 365 * 24 * 60 * 60;
    let stake = staked_amount.u128();
    let rate = config.apr as u128;
    let time = config.lockup_period as u128;
    let expected_reward = stake
        .checked_mul(rate).unwrap()
        .checked_mul(time).unwrap()
        .checked_div(10_000).unwrap()
        .checked_div(SECONDS_PER_YEAR as u128).unwrap();

    assert_eq!(total_staked_after.total, staked_amount);
    assert_eq!(user_balance_after_claim_rewards.balance, Uint128::from(expected_reward));
    assert_eq!(staked_info.amount, staked_amount);
    assert_eq!(staked_info.stake_time, time_after_claiming);
}

#[test]
pub fn test_successful_change_config() {
    let mut setup = TestSetup::new();
    let new_apr = setup.apr*2;
    let new_lockup_period = setup.period*2;

    setup.change_config(&setup.owner.clone(), new_apr, new_lockup_period);

    let config: ConfigResponse = setup.app
        .wrap()
        .query_wasm_smart(&setup.staking_addr, &QueryMsg::Config {})
        .unwrap();

    assert_eq!(config.apr, new_apr);
    assert_eq!(config.lockup_period, new_lockup_period);
}
