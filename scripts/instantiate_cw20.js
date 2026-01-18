// Скрипт для инстанцирования cw20 контракта по известному code ID

const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningStargateClient, GasPrice } = require("@cosmjs/stargate");
const { stringToPath } = require("@cosmjs/crypto");
const Long = require("long");
const { TextEncoder } = require("util");
const {
  MsgInstantiateContract,
} = require("cosmjs-types/cosmwasm/wasm/v1/tx");

const RPC_ENDPOINT = "http://206.189.115.37:26657/";
const BECH32_PREFIX = "axm";

const encoder = new TextEncoder();

async function connect(mnemonic, rpcEndpoint, gasPriceStr = "1.5uaxm", gasAdjustment = 1.8) {
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

  client.registry.register(
    "/cosmwasm.wasm.v1.MsgInstantiateContract",
    MsgInstantiateContract
  );

  return { client, wallet, sender };
}

async function main() {
  const codeId = parseInt(process.argv[2]) || 27;

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Установи переменную окружения MNEMONIC с 24 словами.");
  }

  const { client, sender } = await connect(mnemonic, RPC_ENDPOINT, "1.5uaxm", 1.8);

  console.log(`Using code ID: ${codeId}`);
  console.log("");

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

  const label = `cw20_test_token_${Date.now()}`;

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
