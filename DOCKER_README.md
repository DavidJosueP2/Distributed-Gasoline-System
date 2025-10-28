# 🐳 Guía de Dockerización - Fuel System

Esta guía explica la arquitectura dockerizada del sistema y cómo trabajar con ella.

## 📁 Estructura del Proyecto

```
fuel-system-distributed/
├── .github/
│   └── workflows/              # GitHub Actions para CI/CD
│       ├── build-and-push.yml  # Build y push de imágenes
│       ├── deploy-to-azure.yml # Despliegue a AKS
│       └── test.yml            # Tests automatizados
├── deploy/
│   ├── helm/
│   │   └── fuel-system/        # Helm Charts para Kubernetes
│   │       ├── Chart.yaml
│   │       ├── values.yaml
│   │       └── templates/      # Templates de K8s
│   ├── scripts/
│   │   ├── setup-azure.sh      # Setup automático de Azure
│   │   └── build-and-push-images.sh
│   └── AZURE_SETUP.md          # Guía de Azure
├── scripts/
│   └── init-databases.sh       # Script de inicialización de DBs
├── services/                   # Microservicios
│   ├── api-gateway/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── src/
│   ├── auth-svc/
│   │   ├── Dockerfile
│   │   └── src/
│   ├── driver-ms/
│   ├── users-srv/
│   ├── vehicles-svc/
│   ├── email-svc/
│   ├── hello-svc/
│   ├── logger-svc/
│   └── publisher-rabbit-srv/
├── docker-compose.yml          # Compose para desarrollo local
├── Makefile                    # Comandos automatizados
├── env.example                 # Variables de entorno ejemplo
├── DEPLOYMENT.md               # Guía de despliegue completa
└── README.md                   # Este archivo
```

## 🏗️ Arquitectura

### Microservicios

| Servicio | Puerto | Base de Datos | ORM | Descripción |
|----------|--------|---------------|-----|-------------|
| api-gateway | 8080 | - | - | Gateway principal HTTP |
| auth-svc | 50051 | auth_db | TypeORM | Autenticación y autorización |
| driver-ms | 50052 | driver_db | TypeORM | Gestión de conductores |
| users-srv | 50053 | users_db | Prisma | Gestión de usuarios |
| vehicles-svc | 50054 | vehicles_db | Prisma | Gestión de vehículos |
| email-svc | 50055 | - | - | Servicio de emails |
| hello-svc | 50056 | - | - | Servicio de ejemplo |
| logger-svc | 50057 | - | - | Servicio de logs |
| publisher-rabbit-srv | 50058 | - | - | Publicador de mensajes |

### Infraestructura

- **Eureka Server** (8761): Service Discovery
- **PostgreSQL** (5432): Base de datos relacional
- **RabbitMQ** (5672, 15672): Mensajería
- **Elasticsearch** (9200): Almacenamiento de logs
- **Kibana** (5601): Visualización de logs

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker Desktop 20.10+
- Docker Compose 2.0+
- Make (opcional, pero recomendado)

### 1. Clonar y Configurar

```bash
# Clonar repositorio
git clone https://github.com/tu-org/fuel-system-distributed.git
cd fuel-system-distributed

# Copiar variables de entorno
cp env.example .env

# Editar .env con tus configuraciones
nano .env
```

### 2. Iniciar con Docker Compose

```bash
# Con Make (recomendado)
make up

# O sin Make
docker-compose up -d
```

### 3. Ejecutar Migraciones

```bash
# Con Make
make migrate-up

# O manualmente
docker-compose exec users-srv npx prisma migrate deploy
docker-compose exec vehicles-svc npx prisma migrate deploy
docker-compose exec driver-ms npm run typeorm:migrate
```

### 4. Verificar

```bash
# Ver estado de servicios
make ps

# Ver logs
make logs

# Verificar salud
make health-check
```

## 📦 Dockerfiles

Cada servicio tiene un Dockerfile multi-stage optimizado:

### Estructura del Dockerfile

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
# ... instalar dependencias de producción

# Stage 2: Build
FROM node:20-alpine AS build
# ... instalar todas las deps y compilar

# Stage 3: Runtime
FROM node:20-alpine AS runtime
# ... copiar solo lo necesario
```

### Beneficios

- ✅ **Tamaño reducido**: Imágenes finales < 200MB
- ✅ **Seguridad**: Usuario no-root
- ✅ **Cache**: Layers optimizados para build rápido
- ✅ **Health checks**: Monitoreo integrado

## 🎯 Comandos Útiles con Make

```bash
# Desarrollo Local
make up              # Iniciar servicios
make down            # Detener servicios
make restart         # Reiniciar servicios
make logs            # Ver logs
make logs-api-gateway # Ver logs de un servicio

