# Быстрое решение проблемы с bulk memory operations

## Проблема

```
Error: Bulk memory operation detected: MemoryCopy { dst_mem: 0, src_mem: 0 }.
Bulk memory operations are not supported.
```

## Решение (выберите один вариант)

### Вариант 1: Установить wasm-opt и оптимизировать

**Windows:**

1. Скачайте binaryen: https://github.com/WebAssembly/binaryen/releases
2. Распакуйте архив (например, в `C:\binaryen`)
3. Добавьте `C:\binaryen\bin` в PATH
4. Перезапустите терминал
5. Выполните:
   ```bash
   wasm-opt --disable-bulk-memory -Oz --strip-debug target/wasm32-unknown-unknown/release/check_balance.wasm -o artifacts/check_balance.wasm
   ```

**Или используйте скрипт:**

```bash
# Bash (MSYS2/Git Bash)
bash scripts/optimize_wasm.sh

# PowerShell
powershell scripts/optimize_wasm.ps1

# Node.js (если установлен wasm-opt через npm)
npm run optimize
```

### Вариант 2: Использовать Docker

1. Запустите Docker Desktop
2. Выполните:
   ```bash
   docker run --rm -v "$(pwd)":/code --mount type=volume,source="check_balance_cache",target=/code/target --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry cosmwasm/workspace-optimizer:0.16.0
   ```

Или используйте скрипт:

```bash
bash scripts/optimize_wasm_docker.sh
```

### Вариант 3: Использовать онлайн-оптимизатор

Если нет возможности установить инструменты локально, можно использовать онлайн-сервисы для оптимизации WASM (но это менее безопасно).

## После оптимизации

Проверьте, что файл создан:

```bash
ls -lh artifacts/check_balance.wasm
```

Затем запустите деплой:

```bash
MNEMONIC='ваша мнемоника' node scripts/deploy_check_balance.js
```

## Примечание

Оптимизированный WASM файл будет меньше по размеру и не будет содержать bulk memory operations, что необходимо для совместимости со старыми версиями CosmWasm.
