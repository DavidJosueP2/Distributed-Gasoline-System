# 🔄 Guía de Migraciones - Driver Service

## ✅ Estado Actual

- ✅ **`init.sql`** contiene el esquema correcto y actualizado
- ✅ **Entidades TypeORM** están alineadas con `init.sql`
- ✅ **Migraciones TypeORM** disponibles y funcionando
- ✅ **Scripts npm** para inicializar la BD fácilmente
- ✅ **Variables de entorno** unificadas entre `.env` raíz y servicio
- ⚠️ Las migraciones SQL en `migrations/*.sql` son solo para bases de datos legacy

---

## 🎯 Comandos Disponibles

### Comandos de Base de Datos

| Comando | Descripción |
|---------|-------------|
| `npm run db:init` | Ejecutar `init.sql` (crear esquema vacío) |
| `npm run db:init:seed` | Ejecutar `init.sql` + `seed.sql` (con datos) |
| `npm run db:reset` | `init.sql` + migraciones TypeORM pendientes |
| `npm run db:reset:seed` | `init.sql` + `seed.sql` + migraciones TypeORM |

**Características:**
- Leen automáticamente el `.env` de la raíz y del servicio
- Compatibles con Windows (PowerShell) y Linux/Mac (Bash)
- Detectan y usan las variables correctas automáticamente

### Comandos TypeORM

| Comando | Descripción |
|---------|-------------|
| `npm run typeorm:show` | Ver estado de todas las migraciones |
| `npm run typeorm:migrate` | Ejecutar migraciones pendientes |
| `npm run typeorm:revert` | Revertir última migración |
| `npm run typeorm:generate -- <path>` | Generar migración desde entidades |
| `npm run typeorm:create -- <path>` | Crear migración vacía |

---

## 🚀 Escenarios de Uso

### Escenario 1: Iniciar Base de Datos desde Cero (RECOMENDADO)

```bash
cd services/driver-ms

# Opción 1: Solo crear el esquema (tablas vacías)
npm run db:init

# Opción 2: Crear esquema + datos de prueba (seed)
npm run db:init:seed

# Opción 3: Reset completo (init + migraciones TypeORM)
npm run db:reset

# Opción 4: Reset completo con datos de prueba
npm run db:reset:seed
```

**¿Qué hace cada comando?**
- `db:init` → Ejecuta `init.sql` (crea todas las tablas)
- `db:init:seed` → Ejecuta `init.sql` + `seed.sql` (agrega datos de prueba)
- `db:reset` → Ejecuta `init.sql` + migraciones TypeORM pendientes
- `db:reset:seed` → Ejecuta `init.sql` + `seed.sql` + migraciones TypeORM

---

### Escenario 2: Ejecutar Migraciones TypeORM Manualmente

Si ya tienes la base de datos y quieres aplicar migraciones TypeORM:

```bash
cd services/driver-ms

# Ver estado de migraciones (cuáles están aplicadas, cuáles faltan)
npm run typeorm:show

# Ejecutar migraciones pendientes
npm run typeorm:migrate

# Revertir última migración ejecutada
npm run typeorm:revert
```

---

### Escenario 3: Auto-Ejecutar Migraciones al Iniciar la App

Para desarrollo local, puedes hacer que las migraciones se ejecuten automáticamente:

```bash
# En tu archivo .env o .env.development
DRIVER_DB_RUN_MIGRATIONS=true
```

**⚠️ IMPORTANTE:** 
- Solo usar en desarrollo local
- **NUNCA** habilitar esto en producción
- Puede causar problemas si múltiples instancias inician simultáneamente

---

### Escenario 4: Crear Nueva Migración TypeORM

Cuando modificas las entidades y necesitas generar una migración:

```bash
# Generar migración automáticamente desde cambios en entidades
npm run typeorm:generate -- src/migrations/NombreDescriptivo

# O crear una migración vacía manualmente
npm run typeorm:create -- src/migrations/NombreDescriptivo
```

Ejemplo:
```bash
npm run typeorm:generate -- src/migrations/AddDriverRatingColumn
```

---

## 🔍 Verificar Alineación Esquema vs Entidades

Para verificar que tu base de datos está sincronizada con las entidades:

```bash
# 1. Ver migraciones pendientes
npm run typeorm:show

# 2. Si hay migraciones pendientes
npm run typeorm:migrate

# 3. Si NO hay migraciones pero hay diferencias, generar nueva migración
npm run typeorm:generate -- src/migrations/SyncSchema
```

---

## 🚨 Troubleshooting

### Problema: "No se encontró ninguna relación" después de ejecutar migraciones

**Causa:** Ejecutaste `npm run typeorm:migrate` en una base de datos **vacía**. Las migraciones TypeORM están diseñadas para **modificar** esquemas existentes, NO para crearlos desde cero.

**✅ Solución:** Ejecuta primero `init.sql`:

```bash
# Ejecuta primero init.sql
npm run db:init

# Luego las migraciones TypeORM (si las necesitas)
npm run typeorm:migrate
```

