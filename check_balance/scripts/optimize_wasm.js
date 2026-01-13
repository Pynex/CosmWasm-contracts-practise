// Node.js скрипт для оптимизации WASM через wasm-opt (если установлен через npm)

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const WASM_INPUT = path.join(__dirname, "..", "target", "wasm32-unknown-unknown", "release", "check_balance.wasm");
const WASM_OUTPUT = path.join(__dirname, "..", "artifacts", "check_balance.wasm");

console.log("Оптимизация WASM файла...");

// Проверяем наличие wasm-opt
try {
  execSync("wasm-opt --version", { stdio: "ignore" });
} catch (error) {
  console.error("Ошибка: wasm-opt не найден!");
  console.log("");
  console.log("Установите wasm-opt:");
  console.log("  npm install -g wasm-opt");
  console.log("");
  console.log("Или используйте Docker скрипт: scripts/optimize_wasm_docker.sh");
  process.exit(1);
}

// Создаем директорию artifacts если её нет
const artifactsDir = path.dirname(WASM_OUTPUT);
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

// Оптимизируем WASM файл
try {
  execSync(
    `wasm-opt --disable-bulk-memory -Oz --strip-debug "${WASM_INPUT}" -o "${WASM_OUTPUT}"`,
    { stdio: "inherit" }
  );
  
  const stats = fs.statSync(WASM_OUTPUT);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`✅ WASM файл оптимизирован: ${WASM_OUTPUT}`);
  console.log(`Размер файла: ${sizeKB} KB`);
} catch (error) {
  console.error("Ошибка при оптимизации:", error.message);
  process.exit(1);
}
