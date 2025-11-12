# 📖 Referencia de Configuración - Fuel System

## 📋 Tabla de Contenidos

- [1. Variables de Entorno (ConfigMap)](#1-variables-de-entorno-configmap)
  - [1.1 Configuración General](#11-configuración-general)
  - [1.2 Service Discovery (Eureka)](#12-service-discovery-eureka)
  - [1.3 Microservicios - Nombres y Puertos](#13-microservicios---nombres-y-puertos)
  - [1.4 PostgreSQL](#14-postgresql)
  - [1.5 RabbitMQ](#15-rabbitmq)
  - [1.6 Elasticsearch](#16-elasticsearch)
  - [1.7 Outbox Pattern](#17-outbox-pattern)
- [2. Secrets](#2-secrets)
  - [2.1 PostgreSQL Credentials](#21-postgresql-credentials)
  - [2.2 RabbitMQ Credentials](#22-rabbitmq-credentials)
  - [2.3 JWT Secret](#23-jwt-secret)
  - [2.4 SMTP Credentials](#24-smtp-credentials)
- [3. Arquitectura de Servicios](#3-arquitectura-de-servicios)
- [4. Puertos y Endpoints](#4-puertos-y-endpoints)
- [5. Cómo Modificar la Configuración](#5-cómo-modificar-la-configuración)

---

## 1. Variables de Entorno (ConfigMap)

Todas las variables de configuración no sensibles se almacenan en el ConfigMap `fuel-system-config`.

### 1.1 Configuración General

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `NODE_ENV` | `development` / `production` | Entorno de ejecución de Node.js |
| `LOG_LEVEL` | `info` | Nivel de logging (info, debug, warn, error) |
| `SERVICE_BIND_HOST` | `0.0.0.0` | Dirección IP en la que los servicios escuchan |
| `PROTO_ROOT` | `/app/protos` | Ruta raíz de los archivos .proto |
| `PROTOS_DIR` | `/app/protos` | Directorio de archivos .proto |
| `FRONTEND_URL` | `http://localhost:5174` | URL del frontend para CORS y emails |

### 1.2 Service Discovery (Eureka)

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DISCOVERY_MODE` | `eureka` | Modo de descubrimiento de servicios (eureka / static) |
| `EUREKA_HOST` | `eureka-server` | Hostname del servidor Eureka |
| `EUREKA_PORT` | `8761` | Puerto del servidor Eureka |
| `EUREKA_BASE_PATH` | `/eureka` | Path base de la API de Eureka |
| `EUREKA_WAIT_TIMEOUT_MS` | `15000` | Timeout en ms para esperar conexión a Eureka |

**⚠️ IMPORTANTE**: Si `DISCOVERY_MODE` = `eureka`, todos los microservicios se registrarán automáticamente en Eureka al iniciar.

### 1.3 Microservicios - Nombres y Puertos

#### 1.3.1 API Gateway

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `GATEWAY_APP_NAME` | `API-GATEWAY` | Nombre de registro en Eureka |
| `GATEWAY_HTTP_PORT` | `8080` | Puerto HTTP del gateway |
| `GRPC_CALL_TIMEOUT_MS` | `5000` | Timeout para llamadas gRPC en ms |
| `JWT_SECRET` | *(desde secret)* | Secret para verificar tokens JWT (obtiene del secret `fuel-system-jwt`) |
| `JWT_EXPIRES_IN` | `1h` | Tiempo de expiración de tokens JWT |

**🔑 Variables adicionales específicas (definidas directamente en el deployment)**:
- `JWT_SECRET`: Secret para verificar tokens JWT (se obtiene del secret `fuel-system-jwt`)
- `JWT_EXPIRES_IN`: Tiempo de expiración de tokens JWT (default: `1h`)

**⚠️ CRÍTICO**: El API Gateway necesita `JWT_SECRET` para validar los tokens JWT en rutas protegidas. Este valor **DEBE ser el mismo** que usa el Auth Service para firmar los tokens.

#### 1.3.2 Auth Service

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `AUTH_APP_NAME` | `AUTH-SERVICE` | Nombre de registro en Eureka |
| `AUTH_GRPC_PORT` | `50052` | Puerto gRPC del servicio de autenticación |
| `AUTH_DB_HOST` | `auth-db-postgresql` | Host de la base de datos de auth |
| `AUTH_DB_PORT` | `5432` | Puerto de la base de datos |
| `AUTH_DB_NAME` | `auth_db` | Nombre de la base de datos |
| `JWT_SECRET` | *(desde secret)* | Secret para firmar/verificar tokens JWT |
| `JWT_EXPIRES_IN` | `1h` | Tiempo de expiración de tokens JWT |
| `AUTH_SERVICE_REGISTER_HOST` | *(auto-generado)* | Hostname usado para registrarse en Eureka |

#### 1.3.3 Driver Service

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DRIVER_APP_NAME` | `DRIVER-SERVICE` | Nombre de registro en Eureka |
| `DRIVER_GRPC_PORT` | `50062` | Puerto gRPC del servicio de conductores |
| `DRIVER_HTTP_PORT` | `3100` | Puerto HTTP REST del servicio |
| `DRIVER_DB_HOST` | `driver-db-postgresql` | Host de la base de datos de drivers |
| `DRIVER_DB_PORT` | `5432` | Puerto de la base de datos |
| `DRIVER_DB_NAME` | `driver_db` | Nombre de la base de datos |
| `DRIVER_DB_SYNCHRONIZE` | `false` | Sincronización automática de TypeORM (⚠️ SIEMPRE false en producción) |
| `DRIVER_DB_LOGGING` | `false` | Logging de queries de TypeORM |
| `DRIVER_NODE_ENV` | `development` / `production` | Entorno específico de driver service |
| `JWT_SECRET` | *(desde secret)* | Secret para verificar tokens JWT en rutas protegidas |
| `JWT_EXPIRES_IN` | `1h` | Tiempo de expiración de tokens JWT |

#### 1.3.4 Users Service

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `USERS_APP_NAME` | `USERS-SERVICE` | Nombre de registro en Eureka |
| `USERS_GRPC_PORT` | `50057` | Puerto gRPC del servicio de usuarios |
| `USERS_DB_HOST` | `users-db-postgresql` | Host de la base de datos de usuarios |
| `USERS_DB_PORT` | `5432` | Puerto de la base de datos |
| `USERS_DB_NAME` | `users_db` | Nombre de la base de datos |
| `JWT_SECRET` | *(desde secret)* | Secret para verificar tokens JWT en rutas protegidas |
| `JWT_EXPIRES_IN` | `1h` | Tiempo de expiración de tokens JWT |

#### 1.3.5 Vehicles Service

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `VEHICLES_APP_NAME` | `VEHICLES-SERVICE` | Nombre de registro en Eureka |
| `VEHICLES_GRPC_PORT` | `50055` | Puerto gRPC del servicio de vehículos |
| `VEHICLES_DB_HOST` | `vehicles-db-postgresql` | Host de la base de datos de vehículos |
| `VEHICLES_DB_PORT` | `5432` | Puerto de la base de datos |
| `VEHICLES_DB_NAME` | `vehicles_db` | Nombre de la base de datos |
| `JWT_SECRET` | *(desde secret)* | Secret para verificar tokens JWT en rutas protegidas |
| `JWT_EXPIRES_IN` | `1h` | Tiempo de expiración de tokens JWT |

**Shadow Database**: Para migraciones de Prisma, existe una base de datos shadow adicional:
- Host: `vehicles-shadow-db-postgresql`
- Nombre: `vehicles_shadow_db`

#### 1.3.6 Email Service

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `EMAIL_APP_NAME` | `EMAIL-SERVICE` | Nombre de registro en Eureka |
| `EMAIL_GRPC_PORT` | `50053` | Puerto gRPC del servicio de email |
| `JWT_SECRET` | *(desde secret)* | Secret para verificar tokens JWT en rutas protegidas |
| `JWT_EXPIRES_IN` | `1h` | Tiempo de expiración de tokens JWT |

#### 1.3.7 Logger Service

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `LOGGER_APP_NAME` | `LOGGER-SERVICE` | Nombre de registro en Eureka |
| `LOGGER_GRPC_PORT` | `50058` | Puerto gRPC del servicio de logging |
| `JWT_SECRET` | *(desde secret)* | Secret para verificar tokens JWT en rutas protegidas |
| `JWT_EXPIRES_IN` | `1h` | Tiempo de expiración de tokens JWT |

#### 1.3.8 Hello Service (Opcional)

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `HELLO_APP_NAME` | `HELLO-SERVICE` | Nombre de registro en Eureka |
| `HELLO_GRPC_PORT` | `50051` | Puerto gRPC del servicio de prueba |

### 1.4 PostgreSQL

#### 1.4.1 Configuración General

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `POSTGRESQL_HOST` | `postgres` | Host genérico (fallback) |
| `POSTGRESQL_PORT` | `5432` | Puerto estándar de PostgreSQL |

**⚠️ NOTA**: En el deployment actual, cada microservicio tiene su propia instancia de PostgreSQL con un host específico. El `POSTGRESQL_HOST` genérico es solo un fallback.

#### 1.4.2 Bases de Datos por Microservicio

| Microservicio | Host | Puerto | Base de Datos | Propósito |
|---------------|------|--------|---------------|-----------|
| **Auth** | `auth-db-postgresql` | `5432` | `auth_db` | Autenticación y tokens |
| **Driver** | `driver-db-postgresql` | `5432` | `driver_db` | Datos de conductores y licencias |
| **Users** | `users-db-postgresql` | `5432` | `users_db` | Usuarios y roles |
| **Vehicles** | `vehicles-db-postgresql` | `5432` | `vehicles_db` | Vehículos y modelos |
| **Vehicles Shadow** | `vehicles-shadow-db-postgresql` | `5432` | `vehicles_shadow_db` | DB temporal para migraciones de Prisma |

**🔐 Credenciales**: Las credenciales de PostgreSQL se almacenan en secrets (ver sección 2.1).

**🏗️ Arquitectura**:
- **Kubernetes Local (Kind)**: Cada base de datos es una instancia separada de PostgreSQL (pods individuales)
- **Azure**: Todas las bases de datos están en un solo Azure Database for PostgreSQL Flexible Server

### 1.5 RabbitMQ

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `RABBITMQ_HOST` | `rabbitmq.fuel-system.svc.cluster.local` | Hostname del servicio RabbitMQ |
| `RABBITMQ_PORT` | `5672` | Puerto AMQP de RabbitMQ |
| `RABBITMQ_MANAGEMENT_PORT` | `15672` | Puerto del panel de administración web |
| `RABBITMQ_USERNAME` | `admin` | Usuario de RabbitMQ (⚠️ cambiar en producción) |
| `RABBITMQ_PASSWORD` | `admin123` | Contraseña de RabbitMQ (⚠️ cambiar en producción) |

**🔐 IMPORTANTE**: Aunque estas credenciales están en el ConfigMap para conveniencia en desarrollo, **DEBEN almacenarse en Secrets en producción**.

**📡 Acceso al Panel Web**:
- **Kubernetes Local**: `http://localhost:31672` (NodePort)
- **Producción**: A través de Ingress o Port-Forward

### 1.6 Elasticsearch

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `ELASTICSEARCH_HOST` | `elasticsearch-master.fuel-system.svc.cluster.local` | Hostname del cluster Elasticsearch |
| `ELASTICSEARCH_PORT` | `9200` | Puerto HTTP de Elasticsearch |
| `ELASTICSEARCH_NODE` | `http://elasticsearch-master.fuel-system.svc.cluster.local:9200` | URL completa del nodo |

**📊 Propósito**: Almacenamiento centralizado de logs de todos los microservicios.

**📡 Acceso**:
- **Kubernetes Local**: `http://localhost:30920` (NodePort)
- **Producción**: A través de Ingress o Port-Forward

### 1.7 Outbox Pattern

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `OUTBOX_EXCHANGE` | `service.events` | Nombre del exchange de RabbitMQ para eventos |
| `PUBLISH_BATCH` | `20` | Número de mensajes a publicar por lote |
| `POLL_MS` | `500` | Intervalo de polling en milisegundos |
| `OUTBOX_PUBLISHER_PORT` | `4100` | Puerto del servicio publisher |

**📝 Descripción**: El patrón Outbox garantiza la consistencia eventual entre la base de datos y RabbitMQ al publicar eventos.

---

## 2. Secrets

Los secrets almacenan información sensible codificada en Base64.

### 2.1 PostgreSQL Credentials

**Secret Name**: `fuel-system-postgresql`

| Key | Descripción | Valor Local | Valor Producción |
|-----|-------------|-------------|------------------|
| `username` | Usuario de PostgreSQL | `postgres` | **Configurar** |
| `password` | Contraseña de PostgreSQL | `root` | **Configurar** |

**🔐 Secrets Adicionales por Base de Datos** (para despliegues con instancias separadas):

| Secret Name | Base de Datos |
|-------------|---------------|
| `auth-db-postgresql` | Auth Database |
| `driver-db-postgresql` | Driver Database |
| `users-db-postgresql` | Users Database |
| `vehicles-db-postgresql` | Vehicles Database |
| `vehicles-shadow-db-postgresql` | Vehicles Shadow Database |

### 2.2 RabbitMQ Credentials

**Secret Name**: `fuel-system-rabbitmq`

| Key | Descripción | Valor Local | Valor Producción |
|-----|-------------|-------------|------------------|
| `username` | Usuario de RabbitMQ | `admin` | **Configurar** |
| `password` | Contraseña de RabbitMQ | `admin123` | **Configurar** |

**⚠️ IMPORTANTE**: También existe el secret `rabbitmq` creado por el Helm chart de Bitnami.

### 2.3 JWT Secret

**Secret Name**: `fuel-system-jwt`

| Key | Descripción | Valor Local | Valor Producción |
|-----|-------------|-------------|------------------|
| `secret` | Clave secreta para firmar tokens JWT | `your-super-secret-jwt-key-change-in-production-12345` | **Configurar** (min 32 caracteres) |

**🔑 Generar en Producción**:
```bash
openssl rand -base64 32
```

**⏱️ Expiración**: Los tokens JWT expiran en `1h` (configurable mediante variable de entorno `JWT_EXPIRES_IN`).

### 2.4 SMTP Credentials

**Secret Name**: `fuel-system-smtp`

| Key | Descripción | Valor Local | Valor Producción |
|-----|-------------|-------------|------------------|
| `host` | Servidor SMTP | `smtp.gmail.com` | **Configurar** |
| `port` | Puerto SMTP | `587` | `587` / `465` |
| `user` | Usuario/Email SMTP | *vacío* | **Configurar** |
| `password` | Contraseña/App Password SMTP | *vacío* | **Configurar** |

**📧 Para Gmail**:
1. Activar "Verificación en 2 pasos"
2. Generar "Contraseña de aplicación" en la configuración de seguridad
3. Usar esa contraseña en el secret

---

## 3. Arquitectura de Servicios

### 3.1 Servicios Desplegados

| Servicio | Tipo | Propósito | ORM/Framework |
|----------|------|-----------|---------------|
| **API Gateway** | Gateway | Punto de entrada único HTTP → gRPC | NestJS |
| **Auth Service** | Microservicio | Autenticación y autorización (JWT) | TypeORM + PostgreSQL |
| **Driver Service** | Microservicio | Gestión de conductores y licencias | TypeORM + PostgreSQL |
| **Users Service** | Microservicio | Gestión de usuarios y roles | Prisma + PostgreSQL |
| **Vehicles Service** | Microservicio | Gestión de vehículos y modelos | Prisma + PostgreSQL |
| **Email Service** | Microservicio | Envío de emails | NestJS + SMTP |
| **Logger Service** | Microservicio | Centralización de logs | Elasticsearch |
| **Publisher Service** | Microservicio | Publicación de eventos (Outbox Pattern) | TypeORM + RabbitMQ |
| **Eureka Server** | Infraestructura | Service Discovery | Spring Cloud Eureka |

### 3.2 Servicios de Infraestructura

| Servicio | Instancias | Propósito | Acceso |
|----------|-----------|-----------|---------|
| **PostgreSQL** | 5 (auth, driver, users, vehicles, shadow) | Base de datos relacional | ClusterIP (interno) |
| **RabbitMQ** | 1 (con réplica opcional) | Message Broker | NodePort `30672` (AMQP), `31672` (Web UI) |
| **Elasticsearch** | 1 (master) | Almacenamiento de logs | NodePort `30920` |
| **Eureka Server** | 1 | Service Discovery | NodePort `30761` |

---

## 4. Puertos y Endpoints

### 4.1 Puertos Internos (ClusterIP)

| Servicio | Puerto gRPC | Puerto HTTP | Propósito |
|----------|-------------|-------------|-----------|
| Auth Service | `50052` | - | gRPC |
| Driver Service | `50062` | `3100` | gRPC + REST |
| Users Service | `50057` | - | gRPC |
| Vehicles Service | `50055` | - | gRPC |
| Email Service | `50053` | - | gRPC |
| Logger Service | `50058` | - | gRPC |
| Hello Service | `50051` | - | gRPC (testing) |
| Publisher Service | `4100` | `4100` | HTTP |

### 4.2 Puertos Externos (NodePort)

| Servicio | Puerto Interno | NodePort | Acceso Local |
|----------|---------------|----------|--------------|
| **API Gateway** | `8080` | `30000` | `http://localhost:30000` |
| **Eureka Server** | `8761` | `30761` | `http://localhost:30761` |
| **RabbitMQ AMQP** | `5672` | `30672` | `amqp://localhost:30672` |
| **RabbitMQ Management** | `15672` | `31672` | `http://localhost:31672` |
| **Elasticsearch** | `9200` | `30920` | `http://localhost:30920` |

### 4.3 Endpoints del API Gateway

El API Gateway expone endpoints REST que se comunican internamente con los microservicios vía gRPC:

| Path | Microservicio Destino | Descripción |
|------|----------------------|-------------|
| `/api/auth/**` | Auth Service | Autenticación y autorización |
| `/api/users/**` | Users Service | Gestión de usuarios |
| `/api/vehicles/**` | Vehicles Service | Gestión de vehículos |
| `/api/drivers/**` | Driver Service | Gestión de conductores |
| `/api/email/**` | Email Service | Envío de emails |
| `/api/hello/**` | Hello Service | Endpoints de prueba |

**🌐 Acceso en Kubernetes Local**:
```
http://localhost:30000/api/...
```

### 4.4 Endpoints de Infraestructura

#### Eureka Dashboard
```
http://localhost:30761
```
Muestra todos los microservicios registrados.

#### RabbitMQ Management
```
http://localhost:31672
Usuario: admin
Contraseña: admin123
```

#### Elasticsearch
```
http://localhost:30920
```

---

## 5. Cómo Modificar la Configuración

### 5.1 Modificar Variables de Entorno (ConfigMap)

**Opción 1: Editar `values.yaml` o `values-local.yaml`**

```yaml
# deploy/local/values-local.yaml
secrets:
  postgresql:
    username: "new_user"
    password: "new_password"
  rabbitmq:
    username: "new_rabbitmq_user"
    password: "new_rabbitmq_password"
  jwt:
    secret: "nuevo-secret-super-seguro-de-al-menos-32-caracteres"
```

**Opción 2: Aplicar cambios con Helm**

```bash
cd deploy/local
helm upgrade fuel-system ../helm/fuel-system \
  --namespace fuel-system \
  --values values-local.yaml
```

### 5.2 Modificar Secrets Directamente

```bash
# Ver secret actual
kubectl get secret fuel-system-postgresql -n fuel-system -o yaml

# Editar secret
kubectl edit secret fuel-system-postgresql -n fuel-system

# O eliminar y recrear
kubectl delete secret fuel-system-postgresql -n fuel-system
kubectl create secret generic fuel-system-postgresql \
  --from-literal=username=nuevo_usuario \
  --from-literal=password=nueva_contraseña \
  -n fuel-system
```

**⚠️ IMPORTANTE**: Después de modificar secrets, **reinicia los pods** para que lean los nuevos valores:

```bash
kubectl rollout restart deployment/fuel-system-auth-service -n fuel-system
kubectl rollout restart deployment/fuel-system-users-service -n fuel-system
# ... etc
```

### 5.3 Modificar ConfigMap Directamente

```bash
# Editar ConfigMap
kubectl edit configmap fuel-system-config -n fuel-system

# Reiniciar pods para aplicar cambios
kubectl rollout restart deployment -n fuel-system -l app.kubernetes.io/instance=fuel-system
```

### 5.4 Variables Específicas por Microservicio

Algunos microservicios tienen variables adicionales que se pasan directamente en sus templates de Helm:

**Auth Service** (`auth-service.yaml`):
- `AUTH_SERVICE_REGISTER_HOST`
- `BIND_HOST`
- `JWT_EXPIRES_IN`

**Driver Service** (`microservices.yaml`):
- `BIND_HOST`
- `DRIVER_DB_SYNCHRONIZE`
- `DRIVER_DB_LOGGING`

**Vehicles/Users Services**:
- `DATABASE_URL` (construida dinámicamente)
- `SHADOW_DATABASE_URL` (solo vehicles)

---

## 6. Checklist de Seguridad para Producción

Antes de desplegar a producción en Azure, **DEBES cambiar**:

### ✅ Secrets a Modificar

- [ ] `fuel-system-postgresql.password` → Contraseña segura
- [ ] `fuel-system-rabbitmq.username` y `.password` → Credenciales seguras
- [ ] `fuel-system-jwt.secret` → Generar con `openssl rand -base64 32`
- [ ] `fuel-system-smtp.user` y `.password` → Configurar con cuenta real

### ✅ Variables a Modificar

- [ ] `NODE_ENV` → `production`
- [ ] `LOG_LEVEL` → `warn` o `error` (no `debug`)
- [ ] `DRIVER_DB_SYNCHRONIZE` → **SIEMPRE** `false`
- [ ] `FRONTEND_URL` → URL real del frontend
- [ ] PostgreSQL hosts → URL de Azure Database for PostgreSQL
- [ ] `POSTGRESQL_PORT` → Puerto de Azure (usualmente `5432`)
- [ ] Agregar `sslmode=require` en connection strings

### ✅ Infraestructura

- [ ] Configurar Azure Database for PostgreSQL con SSL/TLS
- [ ] Configurar Azure Container Registry (ACR) para imágenes privadas
- [ ] Configurar Azure Key Vault para secrets (opcional pero recomendado)
- [ ] Configurar monitoreo con Azure Monitor
- [ ] Configurar backups automáticos de PostgreSQL
- [ ] Configurar alertas para servicios críticos

---

## 7. Troubleshooting

### Problema: Microservicio no se registra en Eureka

**Verificar**:
1. `DISCOVERY_MODE` = `eureka` en ConfigMap
2. `EUREKA_HOST` apunta a `eureka-server`
3. Variable específica del servicio (ej: `AUTH_SERVICE_REGISTER_HOST`) existe
4. Variable `BIND_HOST` = `0.0.0.0`

**Logs**:
```bash
kubectl logs -n fuel-system -l app.kubernetes.io/component=auth-service
```

### Problema: No puede conectarse a PostgreSQL

**Verificar**:
1. Host específico de la DB (ej: `AUTH_DB_HOST`) apunta al servicio correcto
2. Secret `fuel-system-postgresql` tiene credenciales correctas
3. Puerto es `5432`
4. Base de datos existe (`AUTH_DB_NAME`, etc.)

**Verificar conectividad**:
```bash
kubectl run -it --rm debug --image=postgres:16 --restart=Never -- \
  psql -h auth-db-postgresql -U postgres -d auth_db
```

### Problema: Error "Missing hostname" en Eureka

**Causa**: Falta la variable `AUTH_SERVICE_REGISTER_HOST` o similar.

**Solución**: Verificar que el template del servicio inyecta:
- `AUTH_SERVICE_REGISTER_HOST` (para auth-service)
- `SERVICE_REGISTER_HOST` (fallback)
- `REGISTER_HOST` (fallback)
- `BIND_HOST` (para gRPC bind)

### Problema: RabbitMQ no accesible

**Verificar**:
```bash
kubectl get svc rabbitmq -n fuel-system
kubectl port-forward svc/rabbitmq 15672:15672 -n fuel-system
```

Acceder a `http://localhost:15672` con credenciales del ConfigMap.

---

## 8. Referencias Adicionales

- **Arquitectura del Sistema**: `deploy/ARCHITECTURE.md`
- **Guía de Deployment**: `deploy/DEPLOY_README.md`
- **Guía de Migraciones**: `deploy/MIGRATIONS_GUIDE.md`
- **Estrategia de Seeding**: `deploy/SEEDING_STRATEGY.md`
- **Comandos Rápidos Local**: `deploy/local/README.md`

---

**Última actualización**: 2025-11-10  
**Versión del Chart**: 1.1.0  
**Namespace**: `fuel-system`
