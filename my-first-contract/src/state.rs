use cw_storage_plus::Item;

pub const COUNT: Item<i32> = Item::new("count");

// #[cw_serde]
// pub struct Config {
//     pub owner: Addr,
// }

// pub const CONFIG: Item<Config> = Item::new("config");