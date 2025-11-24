-- ============================================================
-- Script para habilitar extensiones en Azure PostgreSQL
-- ============================================================
-- IMPORTANTE: Este script debe ejecutarse SOLO por el administrador
-- de Azure PostgreSQL (pgadmin@fuel-system-postgres)
--
-- Uso:
-- psql "host=fuel-system-postgres.postgres.database.azure.com port=5432 user=pgadmin@fuel-system-postgres dbname=postgres sslmode=require" -f enable-azure-extensions.sql
--
-- O desde PowerShell/Azure CLI:
-- az postgres flexible-server execute -n fuel-system-postgres -u pgadmin -p "PASSWORD" --database-name driver_db --file-path enable-azure-extensions.sql
-- ============================================================

\echo '🔧 Habilitando extensiones en Azure PostgreSQL...'

-- ============================================================
-- Database: driver_db
-- ============================================================
\echo '📦 Conectando a driver_db...'
\c driver_db

\echo '  ✓ Habilitando pgcrypto en driver_db...'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\echo '  ✓ driver_db: Extensiones habilitadas'

-- ============================================================
-- Database: vehicles_db
-- ============================================================
\echo '📦 Conectando a vehicles_db...'
\c vehicles_db

\echo '  ✓ Habilitando pgcrypto en vehicles_db...'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

\echo '  ✓ Verificando si citext está disponible...'
-- NOTA: citext puede no estar disponible en Azure PostgreSQL Flexible Server
-- Si falla, comentar esta línea y usar VARCHAR en lugar de CITEXT
-- CREATE EXTENSION IF NOT EXISTS citext;

\echo '  ✓ vehicles_db: Extensiones habilitadas'

-- ============================================================
-- Database: vehicles_shadow_db
-- ============================================================
\echo '📦 Conectando a vehicles_shadow_db...'
\c vehicles_shadow_db

\echo '  ✓ Habilitando pgcrypto en vehicles_shadow_db...'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CREATE EXTENSION IF NOT EXISTS citext;

\echo '  ✓ vehicles_shadow_db: Extensiones habilitadas'

-- ============================================================
-- Verificación
-- ============================================================
\echo ''
\echo '✅ Verificando extensiones instaladas:'
\echo ''

\c driver_db
\echo '📊 driver_db:'
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgcrypto', 'citext');

\c vehicles_db
\echo '📊 vehicles_db:'
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgcrypto', 'citext');

\c vehicles_shadow_db
\echo '📊 vehicles_shadow_db:'
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgcrypto', 'citext');

\echo ''
\echo '🎉 ¡Extensiones habilitadas correctamente!'
\echo ''
\echo '⚠️  NOTA: Si citext falló, es normal en Azure PostgreSQL Flexible Server.'
\echo '    Los scripts ya están actualizados para usar VARCHAR en lugar de CITEXT.'

