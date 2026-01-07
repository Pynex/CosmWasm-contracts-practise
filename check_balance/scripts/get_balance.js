// Простой скрипт: подключиться к Axiome RPC и получить баланс кошелька в uaxm

const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { stringToPath } = require("@cosmjs/crypto");
const { SigningStargateClient, GasPrice } = require("@cosmjs/stargate");

const RPC_ENDPOINT = "http://206.189.115.37:26657/";
const BECH32_PREFIX = "axm";
const HD_PATH = "m/44'/546'/0'/0/0";
const GAS_PRICE = GasPrice.fromString("1.5uaxm");

async function connect(mnemonic, rpcEndpoint, gasPrice = GAS_PRICE) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [stringToPath(HD_PATH)],
    prefix: BECH32_PREFIX,
  });

  const [account] = await wallet.getAccounts();
  const sender = account.address;
  console.log("Wallet address:", sender);

  const stargate = await SigningStargateClient.connectWithSigner(
    rpcEndpoint,
    wallet,
    { gasPrice }
  );

  console.log("Connected to RPC:", rpcEndpoint);
  return { stargate, wallet, sender };
}

async function main() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Установи переменную окружения MNEMONIC с 24 словами.");
  }

  const { stargate, sender } = await connect(mnemonic, RPC_ENDPOINT);

  const balance = await stargate.getBalance(sender, "uaxm");
  console.log("Balance:", balance);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


