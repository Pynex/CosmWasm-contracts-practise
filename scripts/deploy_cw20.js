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

  // Находим последний code ID, созданный нашим адресом
  let codeId = null;
  for (let i = 100; i >= 1; i--) {
    try {
      const codeInfo = await client.queryClient.wasm.getCodeInfo(i);
      if (codeInfo?.creator === sender) {
        codeId = i;
        break;
      }
    } catch (e) {
      // Code ID не существует
    }
  }

  if (!codeId) {
    console.error("❌ Could not find code ID");
    process.exit(1);
  }

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
    console.error("❌ Instantiate failed!");
    console.error("Error:", instResult.rawLog);
    console.error("Transaction hash:", instResult.transactionHash);
    process.exit(1);
  }

  // Извлекаем адрес контракта
  let contractAddress = null;
  if (instResult.logs?.[0]?.events) {
    const instEvent = instResult.logs[0].events.find((e) => e.type === "instantiate");
    const addrAttr = instEvent?.attributes?.find(
      (a) => a.key === "_contract_address" || a.key === "contract_address"
    );
    if (addrAttr) {
      contractAddress = addrAttr.value;
    }
  }

  if (!contractAddress) {
    console.error("❌ Could not extract contract address");
    console.error("Transaction hash:", instResult.transactionHash);
    process.exit(1);
  }

  console.log("✅ Contract instantiated successfully!");
  console.log("Contract address:", contractAddress);
  console.log("Transaction hash:", instResult.transactionHash);

  // Тестовый перевод токенов
  const testRecipient = "axm18xn4vtfkqwusvn02hglfuu3xcm549nd7js9ww5";
  const transferAmount = "100000000"; // 100 tokens with 6 decimals

  console.log("");
  console.log("Sending test transfer...");
  console.log(`  From: ${sender}`);
  console.log(`  To: ${testRecipient}`);
  console.log(`  Amount: ${transferAmount}`);

  try {
    const transferMsg = {
      transfer: {
        recipient: testRecipient,
        amount: transferAmount,
      },
    };

    const transferResult = await client.execute(
      sender,
      contractAddress,
      transferMsg,
      "auto",
      "test transfer"
    );

    if (transferResult.code !== 0) {
      console.error("⚠️  Transfer failed:", transferResult.rawLog);
    } else {
      console.log("✅ Transfer successful!");
      console.log("Transaction hash:", transferResult.transactionHash);
    }
  } catch (error) {
    console.error("⚠️  Transfer error:", error.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
