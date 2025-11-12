# 🌱 Estrategia de Seeding - Fuel System

## 📋 Resumen

Esta documentación explica cómo se manejan los datos iniciales (seeding) en cada microservicio, garantizando que las bases de datos tengan los datos mínimos necesarios para funcionar correctamente.

## 🎯 Objetivo

**Separar responsabilidades:**
- **ORMs (Prisma/TypeORM)** → Manejan la **estructura** de la base de datos (tablas, columnas, índices)
- **Scripts de Seed** → Manejan los **datos iniciales** (usuarios, roles, catálogos)

## 🔄 Proceso de Inicialización

```
┌─────────────────────────────────────────────────────────┐
│  1. Base de Datos Vacía                                 │
└─────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  2. Migraciones/Sincronización (ORM)                    │
│     → Crea tablas, índices, constraints                │
└─────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  3. Seeding (Scripts de Seed)                           │
│     → Inserta datos iniciales                           │
└─────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│  4. Aplicación Lista ✅                                  │
└─────────────────────────────────────────────────────────┘
```

## 📦 Servicios y Sus Seeds

### 1. `users-srv` (Prisma)

**Archivo:** `services/users-srv/prisma/seed.ts`

**Datos que inserta:**
- ✅ 3 Roles: ADMIN, SUPERVISOR, DRIVER
- ✅ 3 Usuarios de prueba:
  - `alice_admin` / `admin123` → Rol: ADMIN
  - `sam_supervisor` / `supervisor123` → Rol: SUPERVISOR
  - `dylan_driver` / `driver123` → Rol: DRIVER

**Comando de ejecución en Init Container:**
```bash
# Dentro del initContainer
npx prisma db push --accept-data-loss --skip-generate && node dist/prisma/seed.js
```

**Características:**
- 🔄 Idempotente (usa `upsert`)
- 🔒 Contraseñas hasheadas con bcrypt
- 📧 Incluye emails y teléfonos de prueba

---

### 2. `vehicles-svc` (Prisma)

**Archivo:** `services/vehicles-svc/prisma/seed.ts`

**Datos que inserta:**
- ✅ 20 Modelos de vehículos (mezcla de livianos, pesados, especiales)
- ✅ 20 Unidades vehiculares (una por modelo)
- ✅ Especificaciones de motor para cada modelo
- ✅ Requisitos de licencia para cada vehículo
- ✅ Especificaciones de consumo

**Categorías de vehículos:**
- 🚛 5 Pesados de Carga (Licencia E) - Volvo, Scania, Mercedes-Benz, Hino, Mack
- 🚌 3 Pesados de Pasajeros (Licencia D) - Volvo, Mercedes-Benz, King Long
- 🚚 4 Livianos Comerciales (Licencia C) - Hyundai, Chevrolet, JAC, Ford
- 🚗 5 Livianos Particulares (Licencia B) - Chevrolet, Kia, Toyota, Nissan, Mazda
- 🏍️ 2 Motocicletas (Licencia A) - Yamaha, Bajaj
- ♿ 1 Vehículo Adaptado (Licencia F) - Renault
- 🚜 1 Vehículo Agrícola (Licencia G) - John Deere

**Comando de ejecución en Init Container:**
```bash
# Dentro del initContainer
npx prisma migrate deploy && node dist/prisma/seed.js
```

**Características:**
- 🔄 Idempotente (usa `upsert` y búsquedas antes de crear)
- 🔢 VINs generados automáticamente (formato: TEST + 13 dígitos)
- 📋 Placas únicas predefinidas (PAA-0001, PAB-0002, etc.)

---

### 3. `driver-ms` (TypeORM)

**Archivo:** `services/driver-ms/seed.sql`

**Datos que inserta:**
- ✅ 1 Driver de prueba (Juan Pérez, user_id=1)
- ✅ 1 Vehículo asociado (Toyota Hilux, placa ABC-1234)
- ✅ 1 Documento de licencia válido

**Comando de ejecución en Init Container:**
```bash
# Ejecutado automáticamente en el initContainer
PGPASSWORD="${DRIVER_DB_PASS}" psql \
  -h "${DRIVER_DB_HOST}" \
  -U "${DRIVER_DB_USER}" \
  -d "${DRIVER_DB_NAME}" \
  -f /app/seed.sql
```

**Características:**
- 🔄 Idempotente (usa `ON CONFLICT DO NOTHING`)
- 🔗 Depende de que exista `user_id=1` en `users-srv`

---

### 4. `routes-srv` (TypeORM)

**Archivo:** `services/routes-srv/db/init.sql` (incluye seeding)

**Datos que inserta:**
- ✅ 5 Rutas de prueba (Centro-Norte, Sur-Aeropuerto, Este-Oeste, Norte-Sur, Centro-Comercial)
- ✅ Diferentes tipos de vehículos (LIVIANO, PESADO, CUALQUIERA)
- ✅ Coordenadas GPS para origen y destino
- ✅ 5 Viajes de prueba con diferentes estados:
  - 1 viaje EN_RUTA (driver_id=1)
  - 1 viaje CREADO (supervisor_id=2)
  - 3 viajes TERMINADOS

