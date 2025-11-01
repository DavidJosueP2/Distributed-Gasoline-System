# 🏗️ Arquitectura del Sistema - Fuel System

## 📊 Visión General

El sistema está diseñado con una arquitectura de microservicios distribuidos que separa la **capa de aplicación** (en Kubernetes) de la **capa de datos** (servicios administrados de Azure).

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │  Azure   │
                    │   ALB    │
                    └────┬─────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│              Azure Kubernetes Service (AKS)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Ingress Controller                      │   │
│  └────┬──────────────────────────────────────────────────────┘   │
│       │                                                            │
│  ┌────▼──────────┐                                                │
│  │  API Gateway  │                                                │
│  │  (2 replicas) │                                                │
│  └────┬──────────┘                                                │
│       │                                                            │
│  ┌────┴──────────────────────────────────────────────────┐       │
│  │              Service Discovery (Eureka)                │       │
│  └────────────────────────────┬───────────────────────────┘       │
│                                │                                   │
│  ┌────────────────────────────┴──────────────────────────┐       │
│  │              gRPC Microservices                        │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │       │
│  │  │Auth      │  │Driver    │  │Users     │  ...       │       │
│  │  │Service   │  │Service   │  │Service   │           │       │
│  │  │(HPA 2-5) │  │(HPA 2-5) │  │(HPA 2-5) │           │       │
│  │  └──────────┘  └──────────┘  └──────────┘           │       │
│  └────────────────┬───────────────────────────┬─────────┘       │
│                   │                           │                   │
│  ┌────────────────▼───────────┐  ┌───────────▼────────┐         │
│  │    RabbitMQ Cluster        │  │   Elasticsearch    │         │
│  │    (Messaging)             │  │   (Logs)           │         │
│  │    - 2 replicas            │  │   - 3 master nodes │         │
│  │    - Persistent Volume     │  │   - 2 data nodes   │         │
│  └────────────────────────────┘  └────────────────────┘         │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       │ Connection via Private Endpoint
                       │ (Secure VNet Integration)
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│         Azure Database for PostgreSQL Flexible Server          │
│                    (Managed Service)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │auth_db   │  │driver_db │  │users_db  │  │vehicles_ │      │
│  │          │  │          │  │          │  │db        │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  - Automatic Backups                                           │
│  - Point-in-time Restore                                       │
│  - High Availability                                           │
│  - Automatic Scaling                                           │
│  - SSL/TLS Encryption                                          │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Separación de Responsabilidades

### 1️⃣ Azure Kubernetes Service (AKS)

**Propósito**: Ejecutar la capa de aplicación con autoescalado

**Componentes**:
- ✅ API Gateway
- ✅ Microservicios (auth, driver, users, vehicles, email, etc.)
- ✅ Eureka Server (Service Discovery)
- ✅ RabbitMQ (Mensajería)
- ✅ Elasticsearch (Logs)
- ✅ Kibana (Visualización)

**Características**:
- 🔄 Autoescalado horizontal (HPA)
- 🔄 Autoescalado de nodos (Cluster Autoscaler)
- 📦 Gestión automática de pods
- 🔀 Load balancing automático
- 🛡️ Network policies
- 📊 Monitoreo integrado

### 2️⃣ Azure Database for PostgreSQL Flexible Server

**Propósito**: Capa de datos administrada y de alta disponibilidad

**Bases de Datos**:
1. `auth_db` - Autenticación y autorización
2. `driver_db` - Datos de conductores y licencias
3. `users_db` - Usuarios y roles
4. `vehicles_db` - Vehículos y modelos
5. `vehicles_shadow_db` - DB shadow para migraciones de Prisma

**Características Administradas por Azure**:
- ✅ Backups automáticos diarios
- ✅ Point-in-time restore (PITR)
- ✅ Alta disponibilidad con zona redundante
- ✅ Escalado vertical automático
- ✅ Réplicas de lectura
- ✅ SSL/TLS obligatorio
- ✅ Monitoreo y alertas
- ✅ Parches de seguridad automáticos

## 🔗 Conectividad

### Conexión Segura AKS → PostgreSQL

```yaml
# Los microservicios se conectan vía:
Connection String: 
  postgresql://username:password@fuel-system-postgres.postgres.database.azure.com:5432/db_name?sslmode=require

# Características de seguridad:
- Private Endpoint (VNet Integration)
- SSL/TLS obligatorio
- Firewall rules específicas
- Azure AD authentication (opcional)
```

