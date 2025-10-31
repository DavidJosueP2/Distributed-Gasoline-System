# 🐳 Configuración de Docker Build - Fuel System

## 📋 Resumen Ejecutivo

Este documento detalla todos los cambios realizados para garantizar que las imágenes Docker se construyan correctamente en **desarrollo local**, **CI/CD** y **producción AKS**, con especial atención a los servicios que usan Prisma.

---

## 🎯 Problema Resuelto

### ❌ **ANTES:**
- Prisma fallaba en build porque no encontraba `DATABASE_URL`
- No había `build args` en docker-compose.yml
- No existía workflow de build de imágenes
- Helm charts no soportaban tags dinámicos
- Inconsistencia entre entornos

### ✅ **DESPUÉS:**
- Prisma funciona con ARG temporales en build time
- Docker Compose pasa build args correctamente
- CI/CD automatizado con GitHub Actions
- Helm usa tags dinámicos para tracking preciso
- Configuración unificada y reproducible

---

## 📊 Análisis de Servicios

### **Servicios SIN dependencias especiales (NO requieren ARG)**

| Servicio | Dockerfile | Build Time Dependencies | Notas |
|----------|------------|------------------------|-------|
| `api-gateway` | ✅ 3 stages | Ninguna | Build estándar de NestJS |
| `auth-svc` | ✅ 3 stages | Ninguna | Build estándar de NestJS |
| `driver-ms` | ✅ 3 stages | TypeORM (no requiere DB en build) | Migraciones en runtime |
| `email-svc` | ✅ 3 stages | Ninguna | Build estándar de NestJS |
| `hello-svc` | ✅ 3 stages | Ninguna | Build estándar de NestJS |
| `logger-svc` | ✅ 3 stages | Ninguna | Build estándar de NestJS |
| `publisher-rabbit-srv` | ✅ 2 stages | Ninguna | Build simple de TypeScript |

**Resultado:** 7 servicios que funcionan sin cambios en Dockerfile.

---

### **Servicios CON Prisma (REQUIEREN ARG)**

| Servicio | ORM | Variables BUILD | Variables RUNTIME | Cambios Aplicados |
|----------|-----|----------------|-------------------|-------------------|
| `users-srv` | Prisma | `USERS_DATABASE_URL` | `USERS_DATABASE_URL` (real) | ✅ ARG agregado |
| `vehicles-svc` | Prisma | `DATABASE_URL`<br>`SHADOW_DATABASE_URL` | `DATABASE_URL` (real)<br>`SHADOW_DATABASE_URL` (real) | ✅ ARG agregado |

**Problema de Prisma:**
```bash
# Prisma necesita DATABASE_URL en DOS momentos:
1. BUILD TIME: npx prisma generate (genera cliente TypeScript)
2. RUNTIME: La app se conecta a la DB real
```

**Solución Implementada:**
```dockerfile
# ARG en build time (no persiste en imagen)
ARG DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public

# Solo se usa para generar el cliente
RUN DATABASE_URL=$DATABASE_URL npx prisma generate

# En runtime, la app usa la variable del entorno (docker-compose o K8s)
```

---

## 🔧 Cambios Realizados

### 1. **Dockerfiles Actualizados**

#### `services/users-srv/Dockerfile`

```dockerfile
# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
COPY prisma ./prisma/

# ✅ ARG agregado para build time
ARG USERS_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public

RUN npm install --production --no-package-lock && \
    USERS_DATABASE_URL=$USERS_DATABASE_URL npx prisma generate && \
    npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
COPY prisma ./prisma/

# ✅ ARG agregado para build time
ARG USERS_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public

RUN npm install --no-package-lock && \
    USERS_DATABASE_URL=$USERS_DATABASE_URL npx prisma generate

COPY . .
RUN npm run build

# ===== STAGE 3: Runtime =====
# No cambia - usa variables de entorno reales
```

#### `services/vehicles-svc/Dockerfile`

```dockerfile
# Similar a users-srv pero con DATABASE_URL y SHADOW_DATABASE_URL
ARG DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public
ARG SHADOW_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp_shadow?schema=public

RUN DATABASE_URL=$DATABASE_URL SHADOW_DATABASE_URL=$SHADOW_DATABASE_URL npx prisma generate
```

