# ==============================================================================
# Script de Prueba - Migraciones de Prisma (PowerShell)
# ==============================================================================
# Verifica que las migraciones se apliquen correctamente en Docker
#
# Uso:
#   .\scripts\test-migrations.ps1
#
# Requisitos:
#   - Docker Desktop instalado
#   - docker-compose.yml configurado correctamente

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🔍 Test de Migraciones de Prisma - vehicles-svc" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Limpiar contenedores y volúmenes anteriores
Write-Host "[1/5] Limpiando contenedores y volúmenes anteriores..." -ForegroundColor Yellow
docker-compose down -v 2>$null
Write-Host "✓ Limpieza completa" -ForegroundColor Green
Write-Host ""

# 2. Construir imagen del servicio
Write-Host "[2/5] Construyendo imagen vehicles-svc..." -ForegroundColor Yellow
docker-compose build vehicles-svc
Write-Host "✓ Imagen construida" -ForegroundColor Green
Write-Host ""

# 3. Iniciar solo la base de datos
Write-Host "[3/5] Iniciando base de datos vehicles-db..." -ForegroundColor Yellow
docker-compose up -d vehicles-db
Write-Host "   Esperando a que PostgreSQL esté listo..." -ForegroundColor Gray

$dbReady = $false
$attempts = 0
$maxAttempts = 30

while (-not $dbReady -and $attempts -lt $maxAttempts) {
    $result = docker-compose exec -T vehicles-db pg_isready -U postgres -d vehicles 2>$null
    if ($result -match "accepting connections") {
        $dbReady = $true
    } else {
        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 1
        $attempts++
    }
}

if ($dbReady) {
    Write-Host ""
    Write-Host "✓ Base de datos lista" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✗ Timeout esperando a la base de datos" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Iniciar servicio (aplicará migraciones automáticamente)
Write-Host "[4/5] Iniciando vehicles-svc (aplicará migraciones)..." -ForegroundColor Yellow
docker-compose up -d vehicles-svc

Write-Host "   Esperando a que el servicio aplique migraciones..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Capturar logs de migraciones
$migrateLogs = docker-compose logs vehicles-svc | Select-String "prisma migrate" -Context 0,20

if ($migrateLogs -match "migrations have been successfully applied") {
    Write-Host "✓ Migraciones aplicadas correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Logs de migración:" -ForegroundColor Cyan
    Write-Host "-------------------"
    docker-compose logs vehicles-svc | Select-String "prisma" | Select-Object -Last 15
    Write-Host "-------------------"
} else {
    Write-Host "✗ Error al aplicar migraciones" -ForegroundColor Red
    Write-Host ""
    Write-Host "Logs del servicio:" -ForegroundColor Cyan
    docker-compose logs vehicles-svc
    exit 1
}
Write-Host ""

# 5. Verificar tablas en la base de datos
Write-Host "[5/5] Verificando tablas creadas..." -ForegroundColor Yellow

$tables = docker-compose exec -T vehicles-db psql -U postgres -d vehicles -c "\dt" -t | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }

$expectedTables = @(
    "_prisma_migrations",
    "vehicle_models",
    "model_engine_specs",
    "model_license_requirements",
    "vehicle_units",
    "unit_consumption_specs",
    "unit_license_requirements",
    "idempotency_keys"
)

$missingTables = @()

foreach ($table in $expectedTables) {
    if ($tables -match $table) {
        Write-Host "   ✓ Tabla encontrada: $table" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Tabla faltante: $table" -ForegroundColor Red
        $missingTables += $table
    }
}

Write-Host ""

# 6. Verificar migraciones registradas
Write-Host "🔍 Verificando migraciones registradas en _prisma_migrations..." -ForegroundColor Cyan
$migrations = docker-compose exec -T vehicles-db psql -U postgres -d vehicles -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;" -t 2>$null

if ($migrations) {
    Write-Host $migrations
} else {
    Write-Host "✗ No se encontraron registros en _prisma_migrations" -ForegroundColor Red
}

Write-Host ""

# Resumen final
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

if ($missingTables.Count -eq 0) {
    Write-Host "✅ ÉXITO: Todas las migraciones se aplicaron correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Estadísticas:" -ForegroundColor Cyan
    Write-Host "   - Tablas creadas: $($tables.Count)"
    Write-Host "   - Migraciones aplicadas: $(($migrations -split "`n").Count)"
    Write-Host ""
    Write-Host "🎯 Siguiente paso:" -ForegroundColor Cyan
    Write-Host "   Ejecuta 'docker-compose logs -f vehicles-svc' para ver logs en vivo"
    Write-Host ""
    exit 0
} else {
    Write-Host "❌ ERROR: Faltan tablas en la base de datos" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tablas faltantes:" -ForegroundColor Yellow
    foreach ($table in $missingTables) {
        Write-Host "   - $table"
    }
    Write-Host ""
    Write-Host "🔍 Para debug, ejecuta:" -ForegroundColor Cyan
    Write-Host "   docker-compose logs vehicles-svc"
    Write-Host "   docker-compose exec vehicles-db psql -U postgres -d vehicles"
    Write-Host ""
    exit 1
}

