# Fase 2: Configuración de PostgreSQL en Azure

**Tiempo estimado**: 50 minutos  
**Prerequisitos**: Fase 1 completada  
**Configuración**: Alta Disponibilidad con GeneralPurpose tier

---

## Objetivos de esta Fase

Al finalizar esta fase, el sistema contará con:

- Azure Database for PostgreSQL Flexible Server con Alta Disponibilidad (HA) Same-Zone
- Réplica de lectura configurada para distribución de carga
- 6 bases de datos creadas (auth_db, driver_db, users_db, vehicles_db, vehicles_shadow_db, routes_db)
- Extensiones PostgreSQL habilitadas (pgcrypto, citext)
- Firewall configurado para Azure Services
- SSL/TLS configurado y obligatorio
- Connection strings probadas y funcionales
- Failover automático configurado
- Tier: GeneralPurpose con SKU Standard_D4ads_v5

**Configuración actual**: Esta implementación utiliza tier GeneralPurpose con SKU Standard_D4ads_v5, proporcionando 4 vCores, 16 GB RAM y 128 GB de almacenamiento. Costo estimado: aproximadamente $450-500/mes.

---

## 1. Variables de Entorno

### Windows PowerShell

```powershell
# Variables de Fase 1
$RESOURCE_GROUP = "fuel-system-rg"
$LOCATION = "northcentralus"

# Variables para PostgreSQL con HA (Producción)
$POSTGRES_SERVER = "fuel-system-postgres"
$POSTGRES_ADMIN_USER = "pgadmin"
$POSTGRES_ADMIN_PASSWORD = "FuelSystem2024!Secure"
$POSTGRES_VERSION = "17"
$POSTGRES_SKU = "Standard_D4ads_v5"
$POSTGRES_TIER = "GeneralPurpose"
$POSTGRES_STORAGE = 128
$BACKUP_RETENTION = 7

# Verificar variables
Write-Host "Resource Group: $RESOURCE_GROUP"
Write-Host "PostgreSQL Server: $POSTGRES_SERVER"
Write-Host "Admin User: $POSTGRES_ADMIN_USER"
Write-Host "PostgreSQL Version: $POSTGRES_VERSION"
Write-Host "SKU: $POSTGRES_SKU (4 vCores, 16 GB RAM)"
Write-Host "Tier: $POSTGRES_TIER"
Write-Host "Storage: $POSTGRES_STORAGE GB"
Write-Host "Backup Retention: $BACKUP_RETENTION days"
Write-Host "HA Mode: SameZone"
```

### Linux/macOS (Bash)

```bash
# Variables de Fase 1
export RESOURCE_GROUP="fuel-system-rg"
export LOCATION="northcentralus"

# Variables para PostgreSQL con HA (Producción)
export POSTGRES_SERVER="fuel-system-postgres"
export POSTGRES_ADMIN_USER="pgadmin"
export POSTGRES_ADMIN_PASSWORD="FuelSystem2024!Secure"
export POSTGRES_VERSION="17"
export POSTGRES_SKU="Standard_D4ads_v5"
export POSTGRES_TIER="GeneralPurpose"
export POSTGRES_STORAGE="128"
export BACKUP_RETENTION="7"

# Verificar variables
echo "Resource Group: $RESOURCE_GROUP"
echo "PostgreSQL Server: $POSTGRES_SERVER"
echo "Admin User: $POSTGRES_ADMIN_USER"
echo "PostgreSQL Version: $POSTGRES_VERSION"
echo "SKU: $POSTGRES_SKU (4 vCores, 16 GB RAM)"
echo "Tier: $POSTGRES_TIER"
echo "Storage: $POSTGRES_STORAGE GB"
echo "Backup Retention: $BACKUP_RETENTION days"
echo "HA Mode: SameZone"
```

**Nota de Seguridad**: La contraseña debe cumplir con los requisitos de Azure:
- Mínimo 8 caracteres
- Debe contener mayúsculas, minúsculas, números y caracteres especiales
- No debe contener el nombre de usuario

---

## 2. Crear Azure Database for PostgreSQL Flexible Server con HA

**Configuración seleccionada**: HA Same-Zone con GeneralPurpose tier
- Alta disponibilidad con servidor standby
- Failover automático en menos de 2 minutos
- 4 vCores, 16 GB RAM
- 128 GB de almacenamiento
- PostgreSQL 17

### Crear Servidor con Alta Disponibilidad Same-Zone

```bash
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --location $LOCATION \
  --admin-user $POSTGRES_ADMIN_USER \
  --admin-password $POSTGRES_ADMIN_PASSWORD \
  --version 17 \
  --tier GeneralPurpose \
  --sku-name Standard_D4ads_v5 \
  --high-availability SameZone \
  --storage-size 128 \
  --backup-retention 7 \
  --geo-redundant-backup Disabled \
  --public-access 0.0.0.0-255.255.255.255
```

