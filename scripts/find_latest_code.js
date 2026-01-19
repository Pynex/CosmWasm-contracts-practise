// Скрипт для поиска последнего code ID, созданного нашим адресом

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

async function main() {
  const maxCodeId = parseInt(process.argv[2]) || 100;

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Установи переменную окружения MNEMONIC с 24 словами.");
  }

  const { client, sender } = await connect(mnemonic, RPC_ENDPOINT);
  console.log("Connected to RPC:", RPC_ENDPOINT);
  console.log("Searching for code IDs created by:", sender);
  console.log("Checking code IDs 1 to", maxCodeId);
  console.log("");

  const foundCodes = [];

  for (let i = 1; i <= maxCodeId; i++) {
    try {
      const codeInfo = await client.queryClient.wasm.getCodeInfo(i);
      if (codeInfo && codeInfo.creator === sender) {
        foundCodes.push({
          codeId: i,
          creator: codeInfo.creator,
          dataHash: codeInfo.data_hash,
        });
        process.stdout.write(`\rFound code ID ${i}...`);
      }
    } catch (e) {
      // Code ID не существует, продолжаем
    }
  }

  console.log("\n");

  if (foundCodes.length > 0) {
    console.log(`✅ Found ${foundCodes.length} code ID(s) created by your address:`);
    console.log("");
    foundCodes.forEach((code, i) => {
      console.log(`  ${i + 1}. Code ID: ${code.codeId}`);
      console.log(`     Hash: ${code.dataHash}`);
    });
    console.log("");
    console.log("Latest code ID:", foundCodes[foundCodes.length - 1].codeId);
    console.log("");
    console.log("To list contracts from latest code ID:");
    console.log(`  node scripts/list_contracts.js ${foundCodes[foundCodes.length - 1].codeId}`);
  } else {
    console.log("ℹ️  No code IDs found created by your address");
    console.log("Make sure you've deployed a contract first");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
