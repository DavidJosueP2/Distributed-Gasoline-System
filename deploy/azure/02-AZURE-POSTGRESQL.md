# 🗄️ Fase 2: Configuración de PostgreSQL en Azure

> **Tiempo estimado**: 45 minutos  
> **Prerequisitos**: Fase 1 completada  
> **💰 VERSIÓN PRODUCCIÓN**: Configuración con Alta Disponibilidad (HA)

---

## 📋 Objetivos de esta Fase

Al finalizar esta fase, tendrás:

- ✅ Azure Database for PostgreSQL Flexible Server con **Alta Disponibilidad (HA)** - Same-Zone
- ✅ **Réplica de lectura** configurada para mejorar rendimiento
- ✅ 6 bases de datos creadas (auth_db, driver_db, users_db, vehicles_db, vehicles_shadow_db, routes_db)
- ✅ Firewall configurado para Azure Services
- ✅ SSL/TLS configurado
- ✅ Connection string probada y funcional
- ✅ Failover automático configurado
- ✅ **Tier**: GeneralPurpose con SKU Standard_D4ads_v5

> **💡 CONFIGURACIÓN ACTUAL**: Esta configuración usa tier GeneralPurpose con SKU Standard_D4ads_v5, proporcionando 4 vCores, 16 GB RAM y 128 GB de storage. Costo estimado: ~$450-500/mes.

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
$POSTGRES_ADMIN_PASSWORD = "FuelSystem2024!Secure"  # Contraseña en uso
$POSTGRES_VERSION = "17"
$POSTGRES_SKU = "Standard_D4ads_v5"  # 4 vCores, 16 GB RAM
$POSTGRES_TIER = "GeneralPurpose"  # Tier de producción
$POSTGRES_STORAGE = 128  # GB de storage
$BACKUP_RETENTION = 7  # Días de retención

# Verificar variables
Write-Host "🚀 CONFIGURACIÓN DE PRODUCCIÓN" -ForegroundColor Cyan
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
export POSTGRES_ADMIN_PASSWORD="FuelSystem2024!Secure"  # Contraseña en uso
export POSTGRES_VERSION="17"
export POSTGRES_SKU="Standard_D4ads_v5"  # 4 vCores, 16 GB RAM
export POSTGRES_TIER="GeneralPurpose"  # Tier de producción
export POSTGRES_STORAGE="128"  # GB de storage
export BACKUP_RETENTION="7"  # Días de retención

# Verificar variables
echo "🚀 CONFIGURACIÓN DE PRODUCCIÓN"
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

> **⚠️ SEGURIDAD**: La contraseña debe cumplir con los requisitos de Azure:
> - Mínimo 8 caracteres
> - Debe contener mayúsculas, minúsculas, números y caracteres especiales
> - No debe contener el nombre de usuario

---

## 2. Crear Azure Database for PostgreSQL Flexible Server con HA

> **✅ CONFIGURACIÓN ACTUAL**: Usamos **HA Same-Zone** con **GeneralPurpose tier**:
> - ✅ Alta disponibilidad con servidor standby
> - ✅ Failover automático (< 2 minutos)
> - ✅ 4 vCores, 16 GB RAM
> - ✅ 128 GB storage
> - ✅ PostgreSQL 17

### Crear Servidor con Alta Disponibilidad Same-Zone

```bash
# Crear PostgreSQL Flexible Server con HA Same-Zone
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
- ✅ **PostgreSQL Version**: 17 (última versión estable)
- ✅ **Tier**: GeneralPurpose (producción)
- ✅ **SKU**: Standard_D4ads_v5 (4 vCores, 16 GB RAM)
- ✅ **HA Mode**: SameZone (standby en la misma zona)
- ✅ **Storage**: 128 GB (expandible)
- ✅ **Failover**: Automático (< 2 minutos)
- ✅ **Replicación**: Sincrónica entre primario y standby
- ✅ **Backups**: Locales (7 días de retención)
- 💰 **Costo estimado**: ~$450-500/mes

**Diferencias de Tiers:**

| Característica | GeneralPurpose (Actual) ✅ | Burstable (Económico) |
|----------------|----------------------------|-----------------------|
| **vCores** | 4 | 2 |
| **RAM** | 16 GB | 8 GB |
| **HA Support** | ✅ Same-Zone & Zone-Redundant | ✅ Same-Zone only |
| **IOPS** | 3200 | 640 (burstable) |
| **Uso recomendado** | Producción | Desarrollo/Testing |
| **Costo/mes** | ~$450 | ~$100 |

**Tiempo de creación**: ~10-15 minutos

### Verificar Alta Disponibilidad

```bash
# Ver estado del servidor y configuración HA
az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --query "{name:name, state:state, haEnabled:highAvailability.mode, haState:highAvailability.state, sku:sku.name, tier:sku.tier, version:version}" \
  --output table

