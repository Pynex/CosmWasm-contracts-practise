#!/bin/bash
# Скрипт для оптимизации WASM файла через Docker (cosmwasm-optimizer)

set -e

WASM_INPUT="target/wasm32-unknown-unknown/release/check_balance.wasm"
ARTIFACTS_DIR="artifacts"

echo "Оптимизация WASM файла через Docker..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "Ошибка: Docker не найден!"
    echo "Установите Docker: https://www.docker.com/get-started"
    exit 1
fi

# Создаем директорию artifacts если её нет
mkdir -p "$ARTIFACTS_DIR"

# Используем cosmwasm-optimizer через Docker
# Версия 0.16.0 поддерживает CosmWasm 1.x и удаляет bulk memory operations
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/workspace-optimizer:0.16.0

echo "✅ WASM файл оптимизирован через Docker"
echo "Проверьте файл в artifacts/"
