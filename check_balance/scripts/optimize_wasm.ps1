# PowerShell скрипт для оптимизации WASM файла на Windows

$WASM_INPUT = "target\wasm32-unknown-unknown\release\check_balance.wasm"
$WASM_OUTPUT = "artifacts\check_balance.wasm"

Write-Host "Оптимизация WASM файла..." -ForegroundColor Cyan

# Проверяем наличие wasm-opt
$wasmOpt = Get-Command wasm-opt -ErrorAction SilentlyContinue
if (-not $wasmOpt) {
    Write-Host "Ошибка: wasm-opt не найден!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Установите wasm-opt одним из способов:" -ForegroundColor Yellow
    Write-Host "1. Скачайте binaryen с https://github.com/WebAssembly/binaryen/releases"
    Write-Host "2. Распакуйте и добавьте bin/ в PATH"
    Write-Host "3. Или используйте Docker: docker run --rm -v ${PWD}:/code cosmwasm/workspace-optimizer:0.16.0"
    exit 1
}

# Создаем директорию artifacts если её нет
if (-not (Test-Path "artifacts")) {
    New-Item -ItemType Directory -Path "artifacts" | Out-Null
}

# Оптимизируем WASM файл
Write-Host "Запуск wasm-opt..." -ForegroundColor Cyan
& wasm-opt --disable-bulk-memory -Oz --strip-debug $WASM_INPUT -o $WASM_OUTPUT

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $WASM_OUTPUT).Length / 1KB
    Write-Host "✅ WASM файл оптимизирован: $WASM_OUTPUT" -ForegroundColor Green
    Write-Host "Размер файла: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Green
} else {
    Write-Host "Ошибка при оптимизации!" -ForegroundColor Red
    exit 1
}