# Base de Datos
make migrate-up      # Ejecutar migraciones
make migrate-down    # Revertir migraciones
make prisma-studio   # Abrir Prisma Studio

# Testing
make test            # Ejecutar todos los tests
make test-api-gateway # Test de un servicio
make lint            # Linter

# Kubernetes
make helm-install    # Instalar en K8s
make helm-uninstall  # Desinstalar
make k8s-pods        # Ver pods
make k8s-logs-api-gateway # Logs en K8s

# Azure
make azure-setup     # Setup de Azure
make azure-build-push # Build y push a ACR
make helm-install    # Deploy a AKS

# Utilidades
make help            # Ver todos los comandos
make check-env       # Verificar config
make clean           # Limpiar todo
```

## 🔧 Desarrollo

### Agregar un Nuevo Servicio

1. **Crear Dockerfile**
```bash
cd services/nuevo-servicio
cat > Dockerfile << 'EOF'
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 50060
CMD ["node", "dist/main.js"]
EOF
```

2. **Agregar a Docker Compose**
```yaml
nuevo-servicio:
  build:
    context: ./services/nuevo-servicio
    dockerfile: Dockerfile
  ports:
    - "50060:50060"
  environment:
    - NODE_ENV=development
    - GRPC_PORT=50060
  depends_on:
    - eureka-server
  networks:
    - fuel-network
```

3. **Agregar a Helm Chart**
```yaml
# En values.yaml
nuevoServicio:
  enabled: true
  replicaCount: 2
  image:
    repository: fuel-system/nuevo-servicio
    tag: latest
```

### Hot Reload en Desarrollo

Para habilitar hot reload, monta el código como volumen:

```yaml
volumes:
  - ./services/api-gateway/src:/app/src
```

## 🧪 Testing

### Tests Locales

```bash
# Todos los tests
make test

# Servicio específico
cd services/api-gateway
npm test
```

### Tests en Docker

```bash
# Ejecutar tests en contenedor
docker-compose exec api-gateway npm test

# Con cobertura
docker-compose exec api-gateway npm run test:cov
```

## 📊 Monitoreo

### Acceder a Dashboards

- **Eureka Dashboard**: http://localhost:8761
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **Kibana**: http://localhost:5601

### Ver Logs

```bash
# Todos los servicios
make logs

# Servicio específico
make logs-api-gateway

# Seguir logs en tiempo real
docker-compose logs -f api-gateway

# Últimas 100 líneas
docker-compose logs --tail=100 api-gateway
```

### Métricas

```bash
# Estado de contenedores
docker stats

# Uso de recursos
docker-compose top
```

## 🔒 Seguridad

### Mejores Prácticas Implementadas

✅ **Multi-stage builds**: Imágenes más pequeñas y seguras
✅ **Usuario no-root**: Todos los contenedores corren con usuario limitado
✅ **Secrets management**: Variables sensibles en .env (no commiteado)
✅ **Health checks**: Monitoreo de salud de contenedores
✅ **Network isolation**: Red privada para servicios

### Escaneo de Vulnerabilidades

```bash
# Escanear imagen
docker scout cves fuel-system/api-gateway:latest

# O con Trivy
trivy image fuel-system/api-gateway:latest
```

## 🐛 Troubleshooting

### Contenedor no inicia

```bash
# Ver logs
docker-compose logs nombre-servicio

# Ver último error
docker-compose logs --tail=50 nombre-servicio

# Inspeccionar contenedor
docker inspect nombre-contenedor
```

### Problemas de conexión entre servicios

```bash
# Verificar red
docker network inspect fuel-system_fuel-network

# Ping entre contenedores
docker-compose exec api-gateway ping postgres
```

### Limpiar y reiniciar

```bash
# Limpiar todo
make clean

# Rebuild completo
make build
make up
```

### Base de datos corrupta

```bash
# Eliminar volúmenes
docker-compose down -v

# Recrear
docker-compose up -d
make migrate-up
```

## 📚 Referencias

- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Security](https://docs.docker.com/engine/security/)

## 🆘 Soporte

¿Problemas con Docker?

1. Verifica que Docker Desktop esté ejecutándose
2. Revisa los logs: `make logs`
3. Verifica el estado: `docker ps -a`
4. Consulta DEPLOYMENT.md para más detalles

---

**¡Happy Dockering! 🐳**

