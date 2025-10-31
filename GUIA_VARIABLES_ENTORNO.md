# 🔧 Guía Maestra - Variables de Entorno del Sistema

## 📋 Resumen Ejecutivo

Esta guía documenta la **estrategia unificada de variables de entorno** para el Fuel System distribuido, que funciona en **3 ambientes**:

1. **LOCAL**: Desarrollo con infraestructura en Docker
2. **DOCKER**: Todo dockerizado para testing
3. **AZURE**: Producción en Kubernetes (AKS)

---

## 🎯 Problema Resuelto

### ❌ **ANTES:**
- Variables dispersas en múltiples archivos
- Inconsistencias (puerto 5499 vs 5435 en vehicles)
- Prisma no encontraba DATABASE_URL
- Confusión entre ambientes

### ✅ **DESPUÉS:**
- Variables centralizadas en `.env` del root
- Todo consistente y documentado
- Prisma funciona en todos los ambientes
- Estrategia clara por ambiente

---

## 📁 Archivos Creados

### Configuraciones Base (Usar según ambiente)

| Archivo | Propósito | Usar cuando |
|---------|-----------|-------------|
| `ENV_LOCAL_COMPLETO.txt` | Desarrollo local | Infraestructura en Docker, MS con npm |
| `ENV_DOCKER_COMPLETO.txt` | Todo dockerizado | Testing completo antes de Azure |
| `ENV_USERS_SRV.txt` | Config Users Service | Referencia para services/users-srv/.env |
| `ENV_VEHICLES_SVC.txt` | Config Vehicles Service | Referencia para services/vehicles-svc/.env |

### Documentación Detallada

| Archivo | Contenido |
|---------|-----------|
| `ENV_SETUP_LOCAL.md` | Guía completa para desarrollo local |
| `ENV_SETUP_DOCKER.md` | Guía completa para Docker |
| `ENV_SETUP_AZURE.md` | Guía completa para Azure AKS |

---

## 🚀 Inicio Rápido

### Para Desarrollo LOCAL:

```bash
# 1. Copiar configuración
cp ENV_LOCAL_COMPLETO.txt .env

# 2. Configurar servicios Prisma (elegir una opción):

# OPCIÓN A - Symlink (Linux/Mac):
cd services/users-srv && ln -s ../../.env .env && cd ../..
cd services/vehicles-svc && ln -s ../../.env .env && cd ../..

# OPCIÓN B - Copiar archivos individuales (Windows):
cp ENV_USERS_SRV.txt services/users-srv/.env
cp ENV_VEHICLES_SVC.txt services/vehicles-svc/.env

# 3. Iniciar infraestructura
docker-compose -f docker-compose.infra.yml up -d

# 4. Generar clientes Prisma
cd services/users-srv && npx prisma generate && cd ../..
cd services/vehicles-svc && npx prisma generate && cd ../..

# 5. Ejecutar migraciones
cd services/users-srv && npx prisma migrate deploy && cd ../..
cd services/vehicles-svc && npx prisma migrate deploy && cd ../..

# 6. Iniciar microservicios (en terminales separadas)
cd services/api-gateway && npm run dev
cd services/auth-svc && npm run dev
cd services/users-srv && npm run dev
cd services/vehicles-svc && npm run dev
# ... etc
```

### Para TODO en DOCKER:

```bash
# 1. Copiar configuración
cp ENV_DOCKER_COMPLETO.txt .env

# 2. Construir imágenes
docker-compose build

# 3. Iniciar todo
docker-compose up -d

# 4. Ejecutar migraciones
docker-compose exec users-srv npx prisma migrate deploy
docker-compose exec vehicles-svc npx prisma migrate deploy

# 5. Verificar
docker-compose ps
docker-compose logs -f
```

---

## 📊 Comparación de Variables por Ambiente

### Hosts de Base de Datos:

| Variable | LOCAL | DOCKER | AZURE |
|----------|-------|--------|-------|
| `AUTH_DB_HOST` | `localhost` | `auth-db` | `fuel-system-postgres.postgres.database.azure.com` |
| `USERS_DB_HOST` | `localhost` | `users-db` | `fuel-system-postgres.postgres.database.azure.com` |
| `VEHICLES_DB_HOST` | `localhost` | `vehicles-db` | `fuel-system-postgres.postgres.database.azure.com` |
| `DRIVER_DB_HOST` | `localhost` | `driver-db` | `fuel-system-postgres.postgres.database.azure.com` |

### Puertos de Base de Datos:

| Variable | LOCAL | DOCKER | AZURE |
|----------|-------|--------|-------|
| `AUTH_DB_PORT` | `5433` | `5432` | `5432` |
| `USERS_DB_PORT` | `5434` | `5432` | `5432` |
| `VEHICLES_DB_PORT` | `5435` | `5432` | `5432` |
| `DRIVER_DB_PORT` | `5436` | `5432` | `5432` |

### Service Discovery:

| Variable | LOCAL | DOCKER | AZURE |
|----------|-------|--------|-------|
| `EUREKA_HOST` | `localhost` | `eureka-server` | `fuel-system-eureka-server` |
| `SERVICE_REGISTER_HOST` | `127.0.0.1` | `fuel-api-gateway` | (Auto en K8s) |

