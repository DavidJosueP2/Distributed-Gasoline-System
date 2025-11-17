# =========================================================
# Script PowerShell para inicializar la base de datos
# =========================================================
# Este script ejecuta init.sql y opcionalmente seed.sql
# Uso: .\scripts\init-db.ps1 [-WithSeed]
# =========================================================

param(
    [switch]$WithSeed = $false
)

# Cargar variables de entorno desde .env de la raíz
$rootEnvPath = Join-Path $PSScriptRoot "..\..\..\..\.env"
$serviceEnvPath = Join-Path $PSScriptRoot "..\.env"

Write-Host "[*] Cargando variables de entorno..." -ForegroundColor Cyan

# Función para cargar .env
function Load-Env {
    param([string]$envPath)

    if (Test-Path $envPath) {
        Write-Host "   Cargando desde: $envPath" -ForegroundColor Green
        $content = Get-Content $envPath
        foreach ($line in $content) {
            if ($line -match '^\s*([^#][^=]*?)\s*=\s*(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    }
}

# Cargar primero el .env de la raíz, luego el del servicio (sobrescribe)
Load-Env $rootEnvPath
Load-Env $serviceEnvPath

# Leer variables de entorno con valores por defecto
$DB_HOST = if ($env:DRIVER_DB_HOST) { $env:DRIVER_DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DRIVER_DB_PORT) { $env:DRIVER_DB_PORT } else { "5432" }
$DB_USER = if ($env:DRIVER_DB_USER) { $env:DRIVER_DB_USER } else { "postgres" }
$DB_PASS = if ($env:DRIVER_DB_PASS) { $env:DRIVER_DB_PASS } else { "root" }
$DB_NAME = if ($env:DRIVER_DB_NAME) { $env:DRIVER_DB_NAME } else { "drivers" }

Write-Host ""
Write-Host "[*] Configuracion de la base de datos:" -ForegroundColor Yellow
Write-Host "   Host: $DB_HOST"
Write-Host "   Port: $DB_PORT"
Write-Host "   User: $DB_USER"
Write-Host "   Database: $DB_NAME"
Write-Host ""

# Verificar que psql está disponible
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] psql no esta instalado o no esta en el PATH" -ForegroundColor Red
    Write-Host "   Instala PostgreSQL client tools o agrega psql al PATH" -ForegroundColor Yellow
    exit 1
}

# Establecer password para psql
$env:PGPASSWORD = $DB_PASS

# Ruta a los archivos SQL
$initSqlPath = Join-Path $PSScriptRoot "..\init.sql"
$seedSqlPath = Join-Path $PSScriptRoot "..\seed.sql"

# Ejecutar init.sql
Write-Host "[*] Ejecutando init.sql..." -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $initSqlPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error al ejecutar init.sql" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] init.sql ejecutado correctamente" -ForegroundColor Green

# Ejecutar seed.sql si se especifica
if ($WithSeed) {
    Write-Host ""
    Write-Host "[*] Ejecutando seed.sql..." -ForegroundColor Cyan
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $seedSqlPath

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Error al ejecutar seed.sql" -ForegroundColor Red
        exit 1
    }

    Write-Host "[OK] seed.sql ejecutado correctamente" -ForegroundColor Green
}

Write-Host ""
Write-Host "[OK] Base de datos inicializada correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "[*] Proximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Verificar las tablas: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\dt'"
Write-Host "   2. Ejecutar migraciones TypeORM: npm run typeorm:migrate"
Write-Host "   3. Ver estado de migraciones: npm run typeorm:show"
Write-Host ""
