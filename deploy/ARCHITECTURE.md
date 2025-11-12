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
│  │  │          │  │          │  │          │           │       │
│  │  │Vehicles  │  │Routes    │  │Email     │  Logger   │       │
│  │  │Service   │  │Service   │  │Service   │  Service  │       │
│  │  │(HPA 2-5) │  │(HPA 2-5) │  │(2 rep.)  │  (2 rep.) │       │
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
│  ┌──────────┐  ┌─────────────────────┐                        │
│  │routes_db │  │vehicles_shadow_db   │                        │
│  │          │  │(migrations only)    │                        │
│  └──────────┘  └─────────────────────┘                        │
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
- ✅ Microservicios (auth, driver, users, vehicles, routes, email, logger, publisher)
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
5. `routes_db` - Rutas y viajes
6. `vehicles_shadow_db` - DB shadow para migraciones de Prisma

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

### PostgreSQL
- ✅ Zona-redundante (HA mode)
- ✅ Backups automáticos con retención de 7-35 días
- ✅ Réplicas de lectura en diferentes regiones
- ✅ Failover automático

## 🔄 Flujo de Datos

### 1. Solicitud HTTP → API Gateway

```
Cliente → Azure ALB → Ingress Controller → API Gateway
```

### 2. API Gateway → Microservicio (gRPC)

```
API Gateway → Eureka (lookup) → Microservicio gRPC
```

**Ejemplo:**
```typescript
// API Gateway descubre el servicio
const driverService = await eurekaClient.getInstancesByAppId('DRIVER-SERVICE');
// Llama al microservicio via gRPC
const response = await grpcClient.getDriver({ id: 1 });
```

### 3. Microservicio → Base de Datos

```
Microservicio → Private Endpoint → Azure PostgreSQL
```

**Ejemplo:**
```typescript
// Driver Service consulta su BD
const driver = await driverRepository.findOne({ id: 1 });
```

### 4. Eventos Asíncronos (Outbox Pattern)

```
Microservicio → Outbox Table → Publisher → RabbitMQ → Subscriber
```

**Ejemplo:**
```typescript
// 1. Driver Service guarda evento en outbox
await outboxRepository.save({
  eventType: 'DRIVER_CREATED',
  payload: { id: 1, name: 'Juan' }
});

// 2. Publisher lee outbox y publica a RabbitMQ
publisherService.pollOutbox();

// 3. Logger Service escucha y registra
loggerService.subscribeToDriverEvents();
```

## 📦 Microservicios

### Auth Service (TypeORM)
- **Puerto gRPC**: 50052
- **Base de Datos**: auth_db
- **Propósito**: Autenticación y generación de JWT
- **Init Container**: wait-for-db (synchronize:true en desarrollo)

### Driver Service (TypeORM)
- **Puerto gRPC**: 50062
- **Puerto HTTP**: 3100
- **Base de Datos**: driver_db
- **Propósito**: Gestión de conductores y licencias
- **Init Container**: Ejecuta init.sql, migrations/*.sql, seed.sql

### Users Service (Prisma)
- **Puerto gRPC**: 50057
- **Base de Datos**: users_db
- **Propósito**: Gestión de usuarios y roles
- **Init Container**: npx prisma db push && seed

### Vehicles Service (Prisma)
- **Puerto gRPC**: 50055
- **Base de Datos**: vehicles_db, vehicles_shadow_db
- **Propósito**: Gestión de vehículos y modelos
- **Init Container**: npx prisma migrate deploy && seed

### Routes Service (TypeORM)
- **Puerto gRPC**: 50056
- **Base de Datos**: routes_db
- **Propósito**: Gestión de rutas y viajes
- **Init Container**: Ejecuta db/init.sql (incluye seeding)

### Email Service
- **Puerto gRPC**: 50053
- **Propósito**: Envío de emails transaccionales
- **No requiere BD**

### Logger Service
- **Puerto gRPC**: 50058
- **Puerto HTTP**: 3200
- **Propósito**: Centralización de logs en Elasticsearch
- **Conexiones**: RabbitMQ, Elasticsearch

### Publisher Service (Outbox Pattern)
- **Puerto HTTP**: 4100
- **Propósito**: Publicar eventos desde outbox tables a RabbitMQ
- **Conexiones**: PostgreSQL (todas las DBs), RabbitMQ

## 🚀 Estrategia de Despliegue

### Desarrollo Local (Kind)

```bash
# 1. Infraestructura separada
helm install auth-db bitnami/postgresql -n fuel-system --set ...
helm install driver-db bitnami/postgresql -n fuel-system --set ...
helm install users-db bitnami/postgresql -n fuel-system --set ...
helm install vehicles-db bitnami/postgresql -n fuel-system --set ...
helm install routes-db bitnami/postgresql -n fuel-system --set ...
helm install rabbitmq bitnami/rabbitmq -n fuel-system
helm install elasticsearch elastic/elasticsearch -n fuel-system

# 2. Microservicios
helm install fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/local/values-local.yaml
```

### Producción (Azure AKS)

```bash
# 1. Crear Azure PostgreSQL (una vez)
az postgres flexible-server create \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --database-names auth_db,driver_db,users_db,vehicles_db,routes_db,vehicles_shadow_db

# 2. Deploy a AKS (automático con GitHub Actions)
git push origin main
# → Build images → Push to ACR → Deploy to AKS
```

## 🔐 Seguridad

### Network Policies
- Microservicios solo pueden comunicarse entre sí
- Solo API Gateway expuesto externamente
- PostgreSQL accesible solo desde AKS (Private Endpoint)

### Secrets Management
- Credenciales en Kubernetes Secrets
- Azure Key Vault para producción
- JWT secrets rotados periódicamente

### SSL/TLS
- Ingress con certificado TLS
- PostgreSQL con sslmode=require
- gRPC con TLS (opcional en producción)

## 📊 Monitoreo y Observabilidad

### Logs
- Elasticsearch + Kibana
- Logger Service centraliza logs
- Retención: 30 días

### Métricas
- Prometheus (métricas de pods)
- Azure Monitor (infraestructura)
- Grafana (dashboards)

### Trazabilidad
- Correlation IDs en todas las requests
- Logs estructurados (JSON)
- Distributed tracing (futuro: Jaeger)

## 🔗 Referencias

- [CONFIGURATION_REFERENCE.md](./CONFIGURATION_REFERENCE.md) - Variables de configuración
- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) - Estrategia de migraciones
- [SEEDING_STRATEGY.md](./SEEDING_STRATEGY.md) - Estrategia de seeding
- [DEPLOY_README.md](./DEPLOY_README.md) - Guía de despliegue
