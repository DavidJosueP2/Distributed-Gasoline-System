# 🐳 Guía de Docker - Fuel System

Esta guía explica cómo trabajar con Docker en el sistema, desde desarrollo local hasta producción en Azure.

## 📋 Tabla de Contenidos

- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Arquitectura de Microservicios](#-arquitectura-de-microservicios)
- [Inicio Rápido](#-inicio-rápido)
- [Modos de Trabajo](#-modos-de-trabajo)
- [Dockerfiles Multi-Stage](#-dockerfiles-multi-stage)
- [Comandos Útiles](#-comandos-útiles)
- [Variables de Entorno](#-variables-de-entorno)
- [Troubleshooting](#-troubleshooting)
- [CI/CD con GitHub Actions](#-cicd-con-github-actions)

---

## 📁 Estructura del Proyecto

```
fuel-system-distributed/
├── .github/
│   └── workflows/              # GitHub Actions para CI/CD
│       ├── build-and-push.yml  # Build y push a GHCR (automático)
│       └── deploy-to-azure.yml # Deploy a AKS (manual/futuro)
├── deploy/
│   ├── helm/fuel-system/       # Helm Charts para Kubernetes
│   ├── scripts/
│   ├── ARCHITECTURE.md         # Arquitectura del sistema
│   ├── DEPLOY_README.md        # Guía de deployment
│   ├── MIGRATIONS_GUIDE.md     # Guía de migraciones
│   └── SEEDING_STRATEGY.md     # Estrategia de seeds
├── services/                   # 9 Microservicios
│   ├── api-gateway/            # Gateway HTTP → gRPC
│   ├── auth-svc/               # Autenticación (TypeORM)
│   ├── driver-ms/              # Conductores (TypeORM)
│   ├── users-srv/              # Usuarios (Prisma)
│   ├── vehicles-svc/           # Vehículos (Prisma)
│   ├── email-svc/              # Emails
│   ├── hello-svc/              # Ejemplo/Health
│   ├── logger-svc/             # Logs centralizados
│   └── publisher-rabbit-srv/   # Publisher de eventos
├── protos/                     # Definiciones gRPC compartidas
├── .env                        # Variables globales
├── .env.example                # Template
├── docker-compose.yml          # Todo dockerizado
├── docker-compose.infra.yml    # Solo infraestructura
├── GHCR_MIGRATION.md           # Guía de GitHub Container Registry
└── Makefile                    # Comandos útiles
```

---

## 🏗️ Arquitectura de Microservicios

### Servicios

| Servicio | Puerto HTTP | Puerto gRPC | Base de Datos | ORM | Descripción |
|----------|-------------|-------------|---------------|-----|-------------|
| **api-gateway** | 8080 | - | - | - | Gateway principal HTTP/REST |
| **auth-svc** | - | 50052 | auth_db | TypeORM | Autenticación y JWT |
| **driver-ms** | 3100 | 50062 | driver_db | TypeORM | Gestión de conductores |
| **users-srv** | - | 50057 | users_db | Prisma | Gestión de usuarios y roles |
| **vehicles-svc** | - | 50055 | vehicles_db | Prisma | Vehículos y modelos |
| **email-svc** | - | 50053 | - | - | Envío de emails (SMTP) |
| **hello-svc** | - | 50051 | - | - | Health check / Demo |
| **logger-svc** | 3200 | 50058 | - | - | Logs centralizados (ELK) |
| **publisher-rabbit-srv** | 4100 | - | - | - | Publisher de eventos |

### Infraestructura

| Servicio | Puerto(s) | Descripción |
|----------|-----------|-------------|
| **Eureka Server** | 8761 | Service Discovery |
| **PostgreSQL (4 DBs)** | 5433-5436 | Bases de datos separadas |
| **RabbitMQ** | 5672, 15672 | Message broker |
| **Elasticsearch** | 9200, 9300 | Almacenamiento de logs |
| **Kibana** | 5601 | Visualización de logs |
| **PgAdmin** | 8081 | Admin de PostgreSQL |

### Bases de Datos Separadas

| Base de Datos | Puerto Local | Container Name | Usuario | Password |
|---------------|--------------|----------------|---------|----------|
| auth_db | 5433 | fuel-auth-db | postgres | root |
| users_db | 5434 | fuel-users-db | postgres | admin |
| vehicles_db | 5435 | fuel-vehicles-db | postgres | admin |
| drivers_db | 5436 | fuel-driver-db | postgres | admin |

---

## 🚀 Inicio Rápido

### Prerrequisitos

```bash
# Verificar instalaciones
docker --version        # Docker 20.10+
docker-compose --version # 2.0+
node --version         # Node.js 20+
```

### Setup Inicial

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-org/fuel-system-distributed.git
cd fuel-system-distributed

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus configuraciones (SMTP_PASS es importante)

# 3. Levantar todo
docker-compose up -d

# 4. Verificar
docker-compose ps
```

### Acceder a los Servicios

- **API Gateway**: http://localhost:8080
- **Eureka Dashboard**: http://localhost:8761
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **Kibana (Logs)**: http://localhost:5601
- **PgAdmin**: http://localhost:8081 (admin@example.com/admin123)

---

## 🎯 Modos de Trabajo

### Modo 1: Todo Dockerizado (Recomendado para Testing)

**Uso**: Simular producción localmente, testing completo

```bash
# Construir imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver logs de un servicio
docker-compose logs -f api-gateway

# Detener
docker-compose down
```

**Características**:
- ✅ Todo corre en contenedores
- ✅ Simula ambiente de producción
- ✅ Migraciones automáticas al iniciar
- ✅ Seeding automático (users-srv, vehicles-svc)
- ⚠️ Hot-reload no disponible

### Modo 2: Solo Infraestructura (Para Desarrollo Activo)

**Uso**: Desarrollo con hot-reload, depuración

```bash
# 1. Levantar solo infraestructura
docker-compose -f docker-compose.infra.yml up -d

# 2. Ejecutar servicios manualmente
cd services/api-gateway
npm run start:dev

# En otra terminal
cd services/auth-svc
npm run start:dev
```

**Características**:
- ✅ Hot-reload funciona
- ✅ Más rápido para desarrollo
- ✅ Menos recursos
- ⚠️ Debes ejecutar cada servicio manualmente

### Comparación

| Aspecto | Todo Docker | Solo Infra |
|---------|-------------|------------|
| **Microservicios** | Contenedor | Tu máquina |
| **Bases de datos** | Contenedor | Contenedor |
| **DB Host** | `auth-db:5432` | `localhost:5433` |
| **Eureka Host** | `eureka-server:8761` | `localhost:8761` |
| **Hot-reload** | ❌ No | ✅ Sí |
| **Recursos** | 🔴 Alto | 🟢 Bajo |
| **Para** | Testing/QA | Desarrollo |

---

## 📦 Dockerfiles Multi-Stage

Todos los servicios usan Dockerfiles optimizados de 3 stages:

### Estructura Estándar

```dockerfile
# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app
COPY services/xxx/package.json ./
RUN npm install --production --no-package-lock

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app
COPY services/xxx/package.json ./
COPY services/xxx/tsconfig*.json ./
RUN npm install --no-package-lock
COPY services/xxx/src ./src
# Copiar protos desde raíz
COPY protos ./protos
RUN npm run build

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Instalar curl para healthchecks
RUN apk add --no-cache curl

COPY services/xxx/package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/protos ./protos

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs

EXPOSE 50052
CMD ["node", "dist/src/main.js"]
```

### Servicios con Prisma (users-srv, vehicles-svc)

Necesitan `ARG` para `prisma generate`:

```dockerfile
# En stage deps
ARG USERS_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public
RUN DATABASE_URL=$USERS_DATABASE_URL npx prisma generate

# En stage build
ARG USERS_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public
RUN DATABASE_URL=$USERS_DATABASE_URL npx prisma generate
```

**Importante**: El `DATABASE_URL` es temporal, NO se persiste en la imagen final.

### Beneficios

- ✅ **Imágenes pequeñas**: < 200MB (solo runtime)
- ✅ **Seguridad**: Usuario no-root
- ✅ **Cache eficiente**: Layers optimizados
- ✅ **Health checks**: Monitoreo integrado
- ✅ **Contexto raíz**: Acceso a `/protos` compartidos

---

## 🛠️ Comandos Útiles

### Con Makefile

```bash
# Desarrollo Local
make dev-build           # Construir imágenes
make dev-up              # Levantar servicios
make dev-down            # Detener servicios
make dev-restart         # Reiniciar
make dev-logs            # Ver todos los logs
make dev-logs-service SERVICE=api-gateway  # Logs de un servicio
make dev-ps              # Ver estado

# Testing
make test-health         # Probar health endpoint
make test-api            # Probar API básica

# Kubernetes (verificación)
make k8s-config          # Configurar kubectl
make k8s-pods            # Ver pods en AKS
make k8s-services        # Ver servicios
make k8s-logs POD=xxx    # Ver logs de un pod
make k8s-gateway-ip      # Obtener IP del Gateway

# Información
make info                # Ver info del sistema
make help                # Ver todos los comandos
```

### Con Docker Compose Directo

```bash
# Básicos
docker-compose up -d                    # Iniciar en background
docker-compose up -d --build            # Rebuild e iniciar
docker-compose down                     # Detener
docker-compose down -v                  # Detener y limpiar volúmenes

# Logs
docker-compose logs -f                  # Todos los logs
docker-compose logs -f api-gateway      # Logs de un servicio
docker-compose logs --tail=100 api-gateway  # Últimas 100 líneas

# Estado
docker-compose ps                       # Ver servicios
docker-compose top                      # Ver procesos

# Ejecutar comandos
docker-compose exec api-gateway sh      # Entrar al contenedor
docker-compose exec users-srv npx prisma studio  # Prisma Studio

# Rebuild
docker-compose build api-gateway        # Rebuild un servicio
docker-compose build --no-cache         # Rebuild sin cache

# Migraciones (si no son automáticas)
docker-compose exec users-srv npx prisma migrate deploy
docker-compose exec vehicles-svc npx prisma migrate deploy
```

---

## 🔧 Variables de Entorno

### Estructura de Archivos

```
fuel-system-distributed/
├── .env                              # Variables globales (MAIN)
├── .env.example                      # Template
├── services/users-srv/.env           # Solo para Prisma CLI (opcional)
└── services/vehicles-svc/.env        # Solo para Prisma CLI (opcional)
```

### `.env` Principal (Raíz)

Contiene TODAS las variables necesarias:

```bash
# General
NODE_ENV=development
LOG_LEVEL=debug

# Service Discovery
DISCOVERY_MODE=eureka
EUREKA_HOST=eureka-server  # En Docker
# EUREKA_HOST=localhost    # En modo local

# JWT
JWT_SECRET=tu-jwt-secret-super-seguro-min-32-chars

# Gateway
GATEWAY_HTTP_PORT=8080

# Microservicios (puertos gRPC)
AUTH_GRPC_PORT=50052
DRIVER_GRPC_PORT=50062
USERS_GRPC_PORT=50057
VEHICLES_GRPC_PORT=50055
EMAIL_GRPC_PORT=50053
HELLO_GRPC_PORT=50051
LOGGER_GRPC_PORT=50058
OUTBOX_PUBLISHER_PORT=4100

# Bases de Datos (Docker - puertos externos)
AUTH_DB_HOST=auth-db        # En Docker
AUTH_DB_PORT=5432           # Puerto INTERNO
AUTH_DB_USER=postgres
AUTH_DB_PASS=root
AUTH_DB_NAME=auth

USERS_DB_HOST=users-db
USERS_DB_PORT=5432
USERS_DB_USER=postgres
USERS_DB_PASS=admin
USERS_DB_NAME=users
USERS_DATABASE_URL=postgresql://postgres:admin@users-db:5432/users?schema=public

VEHICLES_DB_HOST=vehicles-db
VEHICLES_DB_PORT=5432
VEHICLES_DB_USER=postgres
VEHICLES_DB_PASS=admin
VEHICLES_DB_NAME=vehicles
DATABASE_URL=postgresql://postgres:admin@vehicles-db:5432/vehicles?schema=public
SHADOW_DATABASE_URL=postgresql://postgres:admin@vehicles-db:5432/vehicles_shadow?schema=public

DRIVER_DB_HOST=driver-db
DRIVER_DB_PORT=5432
DRIVER_DB_USER=postgres
DRIVER_DB_PASS=admin
DRIVER_DB_NAME=drivers
DRIVER_DATABASE_URL=postgresql://postgres:admin@driver-db:5432/drivers?schema=public

# RabbitMQ
RABBITMQ_HOST=rabbitmq      # En Docker
RABBITMQ_PORT=5672
RABBITMQ_DEFAULT_USER=guest
RABBITMQ_DEFAULT_PASS=guest
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password   # ⚠️ IMPORTANTE: Configurar
FRONTEND_URL=http://localhost:5174

# Elasticsearch
ELASTICSEARCH_NODE=http://elasticsearch:9200
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200
```

### Docker vs Local

**En Docker** (`docker-compose.yml`):
- Usa nombres de contenedor: `auth-db`, `rabbitmq`, `eureka-server`
- Puerto interno: `5432`

**En Local** (desarrollo sin Docker):
- Usa `localhost`
- Puertos externos: `5433`, `5434`, `5435`, `5436`

### ¿Por qué archivos .env separados?

**Raíz (`.env`)**:
- NestJS lo lee automáticamente
- Docker Compose lo usa con `env_file: .env`

**Services (`.env` en cada servicio)**:
- Solo para comandos de Prisma CLI: `migrate`, `generate`, `studio`
- Opcional si usas migraciones en Docker

---

## 🐛 Troubleshooting

### Contenedor no inicia

```bash
# Ver logs del contenedor
docker-compose logs nombre-servicio

# Ver últimas 50 líneas
docker-compose logs --tail=50 nombre-servicio

# Inspeccionar contenedor
docker inspect nombre-contenedor

# Verificar salud
docker-compose ps
```

### Problemas de conexión entre servicios

```bash
# Verificar red
docker network inspect fuel-system_fuel-network

# Ping entre contenedores
docker-compose exec api-gateway ping auth-db

# Ver variables de entorno en contenedor
docker-compose exec api-gateway env | grep DB
```

### Puertos ocupados

```bash
# Cambiar puertos en .env
AUTH_DB_PORT=5433      # Cambiar a otro puerto
USERS_DB_PORT=5434

# O detener el servicio que ocupa el puerto
lsof -i :5433          # Ver qué usa el puerto
kill -9 <PID>          # Matar proceso
```

### Base de datos corrupta o vacía

```bash
# Limpiar volúmenes
docker-compose down -v

# Recrear todo
docker-compose up -d

# Ejecutar migraciones manualmente (si es necesario)
docker-compose exec users-srv npx prisma migrate deploy
docker-compose exec vehicles-svc npx prisma migrate deploy
```

### Error de Prisma Client

```bash
# Regenerar Prisma Client
docker-compose exec users-srv npx prisma generate

# O rebuild la imagen
docker-compose build users-srv --no-cache
docker-compose up -d users-srv
```

### Migraciones no se ejecutan

Las migraciones se ejecutan automáticamente en el comando de inicio:

```yaml
# users-srv
command: sh -c "npx prisma db push --accept-data-loss --skip-generate && npx prisma db seed && node dist/src/main.js"

# vehicles-svc
command: sh -c "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"
```

Si fallan, verifica:
```bash
docker-compose logs users-srv | grep prisma
docker-compose logs vehicles-svc | grep prisma
```

### Limpiar y reiniciar todo

```bash
# Opción 1: Con Make
make dev-clean

# Opción 2: Manual
docker-compose down -v --remove-orphans
docker system prune -af --volumes
docker-compose build --no-cache
docker-compose up -d
```

---

## 🚀 CI/CD con GitHub Actions

### Container Registry: GitHub Container Registry (GHCR)

**¿Por qué GHCR?**
- ✅ **100% GRATIS** para repositorios públicos
- ✅ Sin costos de almacenamiento
- ✅ Sin límites de bandwidth
- ✅ Integración automática con GitHub Actions
- ✅ Ahorro de ~$20-50 USD/mes vs Azure Container Registry

**Alternativa anterior**: Azure Container Registry (ACR) cobra incluso cuando está detenido.

### Workflows Configurados

**1. Build and Push** (`.github/workflows/build-and-push.yml`)

**Registry**: `ghcr.io/tu-usuario-github/fuel-system/`

**Trigger**: Push a `main`

**Acción**:
- Construye las 9 imágenes con **contexto raíz** (`.`)
- Sube a GitHub Container Registry (GHCR)
- Tags: `latest`, `main-{sha-completo}`, `{sha-corto}`, `timestamp`

**Características**:
- ✅ Contexto raíz para acceder a `/protos`
- ✅ Build args para Prisma
- ✅ Cache de Docker para builds rápidos
- ✅ Login automático con `GITHUB_TOKEN`
- ✅ Parallel builds de 9 servicios
- ✅ **Sin configuración de secrets necesaria**

**2. Deploy to Azure** (`.github/workflows/deploy-to-azure.yml`)

**Trigger**: Manual (o automático en futuro)

**Acción**:
- Conecta a AKS
- Pull de imágenes desde GHCR
- Despliega con Helm
- Ejecuta migraciones
- Verifica pods

**Estado actual**: Deshabilitado temporalmente (solo build a GHCR)

### Secrets NO Necesarios para Build

**Ya NO necesitas configurar:**
- ❌ `ACR_LOGIN_SERVER`
- ❌ `ACR_USERNAME`
- ❌ `ACR_PASSWORD`

**GitHub Actions usa `GITHUB_TOKEN` automáticamente** ✨

### Ver las Imágenes

Después del primer push, tus imágenes estarán en:

```
https://github.com/tu-usuario?tab=packages
```

Ejemplos:
- `ghcr.io/tu-usuario/fuel-system/api-gateway:latest`
- `ghcr.io/tu-usuario/fuel-system/api-gateway:abc123d`
- `ghcr.io/tu-usuario/fuel-system/auth-svc:latest`

### Configuración Inicial

1. **Repositorio público** (GHCR gratis solo para públicos)
2. **Primer push** a main
3. **Hacer imágenes públicas**:
   - Ve a GitHub → tu perfil → Packages
   - Click en cada imagen → Settings → Change visibility → Public

Ver [GHCR_MIGRATION.md](./GHCR_MIGRATION.md) para detalles completos.

### Flujo Completo

```
Developer                GitHub Actions           GHCR
   │                          │                     │
   │  git push origin main    │                     │
   ├─────────────────────────►│                     │
   │                          │                     │
   │                          │ 1. Build 9 imágenes │
   │                          │    contexto: .      │
   │                          │                     │
   │                          │ 2. Push a GHCR      │
   │                          ├────────────────────►│
   │                          │    ghcr.io/user/... │
   │                          │                     │
   │◄─────────────────────────┤◄────────────────────┤
   │  Build completado        │  Imágenes públicas  │
   │                          │  (GRATIS)           │
```

---

## 💰 Ahorro de Costos

**Antes (Azure Container Registry)**:
- Costo base: ~$20/mes (Standard tier)
- Almacenamiento: $0.10/GB/mes
- Transferencia: $0.087/GB
- **Total: ~$20-50/mes**

**Ahora (GitHub Container Registry)**:
- ✅ **$0/mes** para repos públicos
- ✅ Almacenamiento ilimitado
- ✅ Bandwidth ilimitado

**Ahorro anual: $240 - $600 USD** 💸

---

## 📊 Monitoreo Local

### Dashboards Disponibles

```bash
# Eureka (Service Discovery)
open http://localhost:8761

# RabbitMQ Management
open http://localhost:15672  # guest/guest

# Kibana (Logs)
open http://localhost:5601

# PgAdmin (PostgreSQL Admin)
open http://localhost:8081   # admin@example.com/admin123
```

### Ver Logs en Tiempo Real

```bash
# Todos los servicios
docker-compose logs -f

# Solo errores
docker-compose logs -f | grep ERROR

# Servicio específico
docker-compose logs -f api-gateway

# Con marca de tiempo
docker-compose logs -f --timestamps api-gateway
```

### Métricas de Recursos

```bash
# Uso de CPU y memoria de contenedores
docker stats

# Procesos en cada contenedor
docker-compose top

# Espacio usado
docker system df
```

---

## 🔒 Seguridad

### Mejores Prácticas Implementadas

✅ **Multi-stage builds**: Imágenes finales sin build tools
✅ **Usuario no-root**: Todos los contenedores corren con usuario limitado
✅ **Secrets en .env**: No commiteados al repo (`.gitignore`)
✅ **Health checks**: Monitoreo de salud de contenedores
✅ **Network isolation**: Red privada Docker
✅ **Minimal base images**: Alpine Linux (< 50MB)

### Escaneo de Vulnerabilidades

```bash
# Con Docker Scout (built-in)
docker scout cves fuel-system-api-gateway:latest

# Con Trivy (instalar primero)
trivy image fuel-system-api-gateway:latest
```

---

## 📚 Referencias

- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [ARCHITECTURE.md](./deploy/ARCHITECTURE.md) - Arquitectura completa
- [DEPLOY_README.md](./deploy/DEPLOY_README.md) - Guía de deployment
- [MIGRATIONS_GUIDE.md](./deploy/MIGRATIONS_GUIDE.md) - Migraciones de DB

---

## 🆘 Soporte

¿Problemas con Docker?

1. ✅ Verifica que Docker Desktop esté corriendo
2. ✅ Revisa los logs: `docker-compose logs -f`
3. ✅ Verifica el estado: `docker-compose ps`
4. ✅ Consulta troubleshooting arriba
5. ✅ Ver [DEPLOYMENT.MD](./DEPLOYMENT.MD) para despliegue completo

---

**¡Happy Dockering! 🐳**
