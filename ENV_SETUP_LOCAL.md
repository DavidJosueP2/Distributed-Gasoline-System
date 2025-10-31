# 🔧 Configuración de Variables de Entorno - DESARROLLO LOCAL

Este archivo documenta la configuración completa de variables de entorno para **desarrollo local**.

## 📋 Entorno: LOCAL

- **Microservicios**: Corren con `npm run dev` (fuera de Docker)
- **Infraestructura**: PostgreSQL, RabbitMQ, Elasticsearch, Eureka en Docker
- **Comando**: `docker-compose -f docker-compose.infra.yml up -d`

---

## 📝 Archivo `.env` en la raíz del proyecto

Crea un archivo `.env` en la raíz con el siguiente contenido:

```bash
# ==============================================
# FUEL SYSTEM - Environment Variables (LOCAL)
# ==============================================

# ---------- General ----------
NODE_ENV=development
LOG_LEVEL=debug

# ---------- Service Discovery (Eureka) ----------
DISCOVERY_MODE=eureka
EUREKA_HOST=localhost
EUREKA_PORT=8761
EUREKA_BASE_PATH=/eureka
EUREKA_WAIT_TIMEOUT_MS=15000

# ---------- Rutas comunes (Proto files) ----------
PROTO_ROOT=../../protos
PROTOS_DIR=../../protos

# ---------- JWT Authentication ----------
JWT_SECRET=your-super-secret-jwt-key-change-me-in-production-min-32-chars
JWT_EXPIRES_IN=1h

# ---------- API Gateway ----------
GATEWAY_APP_NAME=API-GATEWAY
GATEWAY_HTTP_PORT=8080
GRPC_CALL_TIMEOUT_MS=5000

# ---------- Default Microservice Settings ----------
SERVICE_BIND_HOST=0.0.0.0
SERVICE_REGISTER_HOST=127.0.0.1

# ==============================================
# MICROSERVICES CONFIGURATION
# ==============================================

# ---------- Hello Service ----------
HELLO_APP_NAME=HELLO-SERVICE
HELLO_GRPC_PORT=50051

# ---------- Auth Service ----------
AUTH_APP_NAME=AUTH-SERVICE
AUTH_SERVICE_REGISTER_HOST=127.0.0.1
AUTH_GRPC_PORT=50052

# ---------- Email Service ----------
EMAIL_APP_NAME=EMAIL-SERVICE
EMAIL_SERVICE_REGISTER_HOST=127.0.0.1
EMAIL_GRPC_PORT=50053

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FRONTEND_URL=http://localhost:5173

# ---------- Vehicles Service ----------
VEHICLES_APP_NAME=VEHICLES-SERVICE
VEHICLES_GRPC_PORT=50055

# ---------- Users Service ----------
USERS_APP_NAME=USERS-SERVICE
USERS_GRPC_PORT=50057

# ---------- Logger Service ----------
LOGGER_APP_NAME=LOGGER-SERVICE
LOGGER_GRPC_PORT=50058

# ---------- Driver Service ----------
DRIVER_APP_NAME=DRIVER-SERVICE
DRIVER_HTTP_PORT=3100
DRIVER_GRPC_PORT=50062
DRIVER_NODE_ENV=development

# ==============================================
# DATABASE CONFIGURATION (Local Development)
# ==============================================
# Conexión a PostgreSQL corriendo en Docker
# Los puertos están mapeados a localhost

# ---------- Auth Database ----------
AUTH_DB_HOST=localhost
AUTH_DB_PORT=5433
AUTH_DB_USER=postgres
AUTH_DB_PASS=root
AUTH_DB_NAME=auth
AUTH_DATABASE_URL=postgresql://postgres:root@localhost:5433/auth?schema=public

# ---------- Users Database ----------
USERS_DB_HOST=localhost
USERS_DB_PORT=5434
USERS_DB_USER=postgres
USERS_DB_PASS=admin
USERS_DB_NAME=users
# URL completa para Prisma CLI (generate, migrate, studio)
USERS_DATABASE_URL=postgresql://postgres:admin@localhost:5434/users?schema=public

# ---------- Vehicles Database ----------
VEHICLES_DB_HOST=localhost
VEHICLES_DB_PORT=5435
VEHICLES_DB_USER=postgres
VEHICLES_DB_PASS=admin
VEHICLES_DB_NAME=vehicles
# URL principal para Prisma CLI (vehicles-svc usa DATABASE_URL)
DATABASE_URL=postgresql://postgres:admin@localhost:5435/vehicles?schema=public
# Shadow database para Prisma migrations (desarrollo)
SHADOW_DATABASE_URL=postgresql://postgres:admin@localhost:5435/vehicles_shadow?schema=public

# ---------- Driver Database ----------
DRIVER_DB_HOST=localhost
DRIVER_DB_PORT=5436
DRIVER_DB_USER=postgres
DRIVER_DB_PASS=admin
DRIVER_DB_NAME=drivers
DRIVER_DATABASE_URL=postgresql://postgres:admin@localhost:5436/drivers?schema=public
DRIVER_DB_SYNCHRONIZE=false
DRIVER_DB_LOGGING=true

# ==============================================
# MESSAGE BROKER (RabbitMQ)
# ==============================================
# Corriendo en Docker, expuesto en localhost

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Outbox Pattern Configuration
OUTBOX_EXCHANGE=service.events
OUTBOX_DBS=postgresql://postgres:admin@localhost:5434/users
OUTBOX_PUBLISHER_PORT=4100
PUBLISH_BATCH=20
POLL_MS=500

# ==============================================
# ELASTICSEARCH & KIBANA (Logs)
# ==============================================
# Corriendo en Docker, expuesto en localhost

ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200

KIBANA_HOST=localhost
KIBANA_PORT=5601
```

---

## 🎯 Uso en Prisma Services

### Para `users-srv`:

El servicio leerá `USERS_DATABASE_URL` del `.env` del root.

Crear `.env` en `services/users-srv/.env` (symlink o copia):

```bash
# Este archivo puede ser un symlink al root o tener solo:
USERS_DATABASE_URL=postgresql://postgres:admin@localhost:5434/users?schema=public
```

### Para `vehicles-svc`:

El servicio leerá `DATABASE_URL` y `SHADOW_DATABASE_URL` del `.env` del root.

Crear `.env` en `services/vehicles-svc/.env` (symlink o copia):

```bash
# Este archivo puede ser un symlink al root o tener solo:
DATABASE_URL=postgresql://postgres:admin@localhost:5435/vehicles?schema=public
SHADOW_DATABASE_URL=postgresql://postgres:admin@localhost:5435/vehicles_shadow?schema=public
```

---

## 🚀 Comandos de Inicio

```bash
# 1. Iniciar infraestructura en Docker
docker-compose -f docker-compose.infra.yml up -d

# 2. Esperar a que PostgreSQL esté listo
docker-compose -f docker-compose.infra.yml ps

# 3. Generar Prisma Clients (desde cada servicio)
cd services/users-srv
npx prisma generate
npx prisma migrate deploy

cd ../vehicles-svc
npx prisma generate
npx prisma migrate deploy

# 4. Iniciar microservicios (en terminales separadas)
cd services/api-gateway && npm run dev
cd services/auth-svc && npm run dev
cd services/users-srv && npm run dev
cd services/vehicles-svc && npm run dev
# ... etc
```

---

## ✅ Verificación

- **Eureka**: http://localhost:8761
- **RabbitMQ**: http://localhost:15672 (guest/guest)
- **Kibana**: http://localhost:5601
- **API Gateway**: http://localhost:8080