---

### 2. **Docker Compose Actualizado**

#### `Docker-compose.yml`

```yaml
# ✅ Users Service - con build args
users-srv:
  build:
    context: ./services/users-srv
    dockerfile: Dockerfile
    args:
      # Build arg temporal para prisma generate (no se persiste en imagen)
      USERS_DATABASE_URL: postgresql://postgres:admin@users-db:5432/users?schema=public
  container_name: fuel-users-srv
  env_file: .env  # ← Variables RUNTIME vienen del .env
  # ...

# ✅ Vehicles Service - con build args
vehicles-svc:
  build:
    context: ./services/vehicles-svc
    dockerfile: Dockerfile
    args:
      # Build args temporales para prisma generate
      DATABASE_URL: postgresql://postgres:admin@vehicles-db:5432/vehicles?schema=public
      SHADOW_DATABASE_URL: postgresql://postgres:admin@vehicles-db:5432/vehicles_shadow?schema=public
  container_name: fuel-vehicles-svc
  env_file: .env  # ← Variables RUNTIME vienen del .env
  # ...
```

**Clave:** `build.args` solo se usan en tiempo de construcción. En runtime, las variables vienen del `.env`.

---

### 3. **GitHub Actions - Workflow de Build**

#### `.github/workflows/build-and-push.yml` (NUEVO)

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main, develop]
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          # Servicios sin build args
          - name: api-gateway
            needs_build_args: false
          
          # Servicios con Prisma - REQUIEREN build args
          - name: users-srv
            needs_build_args: true
            build_args: |
              USERS_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public
          
          - name: vehicles-svc
            needs_build_args: true
            build_args: |
              DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public
              SHADOW_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp_shadow?schema=public

    steps:
      - uses: docker/build-push-action@v5
        if: ${{ matrix.service.needs_build_args }}
        with:
          build-args: ${{ matrix.service.build_args }}
          push: true
          tags: ${{ secrets.ACR_LOGIN_SERVER }}/fuel-system/${{ matrix.service.name }}:${{ github.sha }}
```

**Ventajas:**
- ✅ Matrix strategy para paralelizar builds
- ✅ Build args solo donde se necesitan
- ✅ Tags con SHA del commit para tracking
- ✅ Cache de Docker Buildx para builds rápidos

---

### 4. **GitHub Actions - Workflow de Deploy**

#### `.github/workflows/deploy-to-azure.yml` (ACTUALIZADO)

```yaml
- name: Get image tag
  id: image-tag
  run: |
    # Usar el SHA del commit como tag
    echo "tag=${{ github.sha }}" >> $GITHUB_OUTPUT
    
- name: Deploy with Helm
  run: |
    helm upgrade --install fuel-system ${{ env.HELM_CHART_PATH }} \
      --set imageRegistry.url=${{ secrets.ACR_LOGIN_SERVER }} \
      --set global.imageTag=main-${{ steps.image-tag.outputs.tag }} \  # ← Tag dinámico
      --set postgresql.external.enabled=true \
      --set postgresql.external.host=${{ secrets.POSTGRES_HOST }} \
      # ...más configuración
```

**Cambio Clave:** El tag de imagen ahora es dinámico basado en el commit SHA.

---

### 5. **Helm Charts Actualizados**

#### `deploy/helm/fuel-system/values.yaml`

```yaml
global:
  imageRegistry: ""
  imagePullSecrets: []
  # ✅ Tag global agregado
  imageTag: "latest"  # Default, se sobrescribe en CI/CD
```

#### Templates actualizados:

- `templates/api-gateway.yaml`
- `templates/auth-service.yaml`
- `templates/microservices.yaml`

```yaml
# Antes:
image: "{{ .Values.imageRegistry.url }}/{{ .Values.apiGateway.image.repository }}:{{ .Values.apiGateway.image.tag }}"

