#!/bin/bash
set -e

# Script para crear múltiples bases de datos en PostgreSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Crear base de datos para Auth Service
    CREATE DATABASE auth_db;
    GRANT ALL PRIVILEGES ON DATABASE auth_db TO postgres;

    -- Crear base de datos para Driver Microservice
    CREATE DATABASE driver_db;
    GRANT ALL PRIVILEGES ON DATABASE driver_db TO postgres;

    -- Crear base de datos para Users Service
    CREATE DATABASE users_db;
    GRANT ALL PRIVILEGES ON DATABASE users_db TO postgres;

    -- Crear base de datos para Vehicles Service
    CREATE DATABASE vehicles_db;
    GRANT ALL PRIVILEGES ON DATABASE vehicles_db TO postgres;

    -- Crear base de datos shadow para Vehicles (Prisma migrations)
    CREATE DATABASE vehicles_shadow_db;
    GRANT ALL PRIVILEGES ON DATABASE vehicles_shadow_db TO postgres;

    -- Listar bases de datos creadas
    \l
EOSQL

echo "✅ Bases de datos creadas exitosamente:"
echo "   - auth_db"
echo "   - driver_db"
echo "   - users_db"
echo "   - vehicles_db"
echo "   - vehicles_shadow_db"

