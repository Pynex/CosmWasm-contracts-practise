use cosmwasm_std::Addr;
use cw_storage_plus::Item;

/// Адрес того, кто задеплоил (инициализировал) контракт
pub const DEPLOYER: Item<Addr> = Item::new("deployer");
