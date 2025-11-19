use cosmwasm_std::{Addr, Empty, Uint128};
use cw_multi_test::{App, ContractWrapper, Executor};

use staking::msg::{ConfigResponse, ExecuteMsg, InstantiateMsg, QueryMsg, TotalStakedResponse};

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
    use cw20_token::msg::ExecuteMsg;

    use super::*;

    pub struct TestSetup {
        pub app: App,
        pub staking_addr: Addr,
        pub token_addr: Addr,
        pub owner: String,
        pub user1: String,
        pub user2: String,
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
            let user2 = "user2".to_string();

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
                user2,
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

        pub fn advance_time(&mut self, seconds: u64) {
            self.app.update_block(|block| {
                block.time = block.time.plus_seconds(seconds);
                block.height+=1;
            });
        }

        pub fn staking_addr_str(&self) -> String {
            self.staking_addr.to_string()
        }

        pub fn token_addr_str(&self) -> String {
            self.token_addr.to_string()
        }

        pub fn get_owner_addr(&self) -> Addr {
            Addr::unchecked(&self.owner)
        }

        pub fn get_user1_addr(&self) -> Addr {
            Addr::unchecked(&self.user1)
        }

        pub fn get_user2_addr(&self) -> Addr {
            Addr::unchecked(&self.user2)
        }
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

fn test_successful_stake() {
    let mut setup = TestSetup::new();
    let staked_amount = Uint128::from(100000u128);
    let staking_addr = setup.staking_addr.clone();

    setup.mint_tokens("user1", staked_amount);
    setup.approve_tokens("user1", &staking_addr, staked_amount);
    setup.stake("user1", staked_amount);

    
}