# Output esperado:
# Name                    State    HaEnabled    HaState    Sku                   Tier            Version
# ----------------------  -------  -----------  ---------  --------------------  --------------  -------
# fuel-system-postgres    Ready    SameZone     Healthy    Standard_D4ads_v5     GeneralPurpose  17

# Ver FQDN (Fully Qualified Domain Name)
az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --query fullyQualifiedDomainName \
  -o tsv

# Output: fuel-system-postgres.postgres.database.azure.com
```

**Guarda el FQDN:**
```
POSTGRES_HOST=fuel-system-postgres.postgres.database.azure.com
```

---

## 3. Crear Réplica de Lectura (Read Replica)

> **💡 IMPORTANTE**: Las réplicas de lectura permiten distribuir la carga de consultas SELECT, mejorando el rendimiento general del sistema.

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
POSTGRES_READ_HOST=$(az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name fuel-system-postgres-read \
  --query fullyQualifiedDomainName \
  -o tsv)

echo "Read Replica Host: $POSTGRES_READ_HOST"
# Output: fuel-system-postgres-read.postgres.database.azure.com
```

**Guarda el FQDN de la réplica:**
```
POSTGRES_READ_HOST=fuel-system-postgres-read.postgres.database.azure.com
```

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
# Crear regla de firewall para Azure Services (0.0.0.0)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Permitir acceso desde tu IP local (para testing)

```bash
# Obtener tu IP pública
$MY_IP = (Invoke-WebRequest -Uri "https://api.ipify.org").Content

# Crear regla de firewall para tu IP
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

### Permitir acceso desde rango de IPs (opcional)

```bash
# Para permitir acceso desde una red específica
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --rule-name AllowOfficeNetwork \
  --start-ip-address 192.168.1.0 \
  --end-ip-address 192.168.1.255
```

---

## 5. Configurar Parámetros del Servidor

### Ver parámetros actuales

```bash
# Listar todos los parámetros configurables
az postgres flexible-server parameter list \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --output table
```

### Configurar parámetros recomendados para GeneralPurpose

```bash
# Aumentar max_connections (default para D4ads_v5 es ~450)
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name max_connections \
  --value 500

# Configurar shared_buffers (25% de RAM = ~4GB)
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name shared_buffers \
  --value 4194304  # 4GB en 8KB pages

# Configurar effective_cache_size (50-75% de RAM = ~8-12GB)
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name effective_cache_size \
  --value 10485760  # 10GB en 8KB pages

# Configurar timezone
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name timezone \
  --value 'America/Guayaquil'

# Log de queries lentas (útil para debugging)
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name log_min_duration_statement \
  --value 1000  # Log queries que tarden más de 1 segundo

# Work mem (para operaciones de sorting/hashing)
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name work_mem \
  --value 16384  # 16MB
```

---

## 6. Crear las Bases de Datos

Crearemos 6 bases de datos, una para cada microservicio:

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

# 5. vehicles_shadow_db - Para migraciones de Prisma (Vehicles Service)
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

**Output esperado:**
```
Name                  Charset    Collation
--------------------  ---------  -----------
auth_db               UTF8       en_US.utf8
driver_db             UTF8       en_US.utf8
postgres              UTF8       en_US.utf8
routes_db             UTF8       en_US.utf8
users_db              UTF8       en_US.utf8
vehicles_db           UTF8       en_US.utf8
vehicles_shadow_db    UTF8       en_US.utf8
```

> **📝 NOTA**: Las bases de datos se replican automáticamente al servidor standby (HA) y a la réplica de lectura.

---

## 7. Testing de Conexión

### Test de Servidor Primario

```bash
# Instalar psql en Windows (con Chocolatey)
choco install postgresql17 -y

# Instalar psql en macOS
brew install postgresql@17

# Instalar psql en Ubuntu/Debian
sudo apt-get install postgresql-client-17

# Conectar a la base de datos
psql "host=fuel-system-postgres.postgres.database.azure.com port=5432 dbname=auth_db user=pgadmin password=FuelSystem2024!Secure sslmode=require"

