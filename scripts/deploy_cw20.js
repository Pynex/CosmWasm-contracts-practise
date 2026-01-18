// Скрипт для деплоя базового cw20 контракта

const fs = require("fs");
const path = require("path");
const { TextEncoder } = require("util");

const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningStargateClient, GasPrice } = require("@cosmjs/stargate");
const { stringToPath } = require("@cosmjs/crypto");
const Long = require("long");
const {
  MsgStoreCode,
  MsgInstantiateContract,
} = require("cosmjs-types/cosmwasm/wasm/v1/tx");

const RPC_ENDPOINT = "http://206.189.115.37:26657/";
const BECH32_PREFIX = "axm";

// Пробуем сначала standart_cw20, потом cw20
const WASM_PATHS = [
  path.join(__dirname, "..", "standart_cw20", "artifacts", "standart_cw20.wasm"),
  path.join(__dirname, "..", "cw20", "artifacts", "cw20.wasm"),
];

const encoder = new TextEncoder();

async function connect(
  mnemonic,
  rpcEndpoint,
  gasPriceStr = "1.5uaxm",
  gasAdjustment = 1.8
) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [stringToPath("m/44'/546'/0'/0/0")],
    prefix: BECH32_PREFIX,
  });

  const [account] = await wallet.getAccounts();
  const sender = account.address;
  console.log("Wallet address:", sender);

  const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet, {
    gasPrice: GasPrice.fromString(gasPriceStr),
    gasAdjustment,
  });

  console.log("Connected to RPC:", rpcEndpoint);

  client.registry.register("/cosmwasm.wasm.v1.MsgStoreCode", MsgStoreCode);
  client.registry.register(
    "/cosmwasm.wasm.v1.MsgInstantiateContract",
    MsgInstantiateContract
  );

  return { client, wallet, sender };
}

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Установи переменную окружения MNEMONIC с 24 словами.");
  }

  const { client, sender } = await connect(mnemonic, RPC_ENDPOINT, "1.5uaxm", 1.8);

  // Находим первый доступный wasm файл
  let wasmPath = null;
  for (const path of WASM_PATHS) {
    if (fs.existsSync(path)) {
      wasmPath = path;
      console.log(`Using WASM file: ${path}`);
      break;
    }
  }

  if (!wasmPath) {
    throw new Error(`WASM файл не найден. Проверьте пути: ${WASM_PATHS.join(", ")}`);
  }

  const wasm = fs.readFileSync(wasmPath);
  console.log("WASM size (bytes):", wasm.length);

  const storeMsg = {
    typeUrl: "/cosmwasm.wasm.v1.MsgStoreCode",
    value: MsgStoreCode.fromPartial({
      sender,
      wasmByteCode: wasm,
    }),
  };

  console.log("Storing code...");
  const storeResult = await client.signAndBroadcast(
    sender,
    [storeMsg],
    "auto",
    "store cw20"
  );

  if (storeResult.code !== 0) {
    console.error("❌ Store failed!");
    console.error("Error:", storeResult.rawLog);
    console.error("Transaction hash:", storeResult.transactionHash);
    process.exit(1);
  }

  console.log("✅ Code stored successfully!");
  console.log("Transaction hash:", storeResult.transactionHash);

  if (!storeResult.logs || storeResult.logs.length === 0) {
    console.error("❌ No logs in store transaction");
    console.error("Full result:", JSON.stringify(storeResult, null, 2));
    process.exit(1);
  }

  const storeLog = storeResult.logs[0];
  if (!storeLog || !storeLog.events) {
    console.error("❌ No events in store log");
    console.error("Log:", JSON.stringify(storeLog, null, 2));
    process.exit(1);
  }

  const storeCodeEvent = storeLog.events.find((e) => e.type === "store_code");
  if (!storeCodeEvent) {
    console.error("❌ store_code event not found");
    console.error("Available events:", storeLog.events.map((e) => e.type));
    process.exit(1);
  }

  const codeIdAttr = storeCodeEvent.attributes.find(
    (a) => a.key === "code_id"
  );
  if (!codeIdAttr) {
    console.error("❌ code_id attribute not found");
    console.error("Available attributes:", storeCodeEvent.attributes.map((a) => a.key));
    process.exit(1);
  }

  const codeId = Number(codeIdAttr.value);
  console.log("Code ID:", codeId);

  // Instantiate message для cw20
  const initMsg = {
    name: "Test Token",
    symbol: "TEST",
    decimals: 6,
    initial_balances: [
      {
        address: sender,
        amount: "1000000000", // 1000 tokens with 6 decimals
      },
    ],
    mint: {
      minter: sender,
    },
  };

  const label = "cw20_test_token";

  const instMsg = {
    typeUrl: "/cosmwasm.wasm.v1.MsgInstantiateContract",
    value: MsgInstantiateContract.fromPartial({
      sender,
      admin: "",
      codeId: Long.fromNumber(codeId),
      label,
      msg: encoder.encode(JSON.stringify(initMsg)),
      funds: [],
    }),
  };

  console.log("Instantiating contract...");
  const instResult = await client.signAndBroadcast(
    sender,
    [instMsg],
    "auto",
    "instantiate cw20"
  );

  if (instResult.code !== 0) {
    console.error("Instantiate failed:", instResult.rawLog);
    console.error("Transaction hash:", instResult.transactionHash);
    process.exit(1);
  }

  const instLog = instResult.logs[0];
  const instEvent = instLog.events.find((e) => e.type === "instantiate");
  const addrAttr =
    instEvent.attributes.find((a) => a.key === "_contract_address") ||
    instEvent.attributes.find((a) => a.key === "contract_address");

  console.log("✅ Deployment successful!");
  console.log("Code ID:", codeId);
  console.log("Contract address:", addrAttr.value);
  console.log("Transaction hash:", instResult.transactionHash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