### URLs de Prisma:

#### Users Service:
```bash
# LOCAL
USERS_DATABASE_URL=postgresql://postgres:admin@localhost:5434/users?schema=public

# DOCKER
USERS_DATABASE_URL=postgresql://postgres:admin@users-db:5432/users?schema=public

# AZURE (construido dinámicamente en K8s)
USERS_DATABASE_URL=postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/users_db?sslmode=require
```

#### Vehicles Service:
```bash
# LOCAL
DATABASE_URL=postgresql://postgres:admin@localhost:5435/vehicles?schema=public
SHADOW_DATABASE_URL=postgresql://postgres:admin@localhost:5435/vehicles_shadow?schema=public

# DOCKER
DATABASE_URL=postgresql://postgres:admin@vehicles-db:5432/vehicles?schema=public
SHADOW_DATABASE_URL=postgresql://postgres:admin@vehicles-db:5432/vehicles_shadow?schema=public

# AZURE (construido dinámicamente en K8s)
DATABASE_URL=postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/vehicles_db?sslmode=require
SHADOW_DATABASE_URL=postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/vehicles_shadow_db?sslmode=require
```

---

## 🔧 Estrategia de Prisma por Ambiente

### 1. DESARROLLO LOCAL

**Problema**: Prisma CLI ejecuta desde `services/users-srv/` pero `.env` está en root.

**Soluciones**:

```bash
# Opción A: Symlink (mejor para desarrollo)
cd services/users-srv
ln -s ../../.env .env

# Opción B: dotenv-cli (cross-platform)
npm install -g dotenv-cli
dotenv -e ../../.env -- npx prisma generate

# Opción C: Archivo individual (simple)
# Copiar solo DATABASE_URL al .env local del servicio
```

### 2. DOCKER BUILD

**Problema**: Dockerfile necesita DATABASE_URL en build time para `prisma generate`.

**Solución**: Los Dockerfiles ya están configurados correctamente.

```dockerfile
# Stage 1: Dependencies
COPY package.json ./
COPY prisma ./prisma/
RUN npm install && npx prisma generate
# ↑ Usa cualquier DATABASE_URL disponible para generar el cliente

# Stage 3: Runtime
CMD ["node", "dist/main.js"]
# ↑ Usa DATABASE_URL real inyectada por docker-compose
```

### 3. AZURE AKS

**Problema**: BUILD necesita URL temporal, RUNTIME necesita URL de Azure.

**Solución**: Build ARG temporal + Variables dinámicas en K8s.

```dockerfile
# Dockerfile recibe build arg
ARG DATABASE_URL=postgresql://temp:temp@localhost:5432/temp
RUN npx prisma generate
```

```yaml
# Kubernetes construye URL en runtime
env:
  - name: USERS_DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/users_db?sslmode=require"
```

---

## ✅ Inconsistencias Corregidas

### 1. Puerto de Vehicles Database
- **Antes**: `5499` (incorrecto, diferente a docker-compose)
- **Ahora**: `5435` (consistente en todo el sistema)

### 2. Variable DATABASE_URL faltante en root
- **Antes**: Solo en `vehicles-svc/.env`
- **Ahora**: En `.env` del root con nombre correcto

### 3. SHADOW_DATABASE_URL faltante
- **Antes**: No documentada
- **Ahora**: Incluida para desarrollo local y Docker

### 4. Variables de Vehicles en root
- **Antes**: Solo AUTH, USERS, DRIVER
- **Ahora**: VEHICLES_DB_HOST, VEHICLES_DB_PORT, etc. agregadas

---

## 🎯 Próximos Pasos

### ✅ Completado:
- [x] Análisis de inconsistencias
- [x] Unificación de variables root
- [x] Templates para 3 ambientes
- [x] Documentación de servicios Prisma

### 🔄 Pendiente:
- [ ] Ajustar Dockerfiles con BUILD_ARGS
- [ ] Crear GitHub Actions workflow
- [ ] Crear scripts de deployment SSH
- [ ] Testing en los 3 ambientes

---

## 📚 Referencias

- **Prisma Docs**: https://www.prisma.io/docs/
- **Docker Compose**: https://docs.docker.com/compose/
- **Kubernetes ConfigMaps**: https://kubernetes.io/docs/concepts/configuration/configmap/
- **Azure PostgreSQL**: https://docs.microsoft.com/en-us/azure/postgresql/

---

## 🆘 Troubleshooting

### Prisma no encuentra DATABASE_URL

```bash
# Verificar que existe
cat .env | grep DATABASE_URL

# Verificar que Prisma lo lee
cd services/users-srv
npx prisma validate
```

### Docker no usa las variables del .env

```bash
# Verificar que docker-compose.yml tiene env_file
grep "env_file" docker-compose.yml

# Rebuild forzando sin caché
docker-compose build --no-cache users-srv
```

### AKS no puede conectar a PostgreSQL

```bash
# Verificar secrets
kubectl get secrets -n fuel-system
kubectl describe secret fuel-system-postgresql -n fuel-system

# Verificar variables en pod
kubectl exec -n fuel-system deployment/fuel-system-users-service -- env | grep DATABASE_URL
```

---

**¡Sistema de variables unificado y listo para producción! 🚀**

