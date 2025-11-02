#!/bin/sh
set -e

echo "🚀 Starting Driver Service..."

# La aplicación iniciará y TypeORM creará las tablas automáticamente
# Ejecutamos el seed después (es idempotente con ON CONFLICT DO NOTHING)
(
  # Esperar 10 segundos para que TypeORM cree las tablas
  sleep 10
  echo "🌱 Seeding database..."
  PGPASSWORD="${DRIVER_DB_PASS}" psql \
    -h "${DRIVER_DB_HOST}" \
    -p "${DRIVER_DB_PORT}" \
    -U "${DRIVER_DB_USER}" \
    -d "${DRIVER_DB_NAME}" \
    -f seed.sql \
    && echo "✅ Seed applied successfully!" \
    || echo "⚠️  Seed already applied or error occurred (ignoring)"
) &

# Iniciar la aplicación normalmente
echo "✅ Starting application..."
exec node dist/main.js