# Si la conexión es exitosa, verás:
# auth_db=>

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

# En la réplica, SOLO puedes ejecutar consultas SELECT
# Intentar INSERT/UPDATE/DELETE dará error

# Probar consulta de lectura
SELECT version();

# Verificar que es una réplica
SELECT pg_is_in_recovery();  -- Debe retornar 't' (true)

# Salir
\q
```

### Script de Test con Réplicas

Actualiza `test-postgres-connection.ps1`:

```powershell
$POSTGRES_PRIMARY_HOST = "fuel-system-postgres.postgres.database.azure.com"
$POSTGRES_READ_HOST = "fuel-system-postgres-read.postgres.database.azure.com"
$POSTGRES_USER = "pgadmin"
$POSTGRES_PASSWORD = "FuelSystem2024!Secure"
$DATABASES = @("auth_db", "driver_db", "users_db", "vehicles_db", "vehicles_shadow_db", "routes_db")

Write-Host "🔍 Testing PostgreSQL connections (Primary + Read Replica)..." -ForegroundColor Cyan

# Test Primary Server
Write-Host "`n=== TESTING PRIMARY SERVER ===" -ForegroundColor Yellow
foreach ($DB in $DATABASES) {
    Write-Host "`nTesting connection to PRIMARY: $DB" -ForegroundColor Yellow
    
    $env:PGPASSWORD = $POSTGRES_PASSWORD
    
    $result = psql -h $POSTGRES_PRIMARY_HOST `
                   -U $POSTGRES_USER `
                   -d $DB `
                   -c "SELECT 1;" `
                   2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Primary connection to $DB successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Primary connection to $DB failed" -ForegroundColor Red
    }
}

# Test Read Replica
Write-Host "`n=== TESTING READ REPLICA ===" -ForegroundColor Yellow
foreach ($DB in $DATABASES) {
    Write-Host "`nTesting connection to READ REPLICA: $DB" -ForegroundColor Yellow
    
    $env:PGPASSWORD = $POSTGRES_PASSWORD
    
    $result = psql -h $POSTGRES_READ_HOST `
                   -U $POSTGRES_USER `
                   -d $DB `
                   -c "SELECT 1;" `
                   2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Read replica connection to $DB successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Read replica connection to $DB failed" -ForegroundColor Red
    }
}

Remove-Item Env:\PGPASSWORD
Write-Host "`n✅ Testing complete!" -ForegroundColor Cyan
```

---

## 8. Connection Strings para los Microservicios

### Connection Strings con HA y Read Replica

```bash
# SERVIDOR PRIMARIO (para escritura)
DB_HOST=fuel-system-postgres.postgres.database.azure.com
DB_PORT=5432
DB_USERNAME=pgadmin
DB_PASSWORD=FuelSystem2024!Secure
DB_NAME=auth_db  # Cambiar según el servicio
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

### Agregar a GitHub Secrets

Ve a GitHub: **Settings → Secrets → Actions**

```
POSTGRES_HOST=fuel-system-postgres.postgres.database.azure.com
POSTGRES_READ_HOST=fuel-system-postgres-read.postgres.database.azure.com
POSTGRES_USERNAME=pgadmin
POSTGRES_PASSWORD=FuelSystem2024!Secure
```

---

## 9. Verificar Performance y Recursos

### Monitorear el Servidor

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

# Ver storage usado
az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --query "{storage:storage.storageSizeGB, used:storage.storageSizeGB}" \
  --output table
```

### Benchmark de Performance

```bash
# Conectar a la base de datos
psql "host=fuel-system-postgres.postgres.database.azure.com port=5432 dbname=auth_db user=pgadmin password=FuelSystem2024!Secure sslmode=require"

-- Ver estadísticas de la base de datos
SELECT * FROM pg_stat_database WHERE datname = 'auth_db';

-- Ver conexiones activas
SELECT count(*) FROM pg_stat_activity;

