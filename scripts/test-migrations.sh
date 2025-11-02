#!/bin/bash

# ==============================================================================
# Script de Prueba - Migraciones de Prisma
# ==============================================================================
# Verifica que las migraciones se apliquen correctamente en Docker
#
# Uso:
#   ./scripts/test-migrations.sh
#
# Requisitos:
#   - Docker y Docker Compose instalados
#   - docker-compose.yml configurado correctamente

set -e  # Salir si hay errores

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "🔍 Test de Migraciones de Prisma - vehicles-svc"
echo "=================================================="
echo ""

# 1. Limpiar contenedores y volúmenes anteriores
echo -e "${YELLOW}[1/5]${NC} Limpiando contenedores y volúmenes anteriores..."
docker-compose down -v 2>/dev/null || true
echo -e "${GREEN}✓${NC} Limpieza completa"
echo ""

# 2. Construir imagen del servicio
echo -e "${YELLOW}[2/5]${NC} Construyendo imagen vehicles-svc..."
docker-compose build vehicles-svc
echo -e "${GREEN}✓${NC} Imagen construida"
echo ""

# 3. Iniciar solo la base de datos
echo -e "${YELLOW}[3/5]${NC} Iniciando base de datos vehicles-db..."
docker-compose up -d vehicles-db
echo "   Esperando a que PostgreSQL esté listo..."
until docker-compose exec -T vehicles-db pg_isready -U postgres -d vehicles > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo -e "${GREEN}✓${NC} Base de datos lista"
echo ""

# 4. Iniciar servicio (aplicará migraciones automáticamente)
echo -e "${YELLOW}[4/5]${NC} Iniciando vehicles-svc (aplicará migraciones)..."
docker-compose up -d vehicles-svc

echo "   Esperando a que el servicio aplique migraciones..."
sleep 5

# Capturar logs de migraciones
MIGRATE_LOGS=$(docker-compose logs vehicles-svc | grep -A 20 "prisma migrate" || true)

if echo "$MIGRATE_LOGS" | grep -q "migrations have been successfully applied"; then
  echo -e "${GREEN}✓${NC} Migraciones aplicadas correctamente"
  echo ""
  echo "Logs de migración:"
  echo "-------------------"
  echo "$MIGRATE_LOGS"
  echo "-------------------"
else
  echo -e "${RED}✗${NC} Error al aplicar migraciones"
  echo ""
  echo "Logs del servicio:"
  docker-compose logs vehicles-svc
  exit 1
fi
echo ""

# 5. Verificar tablas en la base de datos
echo -e "${YELLOW}[5/5]${NC} Verificando tablas creadas..."

TABLES=$(docker-compose exec -T vehicles-db psql -U postgres -d vehicles -c "\dt" -t | awk '{print $3}' | grep -v '^$' || true)

EXPECTED_TABLES=(
  "_prisma_migrations"
  "vehicle_models"
  "model_engine_specs"
  "model_license_requirements"
  "vehicle_units"
  "unit_consumption_specs"
  "unit_license_requirements"
  "idempotency_keys"
)

MISSING_TABLES=()

for table in "${EXPECTED_TABLES[@]}"; do
  if echo "$TABLES" | grep -q "$table"; then
    echo -e "   ${GREEN}✓${NC} Tabla encontrada: $table"
  else
    echo -e "   ${RED}✗${NC} Tabla faltante: $table"
    MISSING_TABLES+=("$table")
  fi
done

echo ""

# 6. Verificar migraciones registradas
echo "🔍 Verificando migraciones registradas en _prisma_migrations..."
MIGRATIONS=$(docker-compose exec -T vehicles-db psql -U postgres -d vehicles -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at;" -t 2>/dev/null || true)

if [ -n "$MIGRATIONS" ]; then
  echo "$MIGRATIONS"
else
  echo -e "${RED}✗${NC} No se encontraron registros en _prisma_migrations"
fi

echo ""

# Resumen final
echo "=================================================="
echo ""
if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ ÉXITO: Todas las migraciones se aplicaron correctamente${NC}"
  echo ""
  echo "📊 Estadísticas:"
  echo "   - Tablas creadas: $(echo "$TABLES" | wc -l)"
  echo "   - Migraciones aplicadas: $(echo "$MIGRATIONS" | grep -c '20' || echo 0)"
  echo ""
  echo "🎯 Siguiente paso:"
  echo "   Ejecuta 'docker-compose logs -f vehicles-svc' para ver logs en vivo"
  echo ""
  exit 0
else
  echo -e "${RED}❌ ERROR: Faltan tablas en la base de datos${NC}"
  echo ""
  echo "Tablas faltantes:"
  for table in "${MISSING_TABLES[@]}"; do
    echo "   - $table"
  done
  echo ""
  echo "🔍 Para debug, ejecuta:"
  echo "   docker-compose logs vehicles-svc"
  echo "   docker-compose exec vehicles-db psql -U postgres -d vehicles"
  echo ""
  exit 1
fi