**Características del servidor configurado:**
- PostgreSQL Version: 17 (última versión estable)
- Tier: GeneralPurpose (producción)
- SKU: Standard_D4ads_v5 (4 vCores, 16 GB RAM)
- HA Mode: SameZone (standby en la misma zona)
- Storage: 128 GB (expandible)
- Failover: Automático (< 2 minutos)
- Replicación: Sincrónica entre primario y standby
- Backups: Locales (7 días de retención)
- Costo estimado: aproximadamente $450-500/mes

**Comparación de Tiers:**

| Característica | GeneralPurpose (Configuración Actual) | Burstable (Económico) |
|----------------|----------------------------------------|-----------------------|
| vCores | 4 | 2 |
| RAM | 16 GB | 8 GB |
| HA Support | Same-Zone y Zone-Redundant | Same-Zone únicamente |
| IOPS | 3200 | 640 (burstable) |
| Uso recomendado | Producción | Desarrollo/Testing |
| Costo/mes | aproximadamente $450 | aproximadamente $100 |

**Tiempo de creación**: Aproximadamente 10-15 minutos

### Verificar Alta Disponibilidad

```bash
# Ver estado del servidor y configuración HA
az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --query "{name:name, state:state, haEnabled:highAvailability.mode, haState:highAvailability.state, sku:sku.name, tier:sku.tier, version:version}" \
  --output table

# Ver FQDN (Fully Qualified Domain Name)
az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --query fullyQualifiedDomainName \
  -o tsv
```

El FQDN obtenido será: `fuel-system-postgres.postgres.database.azure.com`

---

## 3. Crear Réplica de Lectura (Read Replica)

Las réplicas de lectura permiten distribuir la carga de consultas SELECT, mejorando el rendimiento general del sistema.

### Crear Read Replica con el mismo SKU

```bash
# Crear réplica de lectura en la misma región con SKU GeneralPurpose
az postgres flexible-server replica create \
  --replica-name fuel-system-postgres-read \
  --resource-group $RESOURCE_GROUP \
  --source-server $POSTGRES_SERVER \
  --location $LOCATION \
  --tier GeneralPurpose \
  --sku-name Standard_D4ads_v5

# Verificar réplica
az postgres flexible-server replica list \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --output table
```

### Obtener FQDN de la Réplica

```bash
# Obtener FQDN de la réplica de lectura
az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name fuel-system-postgres-read \
  --query fullyQualifiedDomainName \
  -o tsv
```

El FQDN de la réplica será: `fuel-system-postgres-read.postgres.database.azure.com`

### Configurar Firewall para la Réplica

```bash
# Aplicar las mismas reglas de firewall a la réplica
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name fuel-system-postgres-read \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

---

## 4. Configurar Firewall

### Permitir acceso desde Azure Services

```bash
# Crear regla de firewall para Azure Services
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Permitir acceso desde IP local (para testing)

```bash
# Obtener IP pública
$MY_IP = (Invoke-WebRequest -Uri "https://api.ipify.org").Content

# Crear regla de firewall para la IP local
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --rule-name AllowMyIP \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP

# Verificar reglas de firewall
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --output table
```

---

## 5. Configurar Parámetros del Servidor

### Parámetros Recomendados para GeneralPurpose

```bash
# Aumentar max_connections
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name max_connections \
  --value 500

# Configurar shared_buffers (25% de RAM = aproximadamente 4GB)
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name shared_buffers \
  --value 4194304

# Configurar effective_cache_size (50-75% de RAM = aproximadamente 10GB)
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name effective_cache_size \
  --value 10485760

# Configurar timezone
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name timezone \
  --value 'America/Guayaquil'

# Log de queries lentas
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name log_min_duration_statement \
  --value 1000

# Work mem para operaciones de sorting/hashing
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name work_mem \
  --value 16384
```

---

## 6. Crear las Bases de Datos

Se crearán 6 bases de datos, una para cada microservicio:

```bash
# 1. auth_db - Para Auth Service
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --database-name auth_db

# 2. driver_db - Para Driver Service
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --database-name driver_db

# 3. users_db - Para Users Service
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --database-name users_db

# 4. vehicles_db - Para Vehicles Service
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --database-name vehicles_db

# 5. vehicles_shadow_db - Para migraciones de Prisma
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --database-name vehicles_shadow_db

# 6. routes_db - Para Routes Service
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --database-name routes_db

# Listar todas las bases de datos
az postgres flexible-server db list \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --output table
```

**Nota**: Las bases de datos se replican automáticamente al servidor standby (HA) y a la réplica de lectura.

