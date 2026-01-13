# Скрипт для оптимизации WASM файла, удаляющий bulk memory operations

$WASM_INPUT = "target\wasm32-unknown-unknown\release\standart_cw20.wasm"
$WASM_OUTPUT = "artifacts\standart_cw20.wasm"

Write-Host "Оптимизация WASM файла..."

# Проверяем наличие wasm-opt
if (-not (Get-Command wasm-opt -ErrorAction SilentlyContinue)) {
    Write-Host "Ошибка: wasm-opt не найден!"
    Write-Host ""
    Write-Host "Установите wasm-opt одним из способов:"
    Write-Host "1. Через npm: npm install -g wasm-opt"
    Write-Host "2. Скачайте binaryen: https://github.com/WebAssembly/binaryen/releases"
    Write-Host "3. Через Docker: docker run --rm -v `$(pwd):/workspace cosmwasm/workspace-optimizer:0.16.0"
    exit 1
}

# Создаем директорию artifacts если её нет
if (-not (Test-Path "artifacts")) {
    New-Item -ItemType Directory -Path "artifacts" | Out-Null
}

# Оптимизируем WASM файл
# --disable-bulk-memory - отключает bulk memory operations
# -Oz - максимальная оптимизация размера
# --strip-debug - удаляет debug информацию
wasm-opt `
    --disable-bulk-memory `
    -Oz `
    --strip-debug `
    $WASM_INPUT `
    -o $WASM_OUTPUT

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $WASM_OUTPUT).Length
    Write-Host "✅ WASM файл оптимизирован: $WASM_OUTPUT"
    Write-Host "Размер файла: $([math]::Round($fileSize / 1KB, 2)) KB"
} else {
    Write-Host "❌ Ошибка при оптимизации WASM файла"
    exit 1
}