### Variables de Entorno en Pods

```yaml
env:
  - name: DB_HOST
    value: "fuel-system-postgres.postgres.database.azure.com"
  - name: DB_PORT
    value: "5432"
  - name: DB_USERNAME
    valueFrom:
      secretKeyRef:
        name: postgresql-credentials
        key: username
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgresql-credentials
        key: password
  - name: DB_SSL_MODE
    value: "require"
```

## 📈 Escalabilidad

### Microservicios (AKS)

```yaml
# Horizontal Pod Autoscaler (HPA)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**Comportamiento**:
- 📊 Escala basado en CPU y memoria
- ⚡ Responde a picos de tráfico automáticamente
- 💰 Optimiza costos reduciendo réplicas en momentos de baja carga

### Base de Datos (Azure PostgreSQL)

```bash
# Escalado Vertical (manual o programado)
az postgres flexible-server update \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --sku-name Standard_D4s_v3  # Escalar a 4 vCores

# Réplicas de Lectura (para cargas de solo lectura)
az postgres flexible-server replica create \
  --replica-name fuel-system-postgres-replica \
  --source-server fuel-system-postgres
```

## 🛡️ Alta Disponibilidad

### AKS
- ✅ Multi-zona (Availability Zones)
- ✅ Múltiples réplicas de cada servicio
- ✅ Health checks y auto-restart
- ✅ Rolling updates sin downtime

### PostgreSQL Flexible Server
- ✅ Zone-redundant High Availability
- ✅ Failover automático (< 120 segundos)
- ✅ Réplicas síncronas
- ✅ Backups en múltiples regiones

## 💾 Gestión de Datos

### Migraciones de Base de Datos

**Servicios con Prisma** (users-srv, vehicles-svc):

En **Kubernetes/Azure** (Producción):
```yaml
# Se ejecutan automáticamente en initContainer ANTES de iniciar la app
initContainers:
- name: prisma-migrate
  command: ["npx", "prisma", "migrate", "deploy"]
  # ✅ Fail-fast: Si migraciones fallan, pod no inicia
  # ✅ Automático: Se ejecuta en cada deploy
  # ✅ Idempotent: Se puede ejecutar múltiples veces
```

En **Docker Local** (Desarrollo):
```bash
# Migraciones + Seeding automático al iniciar
command: sh -c "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"
# users-srv usa: npx prisma db push --accept-data-loss --skip-generate && npx prisma db seed && node dist/src/main.js
```

**Servicios con TypeORM** (auth-svc, driver-ms):
```typescript
// Las migraciones se ejecutan automáticamente al iniciar la aplicación
await app.get(DataSource).runMigrations();
```

**📚 Documentación:** Ver [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) para más detalles

### Seeding de Datos Iniciales

**¿Qué es el seeding?**
El seeding es el proceso de poblar la base de datos con datos iniciales necesarios para que la aplicación funcione correctamente (usuarios de prueba, roles, catálogos, etc.).

**Servicios con Prisma**:

Archivos de seed ubicados en `prisma/seed.ts`:
- `users-srv/prisma/seed.ts` - Usuarios y roles iniciales (admin, supervisor, driver)
- `vehicles-svc/prisma/seed.ts` - 20 modelos de vehículos con especificaciones completas

Configuración en `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Ejecución:
```bash
npx prisma db seed  # Ejecuta automáticamente en Docker
```

**Características de los seeds Prisma:**
- ✅ Idempotentes (usa `upsert` para evitar duplicados)
- ✅ TypeScript con type-safety
- ✅ Se ejecutan después de migraciones
- ✅ Automáticos en Docker Compose

**Servicios con TypeORM** (driver-ms):

Archivo de seed: `services/driver-ms/seed.sql`
```sql
-- Solo contiene INSERTs con ON CONFLICT DO NOTHING
INSERT INTO drivers(user_id, full_name, phone_number, email, availability)
VALUES (1, 'Juan Pérez', '+593999999999', 'juan.perez@example.com', 'AVAILABLE')
ON CONFLICT (user_id) DO NOTHING;
```

Ejecución mediante script de entrada:
```bash
# docker-entrypoint.sh
# 1. Inicia la aplicación (TypeORM crea tablas automáticamente)
# 2. Espera 10 segundos
# 3. Ejecuta seed.sql con psql en background
```

