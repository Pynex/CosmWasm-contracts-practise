// Простой скрипт для проверки версии Node.js
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

console.log(`Node.js version: ${nodeVersion}`);

if (majorVersion < 20) {
  console.error("\n❌ Требуется Node.js версии 20 или выше!");
  console.error("Обновите Node.js одним из способов:");
  console.error("  1. Через nvm: nvm install 20 && nvm use 20");
  console.error("  2. Скачайте с https://nodejs.org/");
  process.exit(1);
} else {
  console.log("✅ Версия Node.js подходит");
}