**Comando de ejecución en Init Container:**
```bash
# Ejecutado automáticamente en el initContainer
PGPASSWORD="${ROUTES_DB_PASS}" psql \
  -h "${ROUTES_DB_HOST}" \
  -U "${ROUTES_DB_USER}" \
  -d "${ROUTES_DB_NAME}" \
  -f /app/db/init.sql
```

**Características:**
- 🔄 Idempotente (usa `WHERE NOT EXISTS` y `ON CONFLICT DO NOTHING`)
- 📍 Incluye coordenadas reales de Bogotá
- 🚗 Vinculado con drivers y vehículos de otros servicios

---

### 5. `auth-svc` (TypeORM)

**⚠️ No requiere seeding**

Este servicio solo maneja la lógica de autenticación. Los usuarios y roles están en `users-srv`.

---

## ☁️ Kubernetes - Implementación con Init Containers

### 🚀 Estrategia Actual: Init Containers

Usamos **Init Containers** en cada Deployment para ejecutar migraciones y seeding **antes** de que el contenedor principal inicie.

**Ventajas:**
- ✅ Automático en cada deploy
- ✅ Fail-fast: Si falla, el pod no inicia
- ✅ Integrado con el ciclo de vida del pod
- ✅ No requiere gestión manual de Jobs

### 📋 Implementación por Servicio

#### 1. Users Service (Prisma)

Configurado en `deploy/helm/fuel-system/templates/microservices.yaml`:

```yaml
initContainers:
- name: prisma-migrate
  image: ghcr.io/.../users-srv:latest
  command: ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && node dist/prisma/seed.js"]
  env:
  - name: USERS_DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/users_db?schema=public&sslmode=disable"
  - name: DB_HOST
    valueFrom:
      configMapKeyRef:
        name: fuel-system-config
        key: USERS_DB_HOST
  # ... más variables
```

#### 2. Vehicles Service (Prisma)

```yaml
initContainers:
- name: prisma-migrate
  image: ghcr.io/.../vehicles-svc:latest
  command: ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js"]
  env:
  - name: DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/vehicles_db?schema=public&sslmode=disable"
  - name: SHADOW_DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/vehicles_shadow_db?schema=public&sslmode=disable"
  # ... más variables
```

#### 3. Driver Service (TypeORM)

```yaml
initContainers:
- name: typeorm-migrate
  image: ghcr.io/.../driver-ms:latest
  command:
    - sh
    - -c
    - |
      # Wait for DB
      for i in $(seq 1 30); do
        if PGPASSWORD="${DRIVER_DB_PASS}" psql -h "${DRIVER_DB_HOST}" -p "${DRIVER_DB_PORT}" -U "${DRIVER_DB_USER}" -d "${DRIVER_DB_NAME}" -c '\q' 2>/dev/null; then
          break
        fi
        sleep 2
      done
      
      # Execute init.sql
      PGPASSWORD="${DRIVER_DB_PASS}" psql -h "${DRIVER_DB_HOST}" -p "${DRIVER_DB_PORT}" -U "${DRIVER_DB_USER}" -d "${DRIVER_DB_NAME}" -v ON_ERROR_STOP=1 -f /app/init.sql
      
      # Execute migrations
      for migration in /app/migrations/*.sql; do
        if [ -f "$migration" ]; then
          PGPASSWORD="${DRIVER_DB_PASS}" psql -h "${DRIVER_DB_HOST}" -p "${DRIVER_DB_PORT}" -U "${DRIVER_DB_USER}" -d "${DRIVER_DB_NAME}" -f "$migration" || true
        fi
      done
      
      # Execute seed
      PGPASSWORD="${DRIVER_DB_PASS}" psql -h "${DRIVER_DB_HOST}" -p "${DRIVER_DB_PORT}" -U "${DRIVER_DB_USER}" -d "${DRIVER_DB_NAME}" -f /app/seed.sql
  env:
  - name: DRIVER_DB_HOST
    valueFrom:
      configMapKeyRef:
        name: fuel-system-config
        key: DRIVER_DB_HOST
  # ... más variables
```

#### 4. Routes Service (TypeORM)

```yaml
initContainers:
- name: typeorm-migrate
  image: ghcr.io/.../routes-srv:latest
  command:
    - sh
    - -c
    - |
      # Wait for DB
      for i in $(seq 1 30); do
        if PGPASSWORD="${ROUTES_DB_PASS}" psql -h "${ROUTES_DB_HOST}" -p "${ROUTES_DB_PORT}" -U "${ROUTES_DB_USER}" -d "${ROUTES_DB_NAME}" -c '\q' 2>/dev/null; then
          break
        fi
        sleep 2
      done
      
      # Execute init.sql (includes seeding)
      PGPASSWORD="${ROUTES_DB_PASS}" psql -h "${ROUTES_DB_HOST}" -p "${ROUTES_DB_PORT}" -U "${ROUTES_DB_USER}" -d "${ROUTES_DB_NAME}" -v ON_ERROR_STOP=1 -f /app/db/init.sql
      
      echo "✅ Routes database initialized and seeded!"
  env:
  - name: ROUTES_DB_HOST
    valueFrom:
      configMapKeyRef:
        name: fuel-system-config
        key: ROUTES_DB_HOST
  # ... más variables
```

