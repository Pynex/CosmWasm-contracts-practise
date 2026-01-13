# GitHub Actions для деплоя контрактов

## Настройка секретов

Для работы workflow необходимо добавить секрет в настройках репозитория:

1. Перейдите в Settings → Secrets and variables → Actions
2. Нажмите "New repository secret"
3. Добавьте секрет с именем `MNEMONIC` и значением - ваш мнемоник из 24 слов

⚠️ **Важно**: Никогда не коммитьте мнемоник в репозиторий! Используйте только GitHub Secrets.

## Доступные Workflows

### 1. Deploy CW20 Contract (полный цикл)

**Файл**: `.github/workflows/deploy-cw20.yml`

**Что делает**:

1. Собирает контракт из исходников
2. Оптимизирует WASM с флагом `--disable-bulk-memory`
3. Деплоит контракт в сеть Axiome
4. Сохраняет артефакты

**Когда запускается**:

- Автоматически при push в `main` (если изменены файлы контракта)
- Вручную через Actions → Deploy CW20 Contract → Run workflow

**Время выполнения**: ~5-10 минут

### 2. Deploy CW20 (Simple) - быстрый деплой

**Файл**: `.github/workflows/deploy-cw20-simple.yml`

**Что делает**:

- Использует уже собранный WASM из `standart_cw20/artifacts/`
- Только деплой (без сборки)

**Когда использовать**:

- Если WASM уже собран и закоммичен
- Для быстрого повторного деплоя

**Время выполнения**: ~2-3 минуты

## Запуск деплоя

### Ручной запуск

1. Перейдите в раздел **Actions** в GitHub
2. Выберите нужный workflow:
   - "Deploy CW20 Contract" - полный цикл
   - "Deploy CW20 (Simple)" - быстрый деплой
3. Нажмите **"Run workflow"**
4. Выберите ветку (обычно `main`)
5. Нажмите **"Run workflow"**

### Автоматический запуск

Workflow `deploy-cw20.yml` автоматически запускается при:

- Push в ветку `main` с изменениями в:
  - `standart_cw20/**`
  - `scripts/deploy_cw20.js`
  - `.github/workflows/deploy-cw20.yml`

## Результаты деплоя

После успешного деплоя в логах будет:

```
✅ Code stored successfully!
Transaction hash: <hash>
Code ID: <number>
✅ Deployment successful!
Contract address: <address>
Transaction hash: <hash>
```

## Преимущества деплоя через GitHub Actions

✅ **Обход сетевых проблем**: GitHub Actions имеет стабильное подключение  
✅ **Автоматизация**: Можно настроить автоматический деплой при изменениях  
✅ **Безопасность**: Мнемоник хранится в секретах, не в коде  
✅ **Логирование**: Все действия логируются в GitHub  
✅ **Артефакты**: Оптимизированный WASM сохраняется для скачивания

## Устранение проблем

### Ошибка "MNEMONIC not found"

- Убедитесь, что секрет `MNEMONIC` добавлен в Settings → Secrets

### Ошибка "WASM file not found" (Simple workflow)

- Используйте полный workflow `deploy-cw20.yml` для сборки
- Или закоммитьте `standart_cw20/artifacts/standart_cw20.wasm`

### Ошибка подключения к RPC

- GitHub Actions обычно имеет лучшее подключение, чем локально
- Проверьте, что RPC endpoint доступен: `http://206.189.115.37:26657/`

### Ошибка "Bulk memory operations"

- Убедитесь, что используется оптимизация с `--disable-bulk-memory`
- Проверьте версии CosmWasm в `Cargo.toml` (должны быть 1.x)
