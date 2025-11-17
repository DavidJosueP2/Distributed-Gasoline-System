#!/bin/bash

# =========================================================
# Script Bash para inicializar la base de datos
# =========================================================
# Este script ejecuta init.sql y opcionalmente seed.sql
# Uso: ./scripts/init-db.sh [--with-seed]
# =========================================================

set -e

WITH_SEED=false

# Parsear argumentos
for arg in "$@"; do
  case $arg in
    --with-seed)
      WITH_SEED=true
      shift
      ;;
  esac
done

echo "🔧 Cargando variables de entorno..."

# Cargar .env de la raíz del proyecto
ROOT_ENV_PATH="$(dirname "$0")/../../../.env"
SERVICE_ENV_PATH="$(dirname "$0")/../.env"

# Función para cargar .env
load_env() {
  local env_path=$1
  if [ -f "$env_path" ]; then
    echo "   ✓ Cargando desde: $env_path"
    export $(grep -v '^#' "$env_path" | grep -v '^$' | xargs)
  fi
}

# Cargar primero el .env de la raíz, luego el del servicio (sobrescribe)
load_env "$ROOT_ENV_PATH"
load_env "$SERVICE_ENV_PATH"

# Leer variables de entorno con valores por defecto
DB_HOST=${DRIVER_DB_HOST:-localhost}
DB_PORT=${DRIVER_DB_PORT:-5432}
DB_USER=${DRIVER_DB_USER:-postgres}
DB_PASS=${DRIVER_DB_PASS:-root}
DB_NAME=${DRIVER_DB_NAME:-drivers}

echo ""
echo "📊 Configuración de la base de datos:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo ""

# Verificar que psql está disponible
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql no está instalado o no está en el PATH"
    echo "   Instala PostgreSQL client tools"
    exit 1
fi

# Establecer password para psql
export PGPASSWORD=$DB_PASS

# Ruta a los archivos SQL
SCRIPT_DIR="$(dirname "$0")"
INIT_SQL_PATH="$SCRIPT_DIR/../init.sql"
SEED_SQL_PATH="$SCRIPT_DIR/../seed.sql"

# Ejecutar init.sql
echo "🚀 Ejecutando init.sql..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$INIT_SQL_PATH"

if [ $? -ne 0 ]; then
    echo "❌ Error al ejecutar init.sql"
    exit 1
fi

echo "✅ init.sql ejecutado correctamente"

# Ejecutar seed.sql si se especifica
if [ "$WITH_SEED" = true ]; then
    echo ""
    echo "🌱 Ejecutando seed.sql..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEED_SQL_PATH"

    if [ $? -ne 0 ]; then
        echo "❌ Error al ejecutar seed.sql"
        exit 1
    fi

    echo "✅ seed.sql ejecutado correctamente"
fi

echo ""
echo "🎉 Base de datos inicializada correctamente!"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Verificar las tablas: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\\dt'"
echo "   2. Ejecutar migraciones TypeORM: npm run typeorm:migrate"
echo "   3. Ver estado de migraciones: npm run typeorm:show"
echo ""