### Problema: "No pending migrations" pero las tablas no existen

**✅ Solución:** Ejecuta `npm run db:init` para crear el esquema base con `init.sql`.

### Problema: Migraciones TypeORM no se ejecutan automáticamente

Verifica:
1. ¿Tienes `DRIVER_DB_RUN_MIGRATIONS=true` en tu `.env`?
2. ¿La variable de entorno se está cargando correctamente?

```bash
# En PowerShell, ver variables de entorno
Get-Content .env | Select-String DRIVER_DB_RUN_MIGRATIONS
```

### Problema: Error "relation already exists"

**✅ Solución:** La tabla ya existe. Si usaste `init.sql`, las migraciones TypeORM detectarán esto y no intentarán recrearla.

### Problema: Scripts PowerShell no se ejecutan

**✅ Solución:** Habilita la ejecución de scripts en PowerShell:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

O ejecuta directamente el script:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-db.ps1
```

---

## 🔧 Cambios Realizados en el Proyecto

### 1. ✅ Corregido `data-source.ts` - Variables de entorno unificadas

**Archivo:** `src/data-source.ts`

Ahora usa las mismas variables que `typeorm.config.ts` con fallbacks apropiados:
- Prioriza `DRIVER_DB_*` (específicas del servicio)
- Fallback a `POSTGRES_*` (genéricas para Docker)
- Valores por defecto razonables

**Antes:**
```typescript
const host = process.env.POSTGRES_HOST || 'localhost';       // ❌ Variable genérica
const username = process.env.POSTGRES_USER || 'postgres';    // ❌ Variable genérica
const password = process.env.POSTGRES_PASSWORD || 'root';    // ❌ Variable genérica
const database = process.env.DRIVER_DB || 'driver';          // ❌ Inconsistente
```

**Ahora:**
```typescript
// Prioridad: Variables específicas (DRIVER_DB_*) > Variables genéricas (POSTGRES_*)
const host = process.env.DRIVER_DB_HOST || process.env.POSTGRES_HOST || 'localhost';
const username = process.env.DRIVER_DB_USER || process.env.POSTGRES_USER || 'postgres';
const password = process.env.DRIVER_DB_PASS || process.env.POSTGRES_PASSWORD || 'root';
const database = process.env.DRIVER_DB_NAME || process.env.DRIVER_DB || 'driver';
```

### 2. ✅ Habilitado soporte para `DRIVER_DB_RUN_MIGRATIONS`

**Archivo:** `src/config/typeorm.config.ts`

```typescript
// Antes
migrationsRun: false, // ❌ Siempre deshabilitado

// Ahora
migrationsRun: migrationsRun, // ✅ Respeta DRIVER_DB_RUN_MIGRATIONS
```

### 3. ✅ Creados scripts para inicializar la BD

**Archivos nuevos:**
- `scripts/init-db.ps1` - Para Windows (PowerShell)
- `scripts/init-db.sh` - Para Linux/Mac (Bash)

---

## 🎓 Flujo de Trabajo Completo (Ejemplo)

```bash
# 1. Clonar el proyecto
git clone <repo>
cd services/driver-ms

# 2. Instalar dependencias
npm install

# 3. Configurar .env (o usar el de la raíz)
cp .env.example .env  # Si existe

# 4. Inicializar base de datos con datos de prueba
npm run db:reset:seed

# 5. Verificar que todo esté OK
npm run typeorm:show

# 6. Iniciar el servicio
npm run start:dev
```

### Después de cambios en entidades:

```bash
# 1. Modificar entities
# 2. Generar migración
npm run typeorm:generate -- src/migrations/DescripcionCambio

# 3. Revisar la migración generada
# 4. Aplicarla
npm run typeorm:migrate
```

### Reset completo:

```bash
# En psql: DROP DATABASE drivers; CREATE DATABASE drivers;
npm run db:reset:seed
npm run start:dev
```

---

## ✨ Recomendaciones

1. **Para desarrollo:** Usa `npm run db:reset:seed` para tener BD limpia con datos de prueba
2. **Para cambios:** Modifica entidades → `npm run typeorm:generate` → revisa migración → `npm run typeorm:migrate`
3. **Para producción:** Ejecuta migraciones en CI/CD antes de desplegar, nunca con auto-run
4. **Para testing:** Usa `npm run db:reset` en cada setup para tener esquema limpio

---

## 📚 Más Información

- Ver [migrations/README.md](./migrations/README.md) para detalles sobre migraciones SQL legacy
- Ver [src/config/typeorm.config.ts](./src/config/typeorm.config.ts) para configuración de TypeORM
- Ver [src/data-source.ts](./src/data-source.ts) para configuración del DataSource usado por CLI

---

💡 **Tip:** Los scripts `db:init` y `db:reset` cargan automáticamente las variables del `.env` de la raíz y del servicio, priorizando las específicas del servicio. ¡No necesitas configurar nada más!

