// CommonJS-скрипт в стиле примера из how-to-use-with-js:
// используем SigningStargateClient + protobuf MsgStoreCode / MsgInstantiateContract

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

const RPC_ENDPOINT = "http://api-docs.axiomeinfo.org:26657";
const BECH32_PREFIX = "axm";

const WASM_PATH = path.join(__dirname, "..", "artifacts", "check_balance.wasm");

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

  const wasm = fs.readFileSync(WASM_PATH);
  console.log("WASM size (bytes):", wasm.length);

  const storeMsg = {
    typeUrl: "/cosmwasm.wasm.v1.MsgStoreCode",
    value: MsgStoreCode.fromPartial({
      sender,
      wasmByteCode: wasm,
    }),
  };

  const storeResult = await client.signAndBroadcast(
    sender,
    [storeMsg],
    "auto",
    "store check_balance"
  );

  if (storeResult.code !== 0) {
    console.error("Store failed:", storeResult.rawLog);
    process.exit(1);
  }

  const storeLog = storeResult.logs[0];
  const storeCodeEvent = storeLog.events.find((e) => e.type === "store_code");
  const codeIdAttr = storeCodeEvent.attributes.find(
    (a) => a.key === "code_id"
  );
  const codeId = Number(codeIdAttr.value);
  console.log("Code ID:", codeId);

  const initMsg = {};
  const label = "check_balance_uaxm";

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

  const instResult = await client.signAndBroadcast(
    sender,
    [instMsg],
    "auto",
    "instantiate check_balance"
  );

  if (instResult.code !== 0) {
    console.error("Instantiate failed:", instResult.rawLog);
    process.exit(1);
  }

  const instLog = instResult.logs[0];
  const instEvent = instLog.events.find((e) => e.type === "instantiate");
  const addrAttr =
    instEvent.attributes.find((a) => a.key === "_contract_address") ||
    instEvent.attributes.find((a) => a.key === "contract_address");

  console.log("Contract address:", addrAttr.value);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});