-- Ver queries lentas
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '1 seconds'
ORDER BY duration DESC;
```

---

## 10. Configuración de Costos y Billing

### Estimación de Costos Mensual

**Servidor Primario (Standard_D4ads_v5):**
- Compute: ~$300/mes
- Storage (128 GB): ~$15/mes
- Backup (7 días): ~$8/mes
- **Subtotal**: ~$323/mes

**Réplica de Lectura (Standard_D4ads_v5):**
- Compute: ~$300/mes
- Storage (128 GB): ~$15/mes
- **Subtotal**: ~$315/mes

**Total Estimado**: **~$638/mes**

> **💡 TIP**: Para reducir costos en desarrollo/testing, considera:
> - Usar SKU más pequeño: Standard_D2ads_v5 (~$150/mes cada uno)
> - Desactivar réplica de lectura en desarrollo
> - Reducir backup retention a 7 días (ya configurado)

### Configurar Budget Alerts

```bash
# Crear budget alert
az consumption budget create \
  --budget-name fuel-system-postgres-budget \
  --resource-group $RESOURCE_GROUP \
  --amount 700 \
  --time-grain Monthly \
  --start-date $(date -u '+%Y-%m-01') \
  --end-date $(date -u -d '+1 year' '+%Y-%m-01')
```

---

## ✅ Fase 2 Completada

Si llegaste hasta aquí, ¡felicitaciones! Tienes:

- ✅ PostgreSQL Flexible Server con HA (GeneralPurpose tier)
- ✅ SKU: Standard_D4ads_v5 (4 vCores, 16 GB RAM)
- ✅ PostgreSQL Version 17
- ✅ 128 GB de storage
- ✅ Réplica de lectura configurada
- ✅ 6 bases de datos creadas
- ✅ Firewall configurado
- ✅ SSL/TLS habilitado
- ✅ Connection strings probadas
- ✅ Parámetros optimizados para GeneralPurpose

**Tiempo total**: ~45 minutos  
**Costo mensual estimado**: ~$638/mes

---

## 📍 Próximo Paso

Continúa con: **[Fase 3: Creación del Cluster AKS](./03-AZURE-AKS-CLUSTER.md)**

En la Fase 3 crearás:
- Azure Kubernetes Service (AKS) cluster
- Integración con GHCR
- NGINX Ingress Controller
- Horizontal Pod Autoscaler
- Cluster Autoscaler

---

**¡Excelente progreso! 🚀**

---

## PowerShell Script Completo

Guarda este script como `setup-azure-postgres.ps1`:

```powershell
# Variables - Configuración de Producción
$RESOURCE_GROUP = "fuel-system-rg"
$LOCATION = "northcentralus"
$POSTGRES_SERVER = "fuel-system-postgres"
$POSTGRES_ADMIN_USER = "pgadmin"
$POSTGRES_ADMIN_PASSWORD = "FuelSystem2024!Secure"  # Contraseña actual
$POSTGRES_VERSION = "17"
$POSTGRES_SKU = "Standard_D4ads_v5"  # GeneralPurpose - Producción
$POSTGRES_TIER = "GeneralPurpose"
$POSTGRES_STORAGE = 128  # GB
$BACKUP_RETENTION = 7

Write-Host "🚀 Configurando PostgreSQL en Azure (Producción)..." -ForegroundColor Cyan

# Login
Write-Host "`n🔐 Login a Azure..."
az login

# Establecer suscripción
$SUBSCRIPTION_ID = (az account show --query id -o tsv)
az account set --subscription $SUBSCRIPTION_ID

# Crear PostgreSQL Flexible Server con HA
Write-Host "`n📦 Creando PostgreSQL Flexible Server con HA..." -ForegroundColor Yellow
az postgres flexible-server create `
  --resource-group $RESOURCE_GROUP `
  --name $POSTGRES_SERVER `
  --location $LOCATION `
  --admin-user $POSTGRES_ADMIN_USER `
  --admin-password $POSTGRES_ADMIN_PASSWORD `
  --version 17 `
  --tier GeneralPurpose `
  --sku-name Standard_D4ads_v5 `
  --high-availability SameZone `
  --storage-size 128 `
  --backup-retention 7 `
  --geo-redundant-backup Disabled `
  --public-access 0.0.0.0-255.255.255.255

Write-Host "`n✅ PostgreSQL Server creado!" -ForegroundColor Green

# Crear réplica de lectura
Write-Host "`n2. Creando Read Replica (GeneralPurpose)..." -ForegroundColor Yellow
az postgres flexible-server replica create `
  --replica-name fuel-system-postgres-read `
  --resource-group $RESOURCE_GROUP `
  --source-server $POSTGRES_SERVER `
  --location $LOCATION `
  --tier GeneralPurpose `
  --sku-name Standard_D4ads_v5

Write-Host "`n✅ Read Replica creada!" -ForegroundColor Green

# Configurar Firewall
Write-Host "`n3. Configurando Firewall..." -ForegroundColor Yellow
az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $POSTGRES_SERVER `
  --rule-name AllowAzureServices `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 0.0.0.0

