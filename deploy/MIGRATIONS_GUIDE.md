# 🔄 Guía Completa de Migraciones - Prisma

## 📋 Índice
1. [¿Qué es `prisma migrate`?](#qué-es-prisma-migrate)
2. [Tipos de Migraciones](#tipos-de-migraciones)
3. [Flujos por Entorno](#flujos-por-entorno)
4. [Estrategias de Despliegue](#estrategias-de-despliegue)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 ¿Qué es `prisma migrate`?

Prisma Migrate es el sistema de migraciones de bases de datos de Prisma que:

1. **Genera migraciones** basándose en cambios en `schema.prisma`
2. **Aplica migraciones** a la base de datos
3. **Rastrea estado** usando la tabla `_prisma_migrations`

### Comandos Principales

```bash
# 🔨 Desarrollo - Crear y aplicar migraciones
npx prisma migrate dev

# 🚀 Producción - Solo aplicar migraciones existentes
npx prisma migrate deploy

# ❌ Resetear BD (CUIDADO - borra todo)
npx prisma migrate reset
```

---

## 📁 Tipos de Migraciones

### 1️⃣ **migrate dev** (Desarrollo Local)
- ✅ Crea nuevas migraciones basándose en cambios en `schema.prisma`
- ✅ Las aplica inmediatamente
- ✅ Regenera Prisma Client
- ⚠️ Puede resetear la BD si detecta drift (divergencia)

```bash
# Ejemplo
npx prisma migrate dev --name add_status_field
```

**Resultado:**
```
prisma/migrations/
  └── 20251031120000_add_status_field/
      └── migration.sql
```

### 2️⃣ **migrate deploy** (Producción)
- ✅ Solo aplica migraciones pendientes
- ✅ NO crea nuevas migraciones
- ✅ NO modifica `schema.prisma`
- ✅ Es **idempotent** (puedes ejecutarlo múltiples veces)

```bash
# Se ejecuta automáticamente en contenedores/pods
npx prisma migrate deploy
```

---

## 🌍 Flujos por Entorno

### 🔹 **1. Desarrollo Local (sin Docker)**

Ejecutas Node.js directamente en tu máquina.

```bash
# Paso 1: Cambiar schema.prisma
# Paso 2: Crear y aplicar migración
cd services/vehicles-svc
npx prisma migrate dev --name mi_cambio

# Prisma automáticamente:
# ✅ Crea prisma/migrations/XXX_mi_cambio/migration.sql
# ✅ Aplica el SQL a la BD local
# ✅ Registra en _prisma_migrations
# ✅ Regenera Prisma Client
```

**Flujo:**
```
┌─────────────────┐
│ Developer       │
│ modifica        │
│ schema.prisma   │
└────────┬────────┘
         │
         ▼
   npx prisma migrate dev
         │
         ▼
┌─────────────────────────┐
│ 1. Genera migration.sql │
│ 2. Aplica a DB local    │
│ 3. Actualiza Client     │
└─────────────────────────┘
```

---

### 🔹 **2. Docker Local (docker-compose.yml)**

**✅ Configuración Actual (CORREGIDA):**

```yaml
# vehicles-db (PostgreSQL)
volumes:
  - vehicles_db_data:/var/lib/postgresql/data
  # ⚠️ NO montar SQL manualmente

# vehicles-svc
command: sh -c "npx prisma migrate deploy && node dist/main.js"
```

**Flujo:**
```
┌──────────────────┐
│ Docker Compose   │
│ levanta DBs      │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ vehicles-db inicia      │
│ BD vacía (solo "public")│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ vehicles-svc inicia     │
│ ejecuta:                │
│ "prisma migrate deploy" │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Prisma aplica TODAS         │
│ las migraciones en orden:   │
│ 1. 20251004143040_init      │
│ 2. 20251004225500_baseline  │
│ ...                         │
└─────────────────────────────┘
```

**⚠️ Importante:**
- **NO montes** `migration.sql` directamente en `/docker-entrypoint-initdb.d/`
- Deja que Prisma maneje TODO el esquema
- Las migraciones se ejecutan **cada vez que reinicia el contenedor** (idempotent)

---

### 🔹 **3. Azure / Kubernetes (Producción)**

Según `ARCHITECTURE.md`, usarás:
- **AKS**: Para microservicios
- **Azure PostgreSQL Flexible Server**: Base de datos administrada

**Estrategia: initContainer**

```yaml
# deploy/helm/fuel-system/templates/microservices.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vehicles-service
spec:
  template:
    spec:
      # 🚀 Init Container ejecuta migraciones ANTES del contenedor principal
      initContainers:
      - name: prisma-migrate
        image: registry.azurecr.io/vehicles-svc:latest
        command: ["sh", "-c", "npx prisma migrate deploy"]
        env:
        - name: DATABASE_URL
          value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/vehicles_db?schema=public&sslmode=require"
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: fuel-system-config
              key: POSTGRESQL_HOST
        # ... más variables de entorno
      
      # 🎯 Contenedor principal (app)
      containers:
      - name: vehicles-service
        image: registry.azurecr.io/vehicles-svc:latest
        command: ["node", "dist/main.js"]
        # ... resto de configuración
```

**Flujo en Azure:**
```
┌─────────────────────────┐
│ Azure PostgreSQL        │
│ (Servicio Administrado) │
│ BD vacía inicial        │
└──────────┬──────────────┘
           │
           │ Connection via Private Endpoint
           │
┌──────────▼──────────────┐
│ AKS Pod                 │
│ ┌─────────────────────┐ │
│ │ initContainer       │ │
│ │ "prisma-migrate"    │ │
│ │                     │ │
│ │ npx prisma          │ │
│ │   migrate deploy    │ │
│ └──────────┬──────────┘ │
│            │             │
│            ▼             │
│  ✅ Migraciones         │
│     aplicadas           │
│            │             │
│ ┌──────────▼──────────┐ │
│ │ app container       │ │
│ │ "vehicles-service"  │ │
│ │                     │ │
│ │ node dist/main.js   │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

**Ventajas del initContainer:**
- ✅ Garantiza que migraciones se apliquen **antes** de iniciar la app
- ✅ Si migraciones fallan, el pod no inicia
- ✅ Compatible con rolling updates
- ✅ Se ejecuta en cada deploy automáticamente

---

## 🚀 Estrategias de Despliegue

### Opción 1: initContainer (✅ Recomendado)

**Pros:**
- ✅ Automático en cada deploy
- ✅ Fail-fast (pod no inicia si migración falla)
- ✅ No requiere pasos manuales

**Contras:**
- ⚠️ Rolling updates pueden causar múltiples ejecuciones (OK porque es idempotent)

---

### Opción 2: Kubernetes Job (Manual/CI)

Para migraciones complejas que requieren supervisión:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: vehicles-migrate-{{ .Release.Revision }}
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: registry.azurecr.io/vehicles-svc:latest
        command: ["npx", "prisma", "migrate", "deploy"]
        env:
        - name: DATABASE_URL
          value: "postgresql://..."
      restartPolicy: Never
```

**Ejecutar manualmente:**
```bash
kubectl apply -f migrate-job.yaml
kubectl wait --for=condition=complete job/vehicles-migrate-001
kubectl apply -f deployment.yaml
```

---

### Opción 3: CI/CD Pipeline

Ejecuta migraciones ANTES de actualizar pods:

```yaml
# .github/workflows/deploy.yml
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
    - name: Run Prisma Migrations
      run: |
        kubectl run migrate-temp \
          --image=registry.azurecr.io/vehicles-svc:${{ github.sha }} \
          --restart=Never \
          --command -- npx prisma migrate deploy
        kubectl wait --for=condition=Ready pod/migrate-temp
        kubectl delete pod migrate-temp
  
  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to AKS
      run: helm upgrade fuel-system ./deploy/helm/fuel-system
```

---

## 🔍 Troubleshooting

### ❌ Error P3005: Database not empty

**Síntoma:**
```
Error: P3005
The database schema is not empty.
```

**Causa:**
- La BD ya tiene tablas pero **no** tiene la tabla `_prisma_migrations`
- Prisma no sabe si esas tablas fueron creadas por migraciones o manualmente

**Solución 1: Baseline (para BD existentes)**

```bash
# Marca todas las migraciones como aplicadas sin ejecutarlas
npx prisma migrate resolve --applied 20251004143040_init_vehicles
npx prisma migrate resolve --applied 20251004225500_make_baseline_override_optional

# Ahora ejecuta normalmente
npx prisma migrate deploy
```

**Solución 2: Resetear BD (solo desarrollo)**

```bash
# ⚠️ BORRA TODO
npx prisma migrate reset --force

# Vuelve a aplicar
npx prisma migrate deploy
```

**Solución 3: Docker - Limpiar volúmenes**

```bash
# Detener y eliminar volúmenes
docker-compose down -v

# Reconstruir
docker-compose up --build
```

---

### ❌ Error: Migration file not found

**Síntoma:**
```
Migration file not found: prisma/migrations/XXX
```

**Causa:**
- El archivo `migration.sql` no se copió al contenedor Docker

**Solución:**

Verifica el `Dockerfile`:

```dockerfile
# DEBE copiar la carpeta prisma completa
COPY --from=build /app/prisma ./prisma
```

---

### ❌ Error: Connection refused

**Síntoma:**
```
Can't reach database server at vehicles-db:5432
```

**Causa:**
- La BD no está lista
- Variables de entorno incorrectas

**Solución:**

```yaml
# docker-compose.yml
vehicles-svc:
  depends_on:
    vehicles-db:
      condition: service_healthy  # ✅ Espera health check
```

---

### ⚠️ Warning: `package.json#prisma` is deprecated

**Causa:**
- Prisma 7 deprecó la configuración en `package.json`

**Solución:**

Crear `prisma.config.ts`:

```typescript
import { defineConfig } from 'prisma';

export default defineConfig({
  seed: {
    command: 'ts-node prisma/seed.ts',
  },
});
```

Eliminar de `package.json`:
```json
// ❌ Eliminar esto
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

---

## 📊 Comparación de Enfoques

| Aspecto | migrate dev | migrate deploy | Manual SQL |
|---------|-------------|----------------|------------|
| **Entorno** | Desarrollo local | Producción | Cualquiera |
| **Crea migraciones** | ✅ Sí | ❌ No | ❌ No |
| **Aplica migraciones** | ✅ Sí | ✅ Sí | ⚠️ Manual |
| **Idempotent** | ⚠️ No (puede resetear) | ✅ Sí | ⚠️ Depende |
| **Rastrea historial** | ✅ Sí | ✅ Sí | ❌ No |
| **Seguro en prod** | ❌ No | ✅ Sí | ⚠️ Depende |

---

## ✅ Best Practices

### 1. Nunca uses `migrate dev` en producción
```bash
# ❌ PELIGROSO en producción
npx prisma migrate dev

# ✅ CORRECTO en producción
npx prisma migrate deploy
```

### 2. Siempre usa initContainer o Job en Kubernetes
```yaml
initContainers:
- name: migrate
  command: ["npx", "prisma", "migrate", "deploy"]
```

### 3. En Docker, NO montes SQL directamente
```yaml
# ❌ MALO
volumes:
  - ./init.sql:/docker-entrypoint-initdb.d/01-init.sql

# ✅ BUENO (deja que Prisma lo maneje)
command: sh -c "npx prisma migrate deploy && node dist/main.js"
```

### 4. Versiona tus migraciones en Git
```bash
git add prisma/migrations/
git commit -m "feat: add user status field"
```

### 5. Prueba migraciones en staging antes de producción
```bash
# Staging
helm upgrade --install fuel-system ./deploy/helm/fuel-system \
  --namespace staging

# Production (después de validar)
helm upgrade --install fuel-system ./deploy/helm/fuel-system \
  --namespace production
```

---

## 📚 Referencias

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Production Migrations](https://www.prisma.io/docs/guides/deployment/deploy-database-changes-with-prisma-migrate)
- [Baseline Existing Databases](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/add-prisma-migrate-to-a-project)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del sistema

---

**¿Preguntas?** Revisa la sección de [Troubleshooting](#troubleshooting) o consulta los docs de Prisma.

