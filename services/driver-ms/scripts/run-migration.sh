#!/bin/bash

# Script para ejecutar migraciones SQL en el servicio de drivers
# Uso: ./scripts/run-migration.sh [nombre-migracion.sql]

set -e

# Variables de entorno con valores por defecto
POSTGRES_HOST=${DRIVER_DB_HOST:-localhost}
POSTGRES_PORT=${DRIVER_DB_PORT:-5432}
POSTGRES_USER=${DRIVER_DB_USER:-postgres}
POSTGRES_DB=${DRIVER_DB_NAME:-driver_db}

echo "🔧 Ejecutando migraciones para Driver Service"
echo "   Host: $POSTGRES_HOST"
echo "   Port: $POSTGRES_PORT"
echo "   Database: $POSTGRES_DB"
echo "   User: $POSTGRES_USER"
echo ""

MIGRATION_DIR="$(dirname "$0")/../migrations"

if [ -n "$1" ]; then
  # Ejecutar una migración específica
  MIGRATION_FILE="$MIGRATION_DIR/$1"
  if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migración no encontrada: $MIGRATION_FILE"
    exit 1
  fi
  
  echo "📦 Ejecutando migración: $1"
  PGPASSWORD=$DRIVER_DB_PASS psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f "$MIGRATION_FILE"
  echo "✅ Migración ejecutada exitosamente"
else
  # Ejecutar todas las migraciones en orden
  echo "📦 Ejecutando todas las migraciones..."
  
  for migration in "$MIGRATION_DIR"/*.sql; do
    if [ -f "$migration" ]; then
      filename=$(basename "$migration")
      echo "   → $filename"
      PGPASSWORD=$DRIVER_DB_PASS psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f "$migration"
    fi
  done
  
  echo "✅ Todas las migraciones ejecutadas exitosamente"
fi

