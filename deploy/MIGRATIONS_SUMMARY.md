# 📝 Resumen Ejecutivo - Migraciones de Prisma

## ✅ **Problema Resuelto**

### Error Original:
```
Error: P3005
The database schema is not empty.
```

### ¿Por qué ocurría?
Docker Compose montaba `migration.sql` directamente → PostgreSQL ejecutaba el script → La BD tenía esquema **sin registro en `_prisma_migrations`** → Prisma no sabía qué hacer

### Solución:
✅ **Eliminado el montaje de SQL** en `docker-compose.yml`  
✅ **Prisma maneja TODO** vía `npx prisma migrate deploy`  
✅ **Consistencia** entre Docker local y Kubernetes/Azure

---

## 🔄 **Cómo Funcionan las Migraciones Ahora**

### 📍 **Desarrollo Local** (sin Docker)
```bash
# 1. Modificas schema.prisma
# 2. Creas migración
npx prisma migrate dev --name mi_cambio

# Prisma automáticamente:
# ✅ Genera prisma/migrations/XXX_mi_cambio/migration.sql
# ✅ Aplica a BD
# ✅ Registra en _prisma_migrations
```

**¿Cuándo?** Al desarrollar nuevas features

---

### 🐳 **Docker Local** (docker-compose.yml)
```yaml
# vehicles-db: BD vacía (sin scripts SQL)
# vehicles-svc: ejecuta comando
command: sh -c "npx prisma migrate deploy && node dist/main.js"
```

**Flujo:**
1. PostgreSQL inicia → BD vacía ✅
2. vehicles-svc inicia → Ejecuta `prisma migrate deploy` ✅
3. Prisma aplica **todas** las migraciones en orden ✅
4. App inicia con esquema completo ✅

**¿Cuándo?** Al probar localmente con Docker

---

### ☁️ **Azure/Kubernetes** (Producción)
```yaml
# Helm template con initContainer
initContainers:
- name: prisma-migrate
  command: ["npx", "prisma", "migrate", "deploy"]
  # Se ejecuta ANTES del contenedor principal
```

**Flujo:**
1. Azure PostgreSQL → BD vacía inicial ✅
2. Pod inicia → initContainer ejecuta migraciones ✅
3. Si migraciones fallan → Pod no inicia (fail-fast) ✅
4. Si migraciones OK → App container inicia ✅

**¿Cuándo?** En cada deploy a Azure (automático)

---

## 🎯 **Diferencias Clave**

| Comando | Cuándo usar | ¿Crea migraciones? | ¿Aplica migraciones? |
|---------|-------------|-------------------|---------------------|
| `prisma migrate dev` | Desarrollo local (sin Docker) | ✅ Sí | ✅ Sí |
| `prisma migrate deploy` | Docker + Kubernetes + Azure | ❌ No | ✅ Sí |

---

## 🚀 **¿Qué Hicimos?**

### 1. Corregimos Docker Compose
**Antes:**
```yaml
volumes:
  - ./migration.sql:/docker-entrypoint-initdb.d/01-init.sql  # ❌ Conflicto
command: sh -c "npx prisma migrate deploy && node dist/main.js"
```

**Después:**
```yaml
volumes:
  - vehicles_db_data:/var/lib/postgresql/data  # ✅ Solo volumen de datos
command: sh -c "npx prisma migrate deploy && node dist/main.js"  # ✅ Prisma maneja todo
```

### 2. Actualizamos Kubernetes Templates
**Agregamos initContainer:**
```yaml
initContainers:
- name: prisma-migrate
  command: ["sh", "-c", "npx prisma migrate deploy"]
  # Se ejecuta ANTES de la app
```

### 3. Migramos Configuración de Prisma
**Antes (deprecated):**
```json
// package.json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

**Después (Prisma 7):**
```typescript
// prisma.config.ts
export default defineConfig({
  seed: { command: 'ts-node prisma/seed.ts' }
});
```

---

## ✅ **Pasos para Probar**

### Opción 1: Limpiar y Reiniciar Docker

```bash
# 1. Detener y limpiar volúmenes
docker-compose down -v

# 2. Reconstruir imágenes
docker-compose build vehicles-svc

