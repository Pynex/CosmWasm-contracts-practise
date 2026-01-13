# Инструкция по оптимизации WASM файла

Проблема: WASM файл содержит bulk memory operations, которые не поддерживаются версией CosmWasm на блокчейне.

## Решение 1: Использование wasm-opt (рекомендуется)

### Установка wasm-opt

**Windows:**
1. Скачайте binaryen с https://github.com/WebAssembly/binaryen/releases
2. Распакуйте и добавьте в PATH
3. Или используйте через npm: `npm install -g wasm-opt`

**Linux/Mac:**
```bash
# Через npm
npm install -g wasm-opt

# Или через пакетный менеджер
# Ubuntu/Debian:
sudo apt-get install binaryen

# macOS:
brew install binaryen
```

### Оптимизация

После установки wasm-opt выполните:

```bash
# Вариант 1: Использовать bash скрипт
bash scripts/optimize_wasm.sh

# Вариант 2: Использовать Node.js скрипт
node scripts/optimize_wasm.js

# Вариант 3: Вручную
wasm-opt --disable-bulk-memory -Oz --strip-debug \
  target/wasm32-unknown-unknown/release/check_balance.wasm \
  -o artifacts/check_balance.wasm
```

## Решение 2: Использование Docker (cosmwasm-optimizer)

### Требования
- Docker Desktop должен быть запущен

### Оптимизация

```bash
# Вариант 1: Использовать скрипт
bash scripts/optimize_wasm_docker.sh

# Вариант 2: Вручную
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="check_balance_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/workspace-optimizer:0.16.0
```

После оптимизации файл будет в `artifacts/check_balance.wasm` и готов к деплою.

## Проверка оптимизированного файла

После оптимизации проверьте размер файла:

```bash
ls -lh artifacts/check_balance.wasm
```

Оптимизированный файл должен быть меньше исходного.

## Деплой

После оптимизации запустите деплой:

```bash
MNEMONIC='ваша мнемоника' node scripts/deploy_check_balance.js
```
