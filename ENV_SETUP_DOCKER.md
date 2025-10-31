# 🐳 Configuración de Variables de Entorno - DOCKER COMPLETO

Este archivo documenta la configuración completa de variables de entorno para **despliegue local con Docker**.

## 📋 Entorno: DOCKER

- **Todo dockerizado**: Microservicios + Infraestructura en contenedores
- **Comando**: `docker-compose up -d`
- **Archivo**: `docker-compose.yml` (ya configurado con `env_file: .env`)

---

## 📝 Archivo `.env` en la raíz del proyecto

Crea un archivo `.env` en la raíz con el siguiente contenido:

```bash
# ==============================================
# FUEL SYSTEM - Environment Variables (DOCKER)
# ==============================================

# ---------- General ----------
NODE_ENV=development
LOG_LEVEL=debug

# ---------- Service Discovery (Eureka) ----------
DISCOVERY_MODE=eureka
EUREKA_HOST=eureka-server
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
SERVICE_REGISTER_HOST=fuel-api-gateway

# ==============================================
# MICROSERVICES CONFIGURATION
# ==============================================

# ---------- Hello Service ----------
HELLO_APP_NAME=HELLO-SERVICE
HELLO_GRPC_PORT=50051

# ---------- Auth Service ----------
AUTH_APP_NAME=AUTH-SERVICE
AUTH_SERVICE_REGISTER_HOST=fuel-auth-svc
AUTH_GRPC_PORT=50052

# ---------- Email Service ----------
EMAIL_APP_NAME=EMAIL-SERVICE
EMAIL_SERVICE_REGISTER_HOST=fuel-email-svc
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
# DATABASE CONFIGURATION (Docker Compose)
# ==============================================
# Usa nombres de servicio de Docker como host
# Los puertos internos son siempre 5432 dentro de la red de Docker

# ---------- Auth Database ----------
AUTH_DB_HOST=auth-db
AUTH_DB_PORT=5432
AUTH_DB_USER=postgres
AUTH_DB_PASS=root
AUTH_DB_NAME=auth
AUTH_DATABASE_URL=postgresql://postgres:root@auth-db:5432/auth?schema=public

# ---------- Users Database ----------
USERS_DB_HOST=users-db
USERS_DB_PORT=5432
USERS_DB_USER=postgres
USERS_DB_PASS=admin
USERS_DB_NAME=users
# URL completa para Prisma (usa nombre de servicio docker)
USERS_DATABASE_URL=postgresql://postgres:admin@users-db:5432/users?schema=public

# ---------- Vehicles Database ----------
VEHICLES_DB_HOST=vehicles-db
VEHICLES_DB_PORT=5432
VEHICLES_DB_USER=postgres
VEHICLES_DB_PASS=admin
VEHICLES_DB_NAME=vehicles
# URL principal para Prisma
DATABASE_URL=postgresql://postgres:admin@vehicles-db:5432/vehicles?schema=public
# Shadow database (usa el mismo servidor)
SHADOW_DATABASE_URL=postgresql://postgres:admin@vehicles-db:5432/vehicles_shadow?schema=public

# ---------- Driver Database ----------
DRIVER_DB_HOST=driver-db
DRIVER_DB_PORT=5432
DRIVER_DB_USER=postgres
DRIVER_DB_PASS=admin
DRIVER_DB_NAME=drivers
DRIVER_DATABASE_URL=postgresql://postgres:admin@driver-db:5432/drivers?schema=public
DRIVER_DB_SYNCHRONIZE=false
DRIVER_DB_LOGGING=false

# ==============================================
# MESSAGE BROKER (RabbitMQ)
# ==============================================
# Usa nombre de servicio Docker

RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Outbox Pattern Configuration
OUTBOX_EXCHANGE=service.events
OUTBOX_DBS=postgresql://postgres:admin@users-db:5432/users
OUTBOX_PUBLISHER_PORT=4100
PUBLISH_BATCH=20
POLL_MS=500

# ==============================================
# ELASTICSEARCH & KIBANA (Logs)
# ==============================================
# Usa nombre de servicio Docker

ELASTICSEARCH_NODE=http://elasticsearch:9200
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200

KIBANA_HOST=kibana
KIBANA_PORT=5601
```

---

## 🏗️ Cómo funciona con Prisma en Docker

### Problema:
Prisma necesita `DATABASE_URL` en **BUILD TIME** (para `prisma generate`) y en **RUNTIME** (para conectarse).

### Solución en Dockerfile:

Los Dockerfiles ya están configurados para:

1. **Build Stage**: Copiar `.env` temporal y ejecutar `prisma generate`
2. **Runtime Stage**: Usar variables de entorno de Docker Compose

**No necesitas modificar nada**, los Dockerfiles multi-stage ya lo manejan.

---

## 🚀 Comandos de Inicio

```bash
# 1. Construir todas las imágenes
docker-compose build

# 2. Iniciar todos los servicios
docker-compose up -d

# 3. Ver logs
docker-compose logs -f

# 4. Ejecutar migraciones Prisma
docker-compose exec users-srv npx prisma migrate deploy
docker-compose exec vehicles-svc npx prisma migrate deploy

# 5. Verificar estado
docker-compose ps
```

---

## ✅ Verificación

- **Eureka**: http://localhost:8761
- **RabbitMQ**: http://localhost:15672 (guest/guest)
- **Kibana**: http://localhost:5601
- **API Gateway**: http://localhost:8080

---

## 🔍 Troubleshooting

### Prisma no encuentra la base de datos

```bash
# Verificar que las bases de datos estén corriendo
docker-compose ps

# Ver logs de la base de datos
docker-compose logs users-db
docker-compose logs vehicles-db

# Reiniciar el servicio específico
docker-compose restart users-srv
```

### Reconstruir imágenes después de cambiar .env

```bash
# Rebuild específico
docker-compose build users-srv vehicles-svc

# Rebuild todo
docker-compose build --no-cache
```