# Después:
image: "{{ .Values.imageRegistry.url }}/{{ .Values.apiGateway.image.repository }}:{{ .Values.apiGateway.image.tag | default .Values.global.imageTag }}"
```

**Ventaja:** Permite usar un tag global para todos los servicios o tags específicos.

---

## 🌍 Configuración por Entorno

### **1. Desarrollo LOCAL (docker-compose.infra.yml)**

```bash
# Infraestructura en Docker, MS con npm run dev

# NO necesita build args porque:
# - Los MS corren fuera de Docker
# - Prisma lee .env directamente del disco
```

**Comando:**
```bash
docker-compose -f docker-compose.infra.yml up -d
cd services/users-srv && npm run dev
```

---

### **2. Docker COMPLETO (docker-compose.yml)**

```bash
# TODO dockerizado

# Build con args:
docker-compose build users-srv vehicles-svc

# Los args vienen de docker-compose.yml:
#   USERS_DATABASE_URL: postgresql://postgres:admin@users-db:5432/users
#   DATABASE_URL: postgresql://postgres:admin@vehicles-db:5432/vehicles
```

**Comando:**
```bash
docker-compose up -d
```

**Runtime:** Variables reales vienen del `.env` del root.

---

### **3. CI/CD (GitHub Actions)**

```bash
# Build en GitHub Actions

# Build args en workflow:
build-args: |
  USERS_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp
  DATABASE_URL=postgresql://temp:temp@localhost:5432/temp

# ✅ URLs temporales solo para generar cliente Prisma
# ✅ NO se conectan a ninguna DB real
# ✅ NO persisten en la imagen final
```

**Resultado:** Imagen en ACR lista para deployment.

---

### **4. Producción AKS (Kubernetes)**

```yaml
# Runtime en AKS

# Variables dinámicas construidas por Kubernetes:
env:
  - name: USERS_DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/users_db?sslmode=require"
  - name: DB_HOST
    value: fuel-system-postgres.postgres.database.azure.com
  - name: DB_USERNAME
    valueFrom:
      secretKeyRef:
        name: fuel-system-postgresql
        key: username
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: fuel-system-postgresql
        key: password
```

**Clave:** 
- Build usa URL temporal
- Runtime usa URL de Azure PostgreSQL Flexible Server
- Secrets vienen de Kubernetes Secrets

---

## 📝 Variables de Entorno Requeridas

### En `.env` (Local y Docker)

```bash
# ===== Para BUILD (solo si build local) =====
# Estas NO son necesarias si usas docker-compose
# (docker-compose.yml las define en build.args)

# ===== Para RUNTIME =====
# Users Service
USERS_DATABASE_URL=postgresql://postgres:admin@users-db:5432/users?schema=public

# Vehicles Service
DATABASE_URL=postgresql://postgres:admin@vehicles-db:5432/vehicles?schema=public
SHADOW_DATABASE_URL=postgresql://postgres:admin@vehicles-db:5432/vehicles_shadow?schema=public

# Driver Service (TypeORM)
DRIVER_DATABASE_URL=postgresql://postgres:admin@driver-db:5432/drivers?schema=public

# Auth Service
AUTH_DATABASE_URL=postgresql://postgres:root@auth-db:5432/auth?schema=public

# Otras variables...
JWT_SECRET=your-secret
SMTP_USER=email@example.com
# etc.
```

### En GitHub Secrets

```bash
# Azure Container Registry
ACR_LOGIN_SERVER=your-acr.azurecr.io
ACR_USERNAME=your-username
ACR_PASSWORD=your-password

# Azure Kubernetes Service
AKS_CLUSTER_NAME=fuel-system-aks
AKS_RESOURCE_GROUP=fuel-system-rg
AZURE_CREDENTIALS={"clientId":"..."}

# PostgreSQL Flexible Server
POSTGRES_HOST=fuel-system-postgres.postgres.database.azure.com
POSTGRES_USERNAME=pgadmin
POSTGRES_PASSWORD=super-secure-password

# Application Secrets
JWT_SECRET=production-jwt-secret
SMTP_USER=production-email@gmail.com
SMTP_PASSWORD=app-password
RABBITMQ_PASSWORD=rabbitmq-password
DOMAIN_NAME=fuel-system.yourdomain.com
```

---

## ✅ Verificación de Builds

### Test Local (Docker Compose)

```bash
# 1. Build solo Prisma services
docker-compose build users-srv vehicles-svc

