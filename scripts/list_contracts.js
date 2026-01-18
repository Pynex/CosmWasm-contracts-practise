// Скрипт для получения списка всех инстанцированных контрактов по code ID

const { SigningStargateClient, GasPrice } = require("@cosmjs/stargate");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { stringToPath } = require("@cosmjs/crypto");

const RPC_ENDPOINT = "http://206.189.115.37:26657/";
const BECH32_PREFIX = "axm";

async function connect(mnemonic, rpcEndpoint) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [stringToPath("m/44'/546'/0'/0/0")],
    prefix: BECH32_PREFIX,
  });

  const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet, {
    gasPrice: GasPrice.fromString("1.5uaxm"),
  });

  return client;
}

async function main() {
  const codeId = process.argv[2];

  if (!codeId) {
    console.error("Использование: node scripts/list_contracts.js <code_id>");
    console.error("Пример: node scripts/list_contracts.js 1");
    process.exit(1);
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Установи переменную окружения MNEMONIC с 24 словами.");
  }

  const client = await connect(mnemonic, RPC_ENDPOINT);
  console.log("Connected to RPC:", RPC_ENDPOINT);
  console.log("Querying contracts for code ID:", codeId);
  console.log("");

  try {
    const contracts = await client.queryClient.wasm.listContractsByCodeId(Number(codeId));

    if (contracts && contracts.length > 0) {
      console.log(`📋 Found ${contracts.length} contract(s):`);
      console.log("");
      contracts.forEach((contract, i) => {
        console.log(`  ${i + 1}. ${contract}`);
      });
      console.log("");
      console.log("To query a contract, use:");
      console.log(`  node scripts/query_cw20.js ${contracts[0]} info`);
    } else {
      console.log("ℹ️  No contracts instantiated from this code ID yet");
    }
  } catch (error) {
    console.error("❌ Query failed:");
    console.error(error.message);
    if (error.message.includes("not found")) {
      console.error(`\nCode ID ${codeId} may not exist or the query method is not supported.`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
