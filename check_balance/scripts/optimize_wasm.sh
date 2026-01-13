#!/bin/bash
# Скрипт для оптимизации WASM файла, удаляющий bulk memory operations

set -e

WASM_INPUT="target/wasm32-unknown-unknown/release/check_balance.wasm"
WASM_OUTPUT="artifacts/check_balance.wasm"

echo "Оптимизация WASM файла..."

# Проверяем наличие wasm-opt
if ! command -v wasm-opt &> /dev/null; then
    echo "Ошибка: wasm-opt не найден!"
    echo ""
    echo "Установите wasm-opt одним из способов:"
    echo "1. Через npm: npm install -g wasm-opt"
    echo "2. Через binaryen (Windows): https://github.com/WebAssembly/binaryen/releases"
    echo "3. Через Docker: docker run --rm -v \$(pwd):/workspace cosmwasm/workspace-optimizer:0.16.0"
    exit 1
fi

# Создаем директорию artifacts если её нет
mkdir -p artifacts

# Оптимизируем WASM файл
# --disable-bulk-memory - отключает bulk memory operations
# -Oz - максимальная оптимизация размера
# --strip-debug - удаляет debug информацию
wasm-opt \
    --disable-bulk-memory \
    -Oz \
    --strip-debug \
    "$WASM_INPUT" \
    -o "$WASM_OUTPUT"

echo "✅ WASM файл оптимизирован: $WASM_OUTPUT"
echo "Размер файла: $(du -h "$WASM_OUTPUT" | cut -f1)"