---

## 7. Habilitar Extensiones de PostgreSQL

**Contexto**: En Azure Database for PostgreSQL Flexible Server, las extensiones deben ser habilitadas por el administrador del servidor. Los usuarios regulares no pueden crear extensiones directamente, incluso si tienen privilegios de creación. Este es un comportamiento de seguridad específico de Azure.

### Extensiones Requeridas por el Sistema

El sistema requiere las siguientes extensiones:

- **pgcrypto**: Funciones criptográficas utilizadas por driver-service
- **citext**: Tipo de dato para texto case-insensitive utilizado por vehicles-service

### Método 1: Habilitar Extensiones desde Azure Portal (Recomendado)

Este es el método más sencillo y directo para habilitar extensiones.

**Pasos:**

1. Acceder al Azure Portal (https://portal.azure.com)
2. Navegar a "All resources" o buscar "fuel-system-postgres"
3. Seleccionar el servidor PostgreSQL "fuel-system-postgres"
4. En el menú lateral izquierdo, bajo "Settings", seleccionar "Server parameters"
5. En el cuadro de búsqueda, buscar "azure.extensions"
6. Verificar que en la lista de extensiones permitidas aparezcan:
   - `PGCRYPTO`
   - `CITEXT`
7. Si no están habilitadas, seleccionar ambas extensiones de la lista disponible
8. Hacer clic en "Save" en la parte superior
9. Esperar a que la configuración se aplique (aproximadamente 1-2 minutos)

### Método 2: Habilitar Extensiones con Azure CLI

```bash
# Verificar extensiones disponibles
az postgres flexible-server parameter show \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name azure.extensions

# Las extensiones pgcrypto y citext ya deben estar en la lista permitida por defecto
# Si no lo están, contactar al soporte de Azure
```

### Método 3: Crear Extensiones en las Bases de Datos

Una vez que las extensiones están habilitadas en el parámetro `azure.extensions`, se debe crear la extensión en cada base de datos donde se necesite.

**Para driver_db:**

```bash
# Conectarse como administrador
psql "host=fuel-system-postgres.postgres.database.azure.com port=5432 dbname=driver_db user=pgadmin sslmode=require"

# Dentro de psql, ejecutar:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

# Verificar extensión instalada
\dx

# Salir
\q
```

**Para vehicles_db:**

```bash
# Conectarse como administrador
psql "host=fuel-system-postgres.postgres.database.azure.com port=5432 dbname=vehicles_db user=pgadmin sslmode=require"

# Dentro de psql, ejecutar:
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

# Verificar extensiones instaladas
\dx

# Salir
\q
```

**Para vehicles_shadow_db:**

```bash
# Conectarse como administrador
psql "host=fuel-system-postgres.postgres.database.azure.com port=5432 dbname=vehicles_shadow_db user=pgadmin sslmode=require"

# Dentro de psql, ejecutar:
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

# Verificar extensiones instaladas
\dx

# Salir
\q
```

### Script Automatizado para Habilitar Extensiones

Se ha incluido un script PowerShell en `scripts/enable-azure-extensions.ps1` que automatiza este proceso:

```powershell
# Navegar a la carpeta scripts
cd scripts

# Ejecutar el script
.\enable-azure-extensions.ps1 -AdminPassword "FuelSystem2024!Secure"
```

### Verificación de Extensiones

Para verificar que las extensiones están correctamente instaladas:

```bash
# Conectarse a la base de datos
psql "host=fuel-system-postgres.postgres.database.azure.com port=5432 dbname=driver_db user=pgadmin sslmode=require"

# Listar extensiones instaladas
\dx

# Output esperado:
#                  List of installed extensions
#    Name   | Version |   Schema   |         Description          
# ----------+---------+------------+------------------------------
#  pgcrypto | 1.3     | public     | cryptographic functions
#  plpgsql  | 1.0     | pg_catalog | PL/pgSQL procedural language
```

**Nota importante**: Las extensiones deben ser habilitadas en cada base de datos de forma individual. No son globales al servidor.

### Extensiones Comunes Disponibles en Azure PostgreSQL

| Extensión | Disponibilidad | Uso en el Proyecto |
|-----------|----------------|-------------------|
| pgcrypto | Disponible | Funciones de criptografía (driver-service) |
| citext | Disponible | Texto case-insensitive (vehicles-service) |
| uuid-ossp | Disponible | Generación de UUIDs |
| pg_stat_statements | Disponible | Estadísticas de queries |
| postgis | Disponible (requiere habilitación) | Datos geoespaciales |

---

## 8. Testing de Conexión

### Instalación de Cliente PostgreSQL

```bash
# Windows (con Chocolatey)
choco install postgresql17 -y

# macOS
brew install postgresql@17

# Ubuntu/Debian
sudo apt-get install postgresql-client-17
```

### Test de Servidor Primario

```bash
# Conectar a la base de datos
psql "host=fuel-system-postgres.postgres.database.azure.com port=5432 dbname=auth_db user=pgadmin password=FuelSystem2024!Secure sslmode=require"

# Probar una consulta
SELECT version();

# Verificar configuración de HA
SELECT * FROM pg_stat_replication;

# Salir
\q
```

### Test de Réplica de Lectura

```bash
# Conectar a la réplica de lectura
psql "host=fuel-system-postgres-read.postgres.database.azure.com port=5432 dbname=auth_db user=pgadmin password=FuelSystem2024!Secure sslmode=require"

# En la réplica, solo se pueden ejecutar consultas SELECT
# Intentar INSERT/UPDATE/DELETE generará un error

# Probar consulta de lectura
SELECT version();

# Verificar que es una réplica
SELECT pg_is_in_recovery();

# Salir
\q
```

---

## 9. Connection Strings para los Microservicios

### Connection Strings con HA y Read Replica

```bash
# SERVIDOR PRIMARIO (para escritura)
DB_HOST=fuel-system-postgres.postgres.database.azure.com
DB_PORT=5432
DB_USERNAME=pgadmin
DB_PASSWORD=FuelSystem2024!Secure
DB_NAME=auth_db
DB_SSL_MODE=require

# RÉPLICA DE LECTURA (para consultas SELECT)
DB_READ_HOST=fuel-system-postgres-read.postgres.database.azure.com
DB_READ_PORT=5432
DB_READ_USERNAME=pgadmin
DB_READ_PASSWORD=FuelSystem2024!Secure

# Connection String Completo (Primario)
postgresql://pgadmin:FuelSystem2024!Secure@fuel-system-postgres.postgres.database.azure.com:5432/auth_db?sslmode=require

# Connection String Completo (Réplica)
postgresql://pgadmin:FuelSystem2024!Secure@fuel-system-postgres-read.postgres.database.azure.com:5432/auth_db?sslmode=require
```

### Configuración en GitHub Secrets

Navegar a: **Settings → Secrets → Actions** en el repositorio de GitHub y agregar:

```
POSTGRES_HOST=fuel-system-postgres.postgres.database.azure.com
POSTGRES_READ_HOST=fuel-system-postgres-read.postgres.database.azure.com
POSTGRES_USERNAME=pgadmin
POSTGRES_PASSWORD=FuelSystem2024!Secure
```

---

## 10. Verificación de Recursos y Performance

### Monitoreo del Servidor

```bash
# Ver métricas de CPU
az monitor metrics list \
  --resource-group $RESOURCE_GROUP \
  --resource $(az postgres flexible-server show \
    --resource-group $RESOURCE_GROUP \
    --name $POSTGRES_SERVER \
    --query id -o tsv) \
  --metric-names cpu_percent \
  --start-time $(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%SZ') \
  --output table

# Ver métricas de memoria
az monitor metrics list \
  --resource-group $RESOURCE_GROUP \
  --resource $(az postgres flexible-server show \
    --resource-group $RESOURCE_GROUP \
    --name $POSTGRES_SERVER \
    --query id -o tsv) \
  --metric-names memory_percent \
  --start-time $(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%SZ') \
  --output table
```

---

## 11. Resumen de Configuración

Al finalizar esta fase, el servidor PostgreSQL está configurado con:

**Infraestructura:**
- Servidor primario con HA Same-Zone
- Servidor standby para failover automático
- Réplica de lectura para distribución de carga
- 6 bases de datos creadas y replicadas

**Seguridad:**
- SSL/TLS obligatorio
- Firewall configurado
- Contraseña segura establecida

**Performance:**
- 4 vCores, 16 GB RAM
- 3200 IOPS
- 128 GB de almacenamiento
- Parámetros optimizados para producción

**Extensiones:**
- pgcrypto habilitada en driver_db, vehicles_db, vehicles_shadow_db
- citext habilitada en vehicles_db, vehicles_shadow_db

**Conexión:**
- FQDN Primario: fuel-system-postgres.postgres.database.azure.com
- FQDN Réplica: fuel-system-postgres-read.postgres.database.azure.com
- Puerto: 5432
- SSL Mode: require

---

## Próximos Pasos

Continuar con la **Fase 3: Cluster de Kubernetes (AKS)** en `03-AZURE-AKS-CLUSTER.md`

---

## Referencias

- [Azure PostgreSQL Flexible Server Documentation](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/)
- [PostgreSQL Extensions in Azure](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-extensions)
- [High Availability in Azure PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-high-availability)

