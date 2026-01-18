// Скрипт для получения code ID из transaction hash

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
  const txHash = process.argv[2];

  if (!txHash) {
    console.error("Использование: node scripts/get_code_from_tx.js <transaction_hash>");
    console.error("Пример: node scripts/get_code_from_tx.js D6F3E2A7D882BD4BF6925223A0CC6C82E013A84A73636765429A046035A6392A");
    process.exit(1);
  }

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Установи переменную окружения MNEMONIC с 24 словами.");
  }

  const client = await connect(mnemonic, RPC_ENDPOINT);
  console.log("Connected to RPC:", RPC_ENDPOINT);
  console.log("Querying transaction:", txHash);
  console.log("");

  try {
    const tx = await client.getTx(txHash);

    if (!tx) {
      console.error("❌ Transaction not found");
      process.exit(1);
    }

    console.log("📋 Transaction Info:");
    console.log("  Height:", tx.height);
    console.log("  Code:", tx.code);
    console.log("");

    if (tx.code !== 0) {
      console.error("❌ Transaction failed with code:", tx.code);
      console.error("Raw log:", tx.rawLog);
      process.exit(1);
    }

    let codeId = null;
    let contractAddress = null;

    if (tx.logs && tx.logs.length > 0) {
      for (const log of tx.logs) {
        if (log.events) {
          for (const event of log.events) {
            if (event.type === "store_code" && event.attributes) {
              for (const attr of event.attributes) {
                if (attr.key === "code_id" || attr.key === "codeId") {
                  codeId = Number(attr.value);
                }
              }
            }
            if (event.type === "instantiate" && event.attributes) {
              for (const attr of event.attributes) {
                if (attr.key === "_contract_address" || attr.key === "contract_address") {
                  contractAddress = attr.value;
                }
              }
            }
          }
        }
      }
    }

    // Если не нашли в events, пробуем парсить rawLog
    if (!codeId && tx.rawLog) {
      try {
        const rawLogParsed = typeof tx.rawLog === 'string' ? JSON.parse(tx.rawLog) : tx.rawLog;
        if (Array.isArray(rawLogParsed)) {
          for (const log of rawLogParsed) {
            if (log.events) {
              for (const event of log.events) {
                if (event.type === "store_code" && event.attributes) {
                  for (const attr of event.attributes) {
                    if (attr.key === "code_id" || attr.key === "codeId" || attr.key === "code.id") {
                      codeId = Number(attr.value);
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }

    if (codeId) {
      console.log("✅ Code ID:", codeId);
    } else {
      console.log("⚠️  Code ID not found in transaction");
      console.log("");
      console.log("Debug info:");
      console.log("  Logs count:", tx.logs?.length || 0);
      if (tx.logs && tx.logs.length > 0) {
        console.log("  Events in first log:", tx.logs[0].events?.map(e => e.type).join(", ") || "none");
        if (tx.logs[0].events) {
          for (const event of tx.logs[0].events) {
            if (event.type === "store_code") {
              console.log("  store_code event attributes:", event.attributes?.map(a => `${a.key}=${a.value}`).join(", ") || "none");
            }
          }
        }
      }
    }

    if (contractAddress) {
      console.log("✅ Contract Address:", contractAddress);
    } else {
      console.log("ℹ️  Contract not instantiated in this transaction");
    }

    // Если есть code ID, получаем список контрактов
    if (codeId) {
      try {
        const contracts = await client.queryClient.wasm.listContractsByCodeId(codeId);
        if (contracts && contracts.length > 0) {
          console.log("");
          console.log("📋 Instances from this code ID:");
          contracts.forEach((contract, i) => {
            console.log(`  ${i + 1}. ${contract}`);
          });
        }
      } catch (err) {
        // Игнорируем ошибки получения списка контрактов
      }
    }

  } catch (error) {
    console.error("❌ Query failed:");
    console.error(error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
