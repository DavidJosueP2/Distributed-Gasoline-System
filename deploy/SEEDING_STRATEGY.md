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

**Comando de ejecución:**
```bash
# Dentro del contenedor
npx prisma db push --accept-data-loss --skip-generate && npx prisma db seed
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

**Comando de ejecución:**
```bash
# Dentro del contenedor
npx prisma migrate deploy && npx prisma db seed
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

**Comando de ejecución:**
```bash
# Ejecutado automáticamente por docker-entrypoint.sh
# Espera 10s después del inicio para que TypeORM cree las tablas
PGPASSWORD="${DRIVER_DB_PASS}" psql \
  -h "${DRIVER_DB_HOST}" \
  -U "${DRIVER_DB_USER}" \
  -d "${DRIVER_DB_NAME}" \
  -f seed.sql
```

**Características:**
- 🔄 Idempotente (usa `ON CONFLICT DO NOTHING`)
- 🔗 Depende de que exista `user_id=1` en `users-srv`
- 🚀 Se ejecuta en background sin bloquear el inicio

---

### 4. `auth-svc` (TypeORM)

**⚠️ No requiere seeding**

Este servicio solo maneja la lógica de autenticación. Los usuarios y roles están en `users-srv`.

---

## 🐳 Docker Compose - Comandos

### Servicios Prisma

```yaml
# users-srv
command: sh -c "npx prisma db push --accept-data-loss --skip-generate && npx prisma db seed && node dist/src/main.js"

# vehicles-svc
command: sh -c "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"
```

### Servicios TypeORM

```yaml
# driver-ms
CMD ["./docker-entrypoint.sh"]  # Script personalizado que ejecuta seed.sql
```

---

## ☁️ Kubernetes/Azure - Implementación

### Servicios Prisma

```yaml
# initContainer para migraciones
initContainers:
- name: prisma-migrate
  image: <service-image>
  command: ["npx", "prisma", "migrate", "deploy"]
  
# initContainer para seeding (opcional, solo en dev/staging)
- name: prisma-seed
  image: <service-image>
  command: ["npx", "prisma", "db", "seed"]
  env:
  - name: NODE_ENV
    value: "development"  # Solo en dev/staging
```

### Servicios TypeORM

```yaml
# Las migraciones se ejecutan automáticamente al iniciar
# El seeding puede ejecutarse como un Job separado:
apiVersion: batch/v1
kind: Job
metadata:
  name: driver-ms-seed
spec:
  template:
    spec:
      containers:
      - name: seed
        image: <driver-ms-image>
        command:
        - sh
        - -c
        - |
          PGPASSWORD="${DRIVER_DB_PASS}" psql \
            -h "${DRIVER_DB_HOST}" \
            -U "${DRIVER_DB_USER}" \
            -d "${DRIVER_DB_NAME}" \
            -f seed.sql
      restartPolicy: OnFailure
```

---

## ✅ Verificación de Seeds

### 1. Verificar Usuarios (users-srv)

```bash
# Conectarse a la DB
docker exec -it fuel-users-db psql -U postgres -d users

# Verificar datos
SELECT username, first_name, last_name FROM users;
SELECT name, description FROM roles;
SELECT u.username, r.name as role
FROM users u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id;
```

### 2. Verificar Vehículos (vehicles-svc)

```bash
# Conectarse a la DB
docker exec -it fuel-vehicles-db psql -U postgres -d vehicles

# Verificar datos
SELECT COUNT(*) FROM "VehicleModel";  -- Debe ser 20
SELECT COUNT(*) FROM "VehicleUnit";   -- Debe ser 20
SELECT brand, family, trim FROM "VehicleModel" LIMIT 5;
```

### 3. Verificar Drivers (driver-ms)

```bash
# Conectarse a la DB
docker exec -it fuel-driver-db psql -U postgres -d drivers

# Verificar datos
SELECT * FROM drivers;
SELECT * FROM vehicles;
SELECT * FROM driver_documents;
```

---

## 🔧 Troubleshooting

### Problema: Seed no se ejecuta

**Solución:**
```bash
# Forzar reconstrucción de imágenes
docker-compose build --no-cache <service-name>

# Reiniciar servicio
docker-compose up -d <service-name>

# Ver logs
docker-compose logs -f <service-name>
```

### Problema: Error "duplicate key value"

**Causa:** El seed no es idempotente.

**Solución:**
- Prisma: Verificar que usa `upsert` en lugar de `create`
- TypeORM/SQL: Verificar que usa `ON CONFLICT DO NOTHING` o `ON CONFLICT (column) DO UPDATE`

### Problema: driver-ms no encuentra user_id=1

**Causa:** `users-srv` no ha ejecutado su seed o el usuario fue eliminado.

**Solución:**
```bash
# Ejecutar seed de users-srv primero
docker-compose restart users-srv

# Esperar a que termine, luego reiniciar driver-ms
docker-compose restart driver-ms
```

---

## 📝 Best Practices

1. **✅ Siempre haz los seeds idempotentes**
   - Prisma: Usa `upsert`
   - SQL: Usa `ON CONFLICT DO NOTHING`

2. **✅ Versiona los datos de seed**
   - Si cambias un seed, documenta por qué

3. **✅ No uses seeds en producción para datos reales**
   - Solo para configuración mínima (roles, permisos)

4. **✅ Documenta las dependencias entre seeds**
   - Ejemplo: driver-ms depende de users-srv

5. **✅ Incluye datos de prueba útiles**
   - Usuarios con diferentes roles
   - Variedad de vehículos
   - Casos edge para testing

---

## 🚀 Comandos Rápidos

```bash
# Reconstruir todos los servicios con seeds
docker-compose down -v  # Elimina volúmenes (⚠️ borra datos)
docker-compose build --no-cache
docker-compose up -d

# Ejecutar seed manualmente para un servicio Prisma
docker-compose exec users-srv npx prisma db seed

# Ver logs de seeding
docker-compose logs users-srv | grep "🌱"
docker-compose logs vehicles-svc | grep "🌱"
docker-compose logs driver-ms | grep "🌱"
```

---

## 📚 Referencias

- [Prisma Seeding Guide](https://www.prisma.io/docs/guides/database/seed-database)
- [TypeORM Migrations](https://typeorm.io/migrations)
- [PostgreSQL INSERT ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)

