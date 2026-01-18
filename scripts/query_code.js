// Скрипт для получения информации о code ID

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
    console.error("Использование: node scripts/query_code.js <code_id>");
    console.error("Пример: node scripts/query_code.js 1");
    process.exit(1);
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Установи переменную окружения MNEMONIC с 24 словами.");
  }

  const client = await connect(mnemonic, RPC_ENDPOINT);
  console.log("Connected to RPC:", RPC_ENDPOINT);
  console.log("Querying code ID:", codeId);
  console.log("");

  try {
    // Получаем информацию о коде
    const codeInfo = await client.queryClient.wasm.getCodeInfo(Number(codeId));
    console.log("📦 Code Info:");
    console.log("  Code ID:", codeId);
    console.log("  Creator:", codeInfo.creator);
    console.log("  Code Hash:", codeInfo.data_hash);
    console.log("");

    // Пытаемся получить список контрактов (если поддерживается)
    try {
      const contracts = await client.queryClient.wasm.listContractsByCodeId(Number(codeId));
      console.log("📋 Instances:");
      if (contracts && contracts.length > 0) {
        contracts.forEach((contract, i) => {
          console.log(`  ${i + 1}. ${contract}`);
        });
      } else {
        console.log("  (нет инстанцированных контрактов)");
      }
    } catch (err) {
      console.log("  (не удалось получить список контрактов)");
    }
  } catch (error) {
    console.error("❌ Query failed:");
    console.error(error.message);
    if (error.message.includes("not found")) {
      console.error(`\nCode ID ${codeId} не найден.`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
