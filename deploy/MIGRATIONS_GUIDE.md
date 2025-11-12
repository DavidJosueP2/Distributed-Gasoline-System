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
# Se ejecuta automáticamente en Init Containers
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

### 🔹 **2. Desarrollo con Docker Compose**

```bash
# Las migraciones se ejecutan automáticamente en el contenedor
docker-compose up -d

# Los servicios con Prisma tienen el comando:
# command: sh -c "npx prisma migrate deploy && npm run start:prod"
```

### 🔹 **3. Kubernetes Local (Kind) - Init Containers**

**Estrategia actual: Init Containers**

Los Init Containers ejecutan las migraciones **antes** de que el contenedor principal inicie:

```yaml
initContainers:
- name: prisma-migrate
  image: ghcr.io/.../vehicles-svc:latest
  command: ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js"]
  env:
    - name: DATABASE_URL
      value: "postgresql://..."
```

**Ventajas:**
- ✅ Las migraciones se ejecutan automáticamente antes del servicio
- ✅ Si la migración falla, el pod no inicia (fail-fast)
- ✅ No requiere recursos adicionales (Jobs)
- ✅ Se ejecuta en cada deploy/restart del pod

**Flujo:**
```
1. Helm install/upgrade
2. Init Container inicia
3. Ejecuta: npx prisma migrate deploy
4. Ejecuta: node dist/prisma/seed.js
5. Init Container termina exitosamente
6. Contenedor principal inicia
7. Servicio disponible ✅
```

### 🔹 **4. Azure AKS - Producción**

Mismo flujo que Kubernetes Local, pero con base de datos Azure PostgreSQL Flexible Server.

```yaml
# Las migraciones se ejecutan en Init Containers
# La BD está en Azure Database for PostgreSQL
DATABASE_URL: postgresql://user:pass@fuel-system-postgres.postgres.database.azure.com:5432/db?sslmode=require
```

---

## 🚀 Estrategia de Despliegue con Init Containers

### Arquitectura Actual

```
┌─────────────────────────────────────────────────────┐
│  Pod: vehicles-service                              │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Init Container: prisma-migrate               │ │
│  │  ─────────────────────────────────────────    │ │
│  │  1. Espera a que PostgreSQL esté listo        │ │
│  │  2. npx prisma migrate deploy                 │ │
│  │  3. node dist/prisma/seed.js                  │ │
│  │  ✅ Termina exitosamente                       │ │
│  └───────────────────────────────────────────────┘ │
│                       ↓                             │
│  ┌───────────────────────────────────────────────┐ │
│  │  Main Container: vehicles-service             │ │
│  │  ──────────────────────��──────────────────    │ │
│  │  Inicia SOLO si Init Container fue exitoso    │ │
│  │  node dist/main.js                            │ │
│  │  🚀 Servicio corriendo                         │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Servicios que Usan Init Containers

| Servicio | ORM | Init Container | Migración | Seeding |
|----------|-----|----------------|-----------|---------|
| **users-srv** | Prisma | ✅ | `prisma db push` | `node dist/prisma/seed.js` |
| **vehicles-svc** | Prisma | ✅ | `prisma migrate deploy` | `node dist/prisma/seed.js` |
| **driver-ms** | TypeORM | ✅ | SQL manual (`init.sql + migrations/*.sql`) | `seed.sql` |
| **routes-srv** | TypeORM | ✅ | SQL manual (`db/init.sql`) | Integrado en `init.sql` |
| **auth-svc** | TypeORM | ✅ | `synchronize: true` (auto) | No requiere |

### Ventajas de Init Containers vs Jobs

| Aspecto | Init Containers ✅ | Jobs ❌ |
|---------|-------------------|---------|
| **Ejecución** | Automática en cada deploy | Manual o con hooks |
| **Fail-Fast** | Si falla, el pod no inicia | El pod puede iniciar sin migraciones |
| **Recursos** | Usa recursos del pod | Requiere recursos adicionales |
| **Orden** | Garantiza orden (init → main) | No garantiza orden |
| **Limpieza** | Automática | Requiere limpieza manual |
| **Idempotencia** | Sí (se puede re-ejecutar) | Sí (si se configura correctamente) |

---

## 🔧 Troubleshooting

### Problema: "Drift detected"

**Causa:** El schema de la base de datos no coincide con Prisma.

**Solución en desarrollo:**
```bash
# Opción 1: Resetear completamente (CUIDADO - borra datos)
npx prisma migrate reset

# Opción 2: Generar una nueva migración que resuelva el drift
npx prisma migrate dev --name fix_drift
```

### Problema: Init Container falla con error de conexión

**Causa:** PostgreSQL no está listo o credenciales incorrectas.

**Solución:**
```bash
# Ver logs del Init Container
kubectl logs <pod-name> -c prisma-migrate -n fuel-system

# Verificar que PostgreSQL esté corriendo
kubectl get pods -n fuel-system | grep postgresql

# Verificar secrets
kubectl get secret fuel-system-postgresql -n fuel-system -o yaml
```

### Problema: "Migration already applied"

**Causa:** Intentas aplicar una migración que ya existe.

**Solución:** Esto es normal y esperado. `prisma migrate deploy` es idempotente y simplemente omitirá migraciones ya aplicadas.

---

## 📝 Mejores Prácticas

1. ✅ **Siempre usa `migrate deploy` en producción** - Nunca uses `migrate dev`
2. ✅ **Prueba migraciones en desarrollo primero** - Antes de commitear
3. ✅ **Usa Init Containers** - Para garantizar migraciones antes del servicio
4. ✅ **Mantén migraciones idempotentes** - Para TypeORM, usa verificaciones condicionales
5. ✅ **Commitea las carpetas de migraciones** - Son parte del código
6. ✅ **Usa seeding para datos iniciales** - No los pongas en migraciones
