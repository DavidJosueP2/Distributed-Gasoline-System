# 🔄 Guía Completa de Migraciones - Prisma

## 📋 Índice
1. [¿Qué es `prisma migrate`?](#qué-es-prisma-migrate)
2. [Tipos de Migraciones](#tipos-de-migraciones)
3. [Flujos por Entorno](#flujos-por-entorno)
4. [Estrategia de Despliegue con Init Containers](#estrategia-de-despliegue-con-init-containers)
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

### 🔹 **3. Kubernetes Local (Kind) / Azure AKS**

**✅ Estrategia ACTUAL: Init Containers**

Usamos **Init Containers** en los Deployments para ejecutar migraciones **antes** de que el contenedor principal inicie.

**Configuración en microservices.yaml:**
```yaml
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
        image: ghcr.io/.../vehicles-svc:latest
        command: ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js"]
        env:
        - name: DATABASE_URL
          value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/vehicles_db?schema=public&sslmode=disable"
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: fuel-system-config
              key: VEHICLES_DB_HOST
        # ... más variables de entorno
      
      # 🎯 Contenedor principal (app)
      containers:
      - name: vehicles-service
        image: ghcr.io/.../vehicles-svc:latest
        command: ["node", "dist/main.js"]
        # ... resto de configuración
```

**Flujo en Kubernetes:**
```
┌─────────────────────────┐
│ PostgreSQL Pod Ready    │
│ (vehicles-db)           │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Pod starts              │
│ ┌─────────────────────┐ │
│ │ initContainer       │ │
│ │ "prisma-migrate"    │ │
│ │                     │ │
│ │ 1. npx prisma       │ │
│ │    migrate deploy   │ │
│ │ 2. node dist/       │ │
│ │    prisma/seed.js   │ │
│ └──────────┬──────────┘ │
│            │             │
│      ✅ Success          │
│            │             │
│ ┌──────────▼──────────┐ │
│ │ app container       │ │
│ │ "vehicles-service"  │ │
│ │                     │ │
│ │ node dist/main.js   │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

**Ventajas del Init Container:**
- ✅ Garantiza que migraciones se apliquen **antes** de iniciar la app
- ✅ Si migraciones fallan, el pod no inicia (fail-fast)
- ✅ Compatible con rolling updates
- ✅ Se ejecuta automáticamente en cada deploy
- ✅ Idempotente - puede ejecutarse múltiples veces sin problemas

**Para TypeORM (driver-ms, routes-srv):**

```yaml
initContainers:
- name: typeorm-migrate
  image: ghcr.io/.../driver-ms:latest
  command:
    - sh
    - -c
    - |
      # 1. Wait for DB
      echo "🔄 Waiting for database..."
      for i in $(seq 1 30); do
        if PGPASSWORD="${DRIVER_DB_PASS}" psql -h "${DRIVER_DB_HOST}" -p "${DRIVER_DB_PORT}" -U "${DRIVER_DB_USER}" -d "${DRIVER_DB_NAME}" -c '\q' 2>/dev/null; then
          echo "✅ Database ready!"
          break
        fi
        sleep 2
      done
      
      # 2. Execute init.sql
      echo "🔄 Running init.sql..."
      PGPASSWORD="${DRIVER_DB_PASS}" psql -h "${DRIVER_DB_HOST}" -p "${DRIVER_DB_PORT}" -U "${DRIVER_DB_USER}" -d "${DRIVER_DB_NAME}" -v ON_ERROR_STOP=1 -f /app/init.sql
      
      # 3. Execute migrations
      echo "🔄 Running migrations..."
      for migration in /app/migrations/*.sql; do
        if [ -f "$migration" ]; then
          echo "Applying: $migration"
          PGPASSWORD="${DRIVER_DB_PASS}" psql -h "${DRIVER_DB_HOST}" -p "${DRIVER_DB_PORT}" -U "${DRIVER_DB_USER}" -d "${DRIVER_DB_NAME}" -f "$migration" || echo "⚠️ Migration may be already applied"
        fi
      done
      
      echo "✅ Database initialization complete!"
  env:
  - name: DRIVER_DB_HOST
    valueFrom:
      configMapKeyRef:
        name: fuel-system-config
        key: DRIVER_DB_HOST
  # ... más variables
```

---

## 🚀 Estrategia de Despliegue con Init Containers

### ✅ Recomendación: Init Containers (Método Actual)

**Por qué Init Containers:**
- ✅ **Automático**: Se ejecuta en cada deploy sin pasos manuales
- ✅ **Fail-fast**: El pod no inicia si las migraciones fallan
- ✅ **Rollback seguro**: Si falla, Kubernetes mantiene la versión anterior
- ✅ **Idempotente**: `prisma migrate deploy` puede ejecutarse múltiples veces
- ✅ **Sin downtime**: Compatible con rolling updates

**Cómo funciona:**
1. Kubernetes crea el pod
2. Ejecuta el init container (migraciones + seed)
3. Si tiene éxito → inicia el contenedor principal
4. Si falla → el pod queda en estado `Init:Error`

**Desplegar/Actualizar:**
```bash
# Local (Kind)
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/local/values-local.yaml

# Azure (AKS)
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml
```

### 📊 Comparación de Estrategias

| Aspecto | Init Containers ✅ | Kubernetes Jobs ❌ | CI/CD Pipeline ❌ |
|---------|-------------------|-------------------|------------------|
| **Automático** | ✅ Sí | ⚠️ Requiere hooks | ⚠️ Requiere config |
| **Fail-fast** | ✅ Sí | ⚠️ No | ⚠️ Depende |
| **Rollback** | ✅ Automático | ❌ Manual | ❌ Manual |
| **Complejidad** | ✅ Baja | ⚠️ Media | ⚠️ Alta |
| **Recomendado** | ✅ Sí | ❌ No | ❌ No |

**Nota:** Anteriormente consideramos usar Kubernetes Jobs con Helm Hooks, pero los **Init Containers son superiores** para nuestro caso de uso porque garantizan el orden de ejecución y proporcionan mejor integración con el ciclo de vida del pod.

---

## 🔍 Troubleshooting

### ❌ Init Container falla: "Error P3005: Database not empty"

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
# Conectarse al pod temporalmente
kubectl run prisma-baseline --rm -it \
  --image=ghcr.io/.../vehicles-svc:latest \
  --env="DATABASE_URL=postgresql://..." \
  --command -- sh

# Dentro del pod:
npx prisma migrate resolve --applied 20251004143040_init_vehicles
npx prisma migrate resolve --applied 20251004225500_make_baseline_override_optional
```

**Solución 2: Eliminar y recrear el volumen (solo local)**

```bash
# Eliminar el release y PVC
helm uninstall vehicles-db -n fuel-system
kubectl delete pvc data-vehicles-db-postgresql-0 -n fuel-system

# Reinstalar
helm install vehicles-db bitnami/postgresql -n fuel-system --set ...
```

### ❌ Init Container queda en "Init:CrashLoopBackOff"

**Síntoma:**
```bash
kubectl get pods -n fuel-system
# fuel-system-vehicles-service-xxx   Init:CrashLoopBackOff
```

**Diagnóstico:**
```bash
# Ver logs del init container
kubectl logs -n fuel-system fuel-system-vehicles-service-xxx -c prisma-migrate

# Ver eventos del pod
kubectl describe pod -n fuel-system fuel-system-vehicles-service-xxx
```

**Causas comunes:**
1. ⚠️ Base de datos no está lista
2. ⚠️ Credenciales incorrectas
3. ⚠️ Variables de entorno faltantes
4. ⚠️ Archivo de migración corrupto

**Solución:**
```bash
# Verificar conectividad a la BD
kubectl exec -it -n fuel-system fuel-system-vehicles-service-xxx -c prisma-migrate -- sh
# (Dentro del container)
psql -h $DB_HOST -U $DB_USERNAME -d vehicles_db
```

### ❌ Error: "Migration file not found"

**Síntoma:**
```
Migration file not found: prisma/migrations/XXX/migration.sql
```

**Causa:**
- Los archivos de migración no se copiaron al contenedor Docker

**Solución:**

Verifica el `Dockerfile`:

```dockerfile
# DEBE copiar la carpeta prisma completa
COPY services/vehicles-svc/prisma ./prisma

# Y en el stage final:
COPY --from=build /app/prisma ./prisma
```

### ❌ Init Container tarda mucho (Timeout)

**Síntoma:**
- El init container se queda "Running" por más de 5 minutos

**Solución:**

Ajustar timeouts en el Deployment:

```yaml
initContainers:
- name: prisma-migrate
  # ... configuración
  # Agregar timeout explícito
  livenessProbe:
    exec:
      command: ["true"]
    initialDelaySeconds: 300  # 5 minutos
    periodSeconds: 10
```

---

## 📝 Resumen

### ✅ Método Actual: Init Containers

```yaml
# En cada Deployment de microservicio
initContainers:
- name: prisma-migrate  # o typeorm-migrate
  image: <service-image>:latest
  command: ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js"]
  env: [...]  # Variables de conexión a BD
```

### 🚫 NO usamos Kubernetes Jobs

Los Kubernetes Jobs con Helm Hooks fueron considerados pero **descartados** porque:
- ❌ Requieren gestión manual de ciclo de vida
- ❌ No garantizan orden con respecto a los Deployments
- ❌ Complican el rollback
- ❌ No son fail-fast por defecto

### 📦 Servicios y sus Estrategias

| Servicio | ORM | Init Container | Archivos |
|----------|-----|----------------|----------|
| **users-srv** | Prisma | ✅ `npx prisma db push && seed` | `prisma/` |
| **vehicles-svc** | Prisma | ✅ `npx prisma migrate deploy && seed` | `prisma/` |
| **driver-ms** | TypeORM | ✅ `psql init.sql + migrations/*.sql` | `init.sql`, `migrations/`, `seed.sql` |
| **routes-srv** | TypeORM | ✅ `psql db/init.sql` (incluye seed) | `db/init.sql` |
| **auth-svc** | TypeORM | ✅ `wait-for-db` (synchronize:true en dev) | N/A |

---

## 🔗 Referencias

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Kubernetes Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [INIT_CONTAINERS_SETUP.md](./INIT_CONTAINERS_SETUP.md) - Detalles de implementación