### 🔧 Despliegue Automático

**Al instalar el chart:**

```bash
# Los init containers se ejecutan automáticamente
helm install fuel-system deploy/helm/fuel-system \
  --namespace fuel-system \
  --values deploy/local/values-local.yaml
```

**Al actualizar el chart:**

```bash
# Los init containers se ejecutan automáticamente antes de actualizar
helm upgrade fuel-system deploy/helm/fuel-system \
  --namespace fuel-system \
  --values deploy/local/values-local.yaml
```

**Flujo de despliegue:**
```
1. Helm crea/actualiza Deployment
2. Kubernetes crea nuevo pod
3. Init container ejecuta (migración + seed)
   ├─ ✅ Success → Pod inicia normalmente
   └─ ❌ Error → Pod queda en Init:Error
4. Contenedor principal inicia (si init fue exitoso)
```

### 📊 Verificar Estado de Init Containers

```bash
# Ver estado de todos los pods
kubectl get pods -n fuel-system

# Ver logs del init container específico
kubectl logs -n fuel-system <pod-name> -c prisma-migrate
kubectl logs -n fuel-system <pod-name> -c typeorm-migrate

# Ver logs del init container de un deployment específico
kubectl logs -n fuel-system -l app.kubernetes.io/component=users-service -c prisma-migrate
kubectl logs -n fuel-system -l app.kubernetes.io/component=driver-service -c typeorm-migrate
kubectl logs -n fuel-system -l app.kubernetes.io/component=routes-service -c typeorm-migrate

# Ver eventos del pod (incluye información de init containers)
kubectl describe pod -n fuel-system <pod-name>
```

### 🗑️ Reiniciar Init Containers

Si necesitas volver a ejecutar las migraciones/seeding:

```bash
# Reiniciar un deployment específico (fuerza recreación de pods con init containers)
kubectl rollout restart deployment/fuel-system-users-service -n fuel-system
kubectl rollout restart deployment/fuel-system-vehicles-service -n fuel-system
kubectl rollout restart deployment/fuel-system-driver-service -n fuel-system
kubectl rollout restart deployment/fuel-system-routes-service -n fuel-system

# Reiniciar todos los microservicios
kubectl rollout restart deployment -n fuel-system -l app.kubernetes.io/instance=fuel-system
```

## 🐛 Troubleshooting

### ❌ Init Container falla: "Database not empty"

**Para servicios con Prisma:**

Ver [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md#-init-container-falla-error-p3005-database-not-empty) para soluciones detalladas.

### ❌ Init Container en "Init:CrashLoopBackOff"

**Diagnóstico:**
```bash
# Ver logs
kubectl logs -n fuel-system <pod-name> -c prisma-migrate
kubectl logs -n fuel-system <pod-name> -c typeorm-migrate

# Ver eventos
kubectl describe pod -n fuel-system <pod-name>
```

**Causas comunes:**
1. Base de datos no está lista
2. Credenciales incorrectas
3. Archivos SQL no copiados al contenedor

### ❌ Init Container tarda demasiado

**Solución:** Los init containers tienen timeouts de 30 reintentos de 2 segundos cada uno (60 segundos total) para esperar que la base de datos esté lista. Si sigue fallando, verificar:

```bash
# Verificar que la BD esté corriendo
kubectl get pods -n fuel-system -l app.kubernetes.io/name=postgresql

# Verificar conectividad desde el pod
kubectl exec -it -n fuel-system <pod-name> -c typeorm-migrate -- sh
# (Dentro del container)
psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME
```

## 📝 Resumen

### ✅ Método Actual: Init Containers

| Servicio | ORM | Init Container | Archivos de Seed |
|----------|-----|----------------|------------------|
| **users-srv** | Prisma | `npx prisma db push && seed` | `prisma/seed.ts` |
| **vehicles-svc** | Prisma | `npx prisma migrate deploy && seed` | `prisma/seed.ts` |
| **driver-ms** | TypeORM | `psql init.sql + migrations + seed.sql` | `init.sql`, `seed.sql` |
| **routes-srv** | TypeORM | `psql db/init.sql` (incluye seeding) | `db/init.sql` |
| **auth-svc** | TypeORM | `wait-for-db` (no seed necesario) | N/A |

### 🚫 NO usamos Kubernetes Jobs

Los Kubernetes Jobs fueron **descartados** en favor de Init Containers porque:
- ❌ Requieren gestión manual del ciclo de vida
- ❌ No garantizan orden con respecto a los Deployments
- ❌ Complican el rollback
- ❌ No son fail-fast por defecto

Los Init Containers son superiores porque se integran directamente con el ciclo de vida del pod y garantizan que las migraciones se ejecuten antes de que la aplicación inicie.

---

## 🔗 Referencias

- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) - Guía completa de migraciones
- [INIT_CONTAINERS_SETUP.md](./INIT_CONTAINERS_SETUP.md) - Detalles de implementación
- [Kubernetes Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
