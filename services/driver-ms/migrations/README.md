# Database Migrations - Driver Service

Este directorio contiene las migraciones SQL para el servicio de drivers.

## Migraciones Disponibles

1. **20250930_fix_license_includes.sql**: Corrige duplicados e índices en la tabla `license_includes`
2. **20251028_remove_full_name_column.sql**: Elimina la columna `full_name` y objetos dependientes

## Cómo Ejecutar las Migraciones

### Opción 1: Manualmente con psql

```bash
# Conectarse a la base de datos
psql -h localhost -U postgres -d driver_db

# Ejecutar cada migración en orden
\i services/driver-ms/migrations/20250930_fix_license_includes.sql
\i services/driver-ms/migrations/20251028_remove_full_name_column.sql
```

### Opción 2: Con el script de migración

```bash
cd services/driver-ms
npm run migration:run
```

### Opción 3: Si la base de datos está vacía

Si estás iniciando desde cero, simplemente ejecuta `init.sql` que ya tiene el esquema correcto:

```bash
psql -h localhost -U postgres -d driver_db -f services/driver-ms/init.sql
```

## Resetear la Base de Datos (Desarrollo)

Si necesitas empezar de cero:

```bash
# Eliminar la base de datos
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS driver_db;"
psql -h localhost -U postgres -c "CREATE DATABASE driver_db;"

# Ejecutar init.sql
psql -h localhost -U postgres -d driver_db -f services/driver-ms/init.sql
```

## Notas Importantes

- **NUNCA uses `synchronize: true` en producción** - Las migraciones deben ejecutarse manualmente
- Las migraciones se ejecutan en orden por fecha
- Siempre haz backup antes de ejecutar migraciones en producción
- La columna `full_name` fue eliminada porque la información del usuario se maneja en el servicio de usuarios

