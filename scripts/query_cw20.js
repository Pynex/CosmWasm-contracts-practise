// Скрипт для получения информации о cw20 контракте

const { SigningStargateClient, GasPrice } = require("@cosmjs/stargate");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { stringToPath } = require("@cosmjs/crypto");

const RPC_ENDPOINT = "http://api-docs.axiomeinfo.org:26657";
const BECH32_PREFIX = "axm";

async function connect(mnemonic, rpcEndpoint) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [stringToPath("m/44'/546'/0'/0/0")],
    prefix: BECH32_PREFIX,
  });

  const [account] = await wallet.getAccounts();
  const sender = account.address;

  const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet, {
    gasPrice: GasPrice.fromString("1.5uaxm"),
  });

  return { client, sender };
}

async function queryContract(client, contractAddress, queryMsg) {
  const queryBytes = Buffer.from(JSON.stringify(queryMsg));
  const result = await client.queryContractSmart(contractAddress, queryBytes);
  return result;
}

async function main() {
  const contractAddress = process.argv[2];
  const queryType = process.argv[3] || "info";

  if (!contractAddress) {
    console.error("Использование: node scripts/query_cw20.js <contract_address> [query_type]");
    console.error("Query types: info, balance, allowance");
    console.error("Примеры:");
    console.error("  node scripts/query_cw20.js axm1... info");
    console.error("  node scripts/query_cw20.js axm1... balance axm1...");
    console.error("  node scripts/query_cw20.js axm1... allowance <owner> <spender>");
    process.exit(1);
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Установи переменную окружения MNEMONIC с 24 словами.");
  }

  const { client, sender } = await connect(mnemonic, RPC_ENDPOINT);
  console.log("Connected to RPC:", RPC_ENDPOINT);
  console.log("Querying contract:", contractAddress);
  console.log("");

  try {
    switch (queryType) {
      case "info": {
        const result = await queryContract(client, contractAddress, {
          token_info: {},
        });
        console.log("📊 Token Info:");
        console.log("  Name:", result.name);
        console.log("  Symbol:", result.symbol);
        console.log("  Decimals:", result.decimals);
        console.log("  Total Supply:", result.total_supply);
        break;
      }

      case "balance": {
        const address = process.argv[4] || sender;
        const result = await queryContract(client, contractAddress, {
          balance: { address },
        });
        console.log(`💰 Balance for ${address}:`);
        console.log("  Amount:", result.balance);
        break;
      }

      case "allowance": {
        const owner = process.argv[4];
        const spender = process.argv[5];
        if (!owner || !spender) {
          console.error("Для allowance нужны owner и spender:");
          console.error("  node scripts/query_cw20.js <contract> allowance <owner> <spender>");
          process.exit(1);
        }
        const result = await queryContract(client, contractAddress, {
          allowance: { owner, spender },
        });
        console.log(`🔐 Allowance from ${owner} to ${spender}:`);
        console.log("  Amount:", result.allowance);
        break;
      }

      default:
        console.error(`Неизвестный тип запроса: ${queryType}`);
        console.error("Доступные типы: info, balance, allowance");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Query failed:");
    console.error(error.message);
    if (error.message.includes("not found")) {
      console.error("\nВозможно, контракт еще не инстанцирован или адрес неверный.");
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
