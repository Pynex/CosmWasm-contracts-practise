// Скрипт для transfer токенов cw20 контракта

const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningStargateClient, GasPrice } = require("@cosmjs/stargate");
const { stringToPath } = require("@cosmjs/crypto");
const { TextEncoder } = require("util");
const {
  MsgExecuteContract,
} = require("cosmjs-types/cosmwasm/wasm/v1/tx");

const RPC_ENDPOINT = "http://api-docs.axiomeinfo.org:26657";
const BECH32_PREFIX = "axm";

// Адрес контракта по умолчанию
const DEFAULT_CONTRACT = "axm16t06swlcmrhq0e27859n2caq3ll2rhdh9rdgpj887v8jfgmgzrdq3l8mwy";

const encoder = new TextEncoder();

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

  client.registry.register(
    "/cosmwasm.wasm.v1.MsgExecuteContract",
    MsgExecuteContract
  );

  return { client, sender };
}

async function main() {
  const contractAddress = process.argv[2] || DEFAULT_CONTRACT;
  const recipient = process.argv[3];
  const amount = process.argv[4];

  if (!recipient || !amount) {
    console.error("Использование: node scripts/transfer_cw20.js [contract_address] <recipient> <amount>");
    console.error("");
    console.error("Примеры:");
    console.error(`  node scripts/transfer_cw20.js ${DEFAULT_CONTRACT} axm18xn4vtfkqwusvn02hglfuu3xcm549nd7js9ww5 100000000`);
    console.error(`  node scripts/transfer_cw20.js axm18xn4vtfkqwusvn02hglfuu3xcm549nd7js9ww5 100000000`);
    console.error("");
    console.error("amount - количество токенов с учетом decimals (6 decimals: 100000000 = 100 токенов)");
    process.exit(1);
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Установи переменную окружения MNEMONIC с 24 словами.");
  }

  const { client, sender } = await connect(mnemonic, RPC_ENDPOINT);
  console.log("Wallet address:", sender);
  console.log("Contract address:", contractAddress);
  console.log("Recipient:", recipient);
  console.log("Amount:", amount);
  console.log("");

  // Проверяем баланс перед переводом
  try {
    const balanceQuery = {
      balance: { address: sender },
    };
    const balanceResult = await client.queryClient.wasm.queryContractSmart(
      contractAddress,
      Buffer.from(JSON.stringify(balanceQuery))
    );
    console.log("Current balance:", balanceResult.balance);
    console.log("");
  } catch (error) {
    console.log("⚠️  Could not check balance:", error.message);
    console.log("");
  }

  // Выполняем transfer
  const transferMsg = {
    transfer: {
      recipient: recipient,
      amount: amount,
    },
  };

  console.log("Sending transfer...");
  const executeMsg = {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: MsgExecuteContract.fromPartial({
      sender,
      contract: contractAddress,
      msg: encoder.encode(JSON.stringify(transferMsg)),
      funds: [],
    }),
  };

  const result = await client.signAndBroadcast(
    sender,
    [executeMsg],
    "auto",
    "transfer cw20 tokens"
  );

  if (result.code !== 0) {
    console.error("❌ Transfer failed!");
    console.error("Error:", result.rawLog);
    console.error("Transaction hash:", result.transactionHash);
    process.exit(1);
  }

  console.log("✅ Transfer successful!");
  console.log("Transaction hash:", result.transactionHash);

  // Проверяем баланс после перевода
  try {
    const balanceQuery = {
      balance: { address: sender },
    };
    const balanceResult = await client.queryContractSmart(
      contractAddress,
      Buffer.from(JSON.stringify(balanceQuery))
    );
    console.log("New balance:", balanceResult.balance);
  } catch (error) {
    // Игнорируем ошибки проверки баланса
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