# 3. Iniciar todo
docker-compose up

# ✅ Deberías ver:
# vehicles-svc | Prisma schema loaded from prisma/schema.prisma
# vehicles-svc | 2 migrations found in prisma/migrations
# vehicles-svc | Applying migration `20251004143040_init_vehicles`
# vehicles-svc | Applying migration `20251004225500_make_baseline_override_optional`
# vehicles-svc | The following migrations have been applied:
# vehicles-svc | migrations/
# vehicles-svc |   └─ 20251004143040_init_vehicles/
# vehicles-svc |       └─ migration.sql
# vehicles-svc |   └─ 20251004225500_make_baseline_override_optional/
# vehicles-svc |       └─ migration.sql
# vehicles-svc | All migrations have been successfully applied.
```

### Opción 2: Solo Infraestructura (desarrollo local)

```bash
# 1. Levantar solo DBs
docker-compose -f docker-compose.infra.yml up -d

# 2. Ejecutar microservicio localmente
cd services/vehicles-svc
npm run start:dev

# Prisma automáticamente aplicará migraciones al iniciar
```

---

## 🔍 **Verificación**

### Conectar a PostgreSQL:
```bash
docker exec -it fuel-vehicles-db psql -U postgres -d vehicles
```

### Verificar migraciones aplicadas:
```sql
-- Ver tabla de migraciones
SELECT * FROM _prisma_migrations;

-- Deberías ver algo como:
-- id | checksum | finished_at | migration_name | started_at
-- 1  | xxx      | 2025-10-31  | 20251004143040_init_vehicles | 2025-10-31
-- 2  | yyy      | 2025-10-31  | 20251004225500_make_baseline... | 2025-10-31
```

### Verificar tablas creadas:
```sql
\dt

-- Deberías ver:
-- vehicle_models
-- model_engine_specs
-- vehicle_units
-- unit_consumption_specs
-- ...
```

---

## 🎓 **Conceptos Clave**

### 1. **Idempotencia**
`prisma migrate deploy` es idempotent → Puedes ejecutarlo múltiples veces, solo aplica migraciones pendientes.

```bash
# Primera ejecución → Aplica 2 migraciones
npx prisma migrate deploy

# Segunda ejecución → No hace nada (ya aplicadas)
npx prisma migrate deploy  # ✅ "No pending migrations"
```

### 2. **Tabla `_prisma_migrations`**
Prisma rastrea qué migraciones se han aplicado:

```sql
CREATE TABLE _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);
```

### 3. **Shadow Database** (vehicles-svc)
Prisma usa una BD temporal para validar migraciones:

```env
DATABASE_URL=postgresql://user:pass@host:5432/vehicles
SHADOW_DATABASE_URL=postgresql://user:pass@host:5432/vehicles_shadow
```

En **desarrollo** → Prisma crea/destruye `vehicles_shadow` automáticamente  
En **producción** → Solo se usa `DATABASE_URL`

---

## 📚 **Documentación Relacionada**

- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) - Guía completa con troubleshooting
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del sistema
- [QUICK_START.md](./QUICK_START.md) - Inicio rápido
- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

## ⚠️ **Cosas Importantes**

### ✅ DO:
- ✅ Versiona `prisma/migrations/` en Git
- ✅ Usa `migrate dev` en desarrollo local
- ✅ Usa `migrate deploy` en Docker/Kubernetes/Azure
- ✅ Prueba migraciones en staging antes de producción

### ❌ DON'T:
- ❌ NO uses `migrate dev` en producción
- ❌ NO montes SQL directamente en Docker
- ❌ NO modifiques `migration.sql` después de crearlo
- ❌ NO ejecutes migraciones manualmente en producción

---

## 🎉 **Resultado Final**

### Antes (Problema):
```
❌ Error P3005: Database not empty
❌ Conflicto entre SQL montado y Prisma
❌ No funciona en producción
```

### Después (Solución):
```
✅ Prisma maneja TODO el esquema
✅ Consistencia entre todos los entornos
✅ Automático en Azure/Kubernetes con initContainer
✅ Sin warnings de Prisma 7
```

---

**¿Dudas?** Lee [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) para troubleshooting detallado.