**Características de los seeds TypeORM:**
- ✅ Idempotentes (usa `ON CONFLICT DO NOTHING`)
- ✅ Se ejecutan después de que TypeORM crea las tablas
- ✅ No bloquean el arranque del servicio
- ✅ Logs claros de éxito/error

**⚠️ Importante:**
- Los seeds solo se ejecutan en **desarrollo** y **staging**
- En **producción**, los datos reales son cargados por otros procesos
- Todos los seeds son idempotentes (se pueden ejecutar múltiples veces sin causar errores)

### Backups

**Automáticos** (Azure PostgreSQL):
- Diarios con retención de 7-35 días
- Point-in-time restore hasta el último segundo

**Manuales**:
```bash
# Backup on-demand
az postgres flexible-server backup create \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --backup-name manual-backup-$(date +%Y%m%d)
```

## 🔐 Seguridad

### Network Security

```
┌─────────────────────────────────────────┐
│  AKS Virtual Network (10.0.0.0/16)      │
│  ┌────────────────────────────────┐     │
│  │ Subnet: aks-subnet             │     │
│  │ (10.0.1.0/24)                  │     │
│  │ - Network Policies enabled     │     │
│  │ - Private IPs only             │     │
│  └────────────┬───────────────────┘     │
│               │                          │
│               │ Private Endpoint         │
│               ▼                          │
│  ┌────────────────────────────────┐     │
│  │ Subnet: db-subnet              │     │
│  │ (10.0.2.0/24)                  │     │
│  │ - Private Endpoint to Postgres │     │
│  │ - No public access             │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

### Secrets Management

```yaml
# En AKS - Kubernetes Secrets
apiVersion: v1
kind: Secret
metadata:
  name: postgresql-credentials
type: Opaque
data:
  username: <base64-encoded>
  password: <base64-encoded>
  connection-string: <base64-encoded>
```

**Alternativa con Azure Key Vault** (recomendado):
```yaml
# CSI Driver para Azure Key Vault
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-kvname-system-sync
spec:
  provider: azure
  parameters:
    keyvaultName: "fuel-system-kv"
    objects: |
      array:
        - |
          objectName: postgres-password
          objectType: secret
```

## 📊 Monitoreo

### Application Insights
- Trazas distribuidas de cada request
- Métricas de rendimiento
- Logs centralizados
- Detección de anomalías

### Azure Monitor
- Métricas de AKS (CPU, memoria, red)
- Métricas de PostgreSQL (conexiones, queries lentas)
- Alertas automáticas

### ELK Stack (en AKS)
- Elasticsearch: Almacenamiento de logs
- Logstash: Procesamiento de logs
- Kibana: Dashboards y visualización

## 💰 Estimación de Costos (Región East US)

| Componente | Especificación | Costo Mensual |
|------------|----------------|---------------|
| **AKS** | 3 nodos D2s_v3 | ~$220 |
| **PostgreSQL Flexible** | D4s_v3 + HA | ~$350 |
| **Storage (Premium SSD)** | 500 GB | ~$75 |
| **Load Balancer** | Standard | ~$20 |
| **Outbound Data** | 500 GB | ~$40 |
| **Application Insights** | 10 GB logs | ~$30 |
| **Container Registry** | Standard | ~$20 |
| **Total Estimado** | | **~$755/mes** |

## 🚀 Ventajas de Esta Arquitectura

### ✅ Separación de Responsabilidades
- **Aplicación**: Kubernetes se encarga solo de microservicios
- **Datos**: Azure administra backups, HA, seguridad

### ✅ Escalabilidad Independiente
- Escala microservicios sin afectar la BD
- Escala BD sin reiniciar microservicios

### ✅ Gestión Simplificada
- No necesitas administrar PostgreSQL en K8s
- Azure se encarga de parches, backups, HA

### ✅ Costos Optimizados
- Paga solo por los recursos que usas
- Autoescalado reduce costos en horas valle

### ✅ Alta Disponibilidad
- Zona-redundant para base de datos
- Multi-replica para microservicios

### ✅ Seguridad
- Private endpoints (sin acceso público)
- SSL/TLS obligatorio
- Network isolation

## 📚 Referencias

- [Azure Kubernetes Service](https://docs.microsoft.com/en-us/azure/aks/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/)
- [AKS Best Practices](https://docs.microsoft.com/en-us/azure/aks/best-practices)
- [Microservices Architecture](https://microservices.io/)

---

**Esta arquitectura está lista para producción** ✅