# Configurar parámetros optimizados para GeneralPurpose
Write-Host "`n4. Configurando parámetros del servidor..." -ForegroundColor Yellow

# Max connections
az postgres flexible-server parameter set `
  --resource-group $RESOURCE_GROUP `
  --server-name $POSTGRES_SERVER `
  --name max_connections `
  --value 500

# Shared buffers (25% de RAM = 4GB)
az postgres flexible-server parameter set `
  --resource-group $RESOURCE_GROUP `
  --server-name $POSTGRES_SERVER `
  --name shared_buffers `
  --value 4194304

# Effective cache size (50-75% de RAM = 10GB)
az postgres flexible-server parameter set `
  --resource-group $RESOURCE_GROUP `
  --server-name $POSTGRES_SERVER `
  --name effective_cache_size `
  --value 10485760

# Timezone
az postgres flexible-server parameter set `
  --resource-group $RESOURCE_GROUP `
  --server-name $POSTGRES_SERVER `
  --name timezone `
  --value 'America/Guayaquil'

# Crear bases de datos
Write-Host "`n5. Creando bases de datos..." -ForegroundColor Yellow
$DATABASES = @("auth_db", "driver_db", "users_db", "vehicles_db", "vehicles_shadow_db", "routes_db")

foreach ($DB in $DATABASES) {
    Write-Host "Creando base de datos: $DB" -ForegroundColor Gray
    az postgres flexible-server db create `
      --resource-group $RESOURCE_GROUP `
      --server-name $POSTGRES_SERVER `
      --database-name $DB
}

Write-Host "`n✅ Setup completo!" -ForegroundColor Green
Write-Host "`nDetalles del servidor:" -ForegroundColor Cyan
Write-Host "Servidor: $POSTGRES_SERVER"
Write-Host "Version: PostgreSQL $POSTGRES_VERSION"
Write-Host "Tier: $POSTGRES_TIER"
Write-Host "SKU: $POSTGRES_SKU (4 vCores, 16 GB RAM)"
Write-Host "Storage: $POSTGRES_STORAGE GB"
Write-Host "HA Mode: SameZone"
Write-Host "Réplica de lectura: fuel-system-postgres-read"
Write-Host "`nHost: fuel-system-postgres.postgres.database.azure.com"
Write-Host "Read Replica Host: fuel-system-postgres-read.postgres.database.azure.com"
Write-Host "Username: $POSTGRES_ADMIN_USER"
Write-Host "Password: $POSTGRES_ADMIN_PASSWORD"
Write-Host "`nCosto estimado: ~$638/mes (primario + réplica)"
```

Ejecutar:
```powershell
.\setup-azure-postgres.ps1
```

---

## 11. Comparación de Configuraciones

### PostgreSQL con HA Same-Zone + Read Replica (GeneralPurpose - Actual)

**Características:**
- ✅ **Tier**: GeneralPurpose
- ✅ **SKU**: Standard_D4ads_v5
- ✅ **vCores**: 4
- ✅ **RAM**: 16 GB
- ✅ **Storage**: 128 GB
- ✅ **IOPS**: 3200 (baseline)
- ✅ **Max Connections**: 500
- ✅ **HA**: Same-Zone (failover < 2 min)
- ✅ **Read Replica**: Sí (mismo SKU)
- ✅ **PostgreSQL Version**: 17
- 💰 **Costo**: ~$638/mes

**Ideal para:**
- ✅ Producción
- ✅ Cargas de trabajo consistentes
- ✅ Aplicaciones que requieren alta disponibilidad
- ✅ Sistemas con tráfico moderado a alto

### Configuración Económica (Desarrollo/Testing)

**Si necesitas reducir costos:**

```powershell
# Usar SKU más pequeño
$POSTGRES_SKU = "Standard_D2ads_v5"  # 2 vCores, 8 GB RAM
$POSTGRES_TIER = "GeneralPurpose"
$POSTGRES_STORAGE = 32  # GB mínimo

# Desactivar réplica de lectura (no crear la réplica)
# Costo estimado: ~$200/mes
```

**Configuración Burstable (Solo desarrollo local):**

```powershell
# Solo para testing/desarrollo
$POSTGRES_SKU = "Standard_B2s"
$POSTGRES_TIER = "Burstable"
$POSTGRES_STORAGE = 32

# ⚠️ NO recomendado para producción
# Costo estimado: ~$100/mes
```

---