# 2. Verificar que no hay errores
docker-compose logs users-srv

# 3. Verificar que Prisma Client se generó
docker-compose exec users-srv ls -la node_modules/prisma-client
```

### Test CI/CD (GitHub Actions)

```bash
# 1. Push a main o crear PR
git push origin main

# 2. Ir a Actions tab en GitHub
# 3. Ver "Build and Push Docker Images" workflow
# 4. Verificar que todos los servicios buildean correctamente
```

### Test AKS

```bash
# 1. Después del deploy
kubectl get pods -n fuel-system

# 2. Verificar logs de Prisma services
kubectl logs -f deployment/fuel-system-users-service -n fuel-system

# 3. Verificar variable de entorno
kubectl exec -n fuel-system deployment/fuel-system-users-service -- env | grep DATABASE_URL
```

---

## 🚀 Flujo Completo de CI/CD

```mermaid
graph TD
    A[Push a main] --> B[Build and Push Workflow]
    B --> C{Build Images}
    C -->|api-gateway| D1[Build sin args]
    C -->|auth-svc| D2[Build sin args]
    C -->|users-srv| D3[Build con USERS_DATABASE_URL]
    C -->|vehicles-svc| D4[Build con DATABASE_URL]
    D1 & D2 & D3 & D4 --> E[Push a ACR]
    E --> F[Deploy to Azure Workflow]
    F --> G[Helm Install/Upgrade]
    G --> H[Kubernetes crea Pods]
    H --> I[Pods reciben variables de Secrets]
    I --> J[Prisma Migrate Deploy]
    J --> K[Aplicación Lista]
```

---

## 🔒 Seguridad

### ✅ **Buenas Prácticas Implementadas:**

1. **ARG no persisten:** Los build args no quedan en la imagen final
2. **URLs temporales:** En build se usan URLs fake que no conectan a nada
3. **Secrets en K8s:** Passwords en Kubernetes Secrets, no en código
4. **No hardcoded:** Ningún secret hardcodeado en Dockerfiles
5. **Multi-stage:** Etapas separadas minimizan superficie de ataque

### ❌ **LO QUE NO HACER:**

```dockerfile
# ❌ MAL - ENV persiste en imagen
ENV DATABASE_URL=postgresql://user:password@host:5432/db

# ✅ BIEN - ARG solo en build, no persiste
ARG DATABASE_URL=postgresql://temp:temp@localhost:5432/temp
```

---

## 📊 Resumen de Cambios

| Componente | Cambios | Archivos Afectados |
|------------|---------|-------------------|
| **Dockerfiles** | Agregados ARG para Prisma | `services/users-srv/Dockerfile`<br>`services/vehicles-svc/Dockerfile` |
| **Docker Compose** | Agregados build.args | `Docker-compose.yml` |
| **GitHub Actions** | Creado workflow de build | `.github/workflows/build-and-push.yml` (NUEVO) |
| **GitHub Actions** | Actualizado deploy con tags | `.github/workflows/deploy-to-azure.yml` |
| **Helm Charts** | Soporte para tags dinámicos | `deploy/helm/fuel-system/values.yaml`<br>`deploy/helm/fuel-system/templates/*.yaml` |

---

## 🎯 Beneficios Logrados

✅ **Builds reproducibles** en cualquier entorno  
✅ **Prisma funciona** en build sin conexión a DB  
✅ **CI/CD automatizado** con GitHub Actions  
✅ **Tags dinámicos** para tracking preciso  
✅ **Configuración unificada** entre entornos  
✅ **Seguridad mejorada** sin secrets en imágenes  
✅ **Documentación completa** para el equipo  

---

## 📚 Referencias

- [Docker Build Args](https://docs.docker.com/engine/reference/builder/#arg)
- [Prisma in Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-aws-lambda#1-set-the-databaseurl-environment-variable)
- [GitHub Actions Docker](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)
- [Helm Values](https://helm.sh/docs/chart_template_guide/values_files/)

---

**¡Sistema de build completamente funcional y listo para producción! 🚀**

