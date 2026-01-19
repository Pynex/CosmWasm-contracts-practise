// Скрипт для проверки RPC endpoint

const http = require("http");

const RPC_ENDPOINT = "http://api-docs.axiomeinfo.org:26657";

async function testRPC() {
  console.log("Testing RPC endpoint:", RPC_ENDPOINT);
  console.log("");

  // Тест 1: Проверка статуса
  console.log("1. Testing status endpoint...");
  try {
    const statusResult = await rpcCall("status", {});
    console.log("✅ Status OK");
    console.log("   Node info:", statusResult.node_info?.network || "unknown");
    console.log("   Latest block:", statusResult.sync_info?.latest_block_height || "unknown");
    console.log("");
  } catch (error) {
    console.error("❌ Status failed:", error.message);
    console.log("");
  }

  // Тест 2: Проверка abci_info
  console.log("2. Testing abci_info endpoint...");
  try {
    const abciResult = await rpcCall("abci_info", {});
    console.log("✅ ABCI Info OK");
    console.log("   Version:", abciResult.response?.version || "unknown");
    console.log("");
  } catch (error) {
    console.error("❌ ABCI Info failed:", error.message);
    console.log("");
  }

  // Тест 3: Проверка через CosmJS
  console.log("3. Testing via CosmJS...");
  try {
    const { SigningStargateClient } = require("@cosmjs/stargate");
    const client = await SigningStargateClient.connect(RPC_ENDPOINT);
    const chainId = await client.getChainId();
    console.log("✅ CosmJS connection OK");
    console.log("   Chain ID:", chainId);
    console.log("");
  } catch (error) {
    console.error("❌ CosmJS connection failed:", error.message);
    console.log("");
  }
}

function rpcCall(method, params) {
  return new Promise((resolve, reject) => {
    const url = new URL(RPC_ENDPOINT);
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: method,
      params: params,
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || "RPC error"));
          } else {
            resolve(json.result);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`Request error: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

testRPC().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
