# 🚀 Inicio Rápido - Base de Datos Driver Service

## ⚡ TL;DR - Un Solo Comando

```bash
npm run db:reset:seed
```

Este comando:
- ✅ Ejecuta `init.sql` (crea todas las tablas)
- ✅ Ejecuta `seed.sql` (agrega datos de prueba)
- ✅ Ejecuta migraciones TypeORM pendientes
- ✅ Lee automáticamente el `.env` correcto (raíz o servicio)

---

## 📚 Más Documentación

- [**MIGRATIONS.md**](./MIGRATIONS.md) - Guía completa de migraciones y troubleshooting
- [**migrations/README.md**](./migrations/README.md) - Info sobre migraciones SQL legacy

---

## 🎯 Comandos más Usados

```bash
# Inicializar BD con datos de prueba (más común)
npm run db:reset:seed

# Inicializar BD vacía
npm run db:reset

# Ver estado de migraciones TypeORM
npm run typeorm:show

# Aplicar migraciones TypeORM
npm run typeorm:migrate

# Iniciar el servicio
npm run start:dev
```

---

## 🔧 Variables de Entorno

El servicio usa estas variables (en orden de prioridad):

1. **`.env` del servicio** (services/driver-ms/.env) - Prioridad alta
2. **`.env` de la raíz** (back/.env) - Fallback
3. **Valores por defecto** - Si no están definidas

### Variables Principales:

```env
# En back/.env (para Docker y desarrollo local)
DRIVER_DB_HOST=localhost
DRIVER_DB_PORT=5432
DRIVER_DB_USER=postgres
DRIVER_DB_PASS=root
DRIVER_DB_NAME=drivers
```

**✅ Ventaja:** Funciona automáticamente para:
- Tus compañeros (Docker - usa `.env` de la raíz)
- Ti (local - puedes sobrescribir en `.env` del servicio)

---

## 🆘 Solución a Problemas Comunes

### Problema: "No se encontró ninguna relación" después de migraciones

```bash
# Solución: Ejecutar init.sql primero
npm run db:init
```

### Problema: Quiero empezar desde cero

```bash
# En psql
DROP DATABASE drivers;
CREATE DATABASE drivers;

# Luego
npm run db:reset:seed
```

### Problema: Scripts PowerShell no funcionan

```powershell
# Habilitar ejecución de scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📊 ¿Qué hace cada comando?

| Comando | init.sql | seed.sql | Migraciones TypeORM |
|---------|----------|----------|---------------------|
| `db:init` | ✅ | ❌ | ❌ |
| `db:init:seed` | ✅ | ✅ | ❌ |
| `db:reset` | ✅ | ❌ | ✅ |
| `db:reset:seed` | ✅ | ✅ | ✅ |
| `typeorm:migrate` | ❌ | ❌ | ✅ |

---

## 🎓 Flujo Típico

### Primera vez:
```bash
npm install
npm run db:reset:seed
npm run start:dev
```

### Después de cambios en entidades:
```bash
npm run typeorm:generate -- src/migrations/DescripcionCambio
npm run typeorm:migrate
npm run start:dev
```

### Reset completo:
```bash
# En psql: DROP DATABASE drivers; CREATE DATABASE drivers;
npm run db:reset:seed
npm run start:dev
```

---

💡 **Tip:** Los comandos `db:*` son inteligentes - detectan automáticamente tu configuración del `.env` sin necesidad de parámetros adicionales.

