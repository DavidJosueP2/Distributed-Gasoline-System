# Migraciones SQL Legacy - Driver Service

Este directorio contiene migraciones SQL **solo para bases de datos legacy** que necesitan actualizarse.

## ⚠️ IMPORTANTE

**Si inicias desde cero, NO necesitas estas migraciones.** Usa `init.sql` que ya tiene el esquema correcto:

```bash
npm run db:reset:seed
```

Para más información sobre migraciones TypeORM y comandos, ver:
- [DB_QUICKSTART.md](../DB_QUICKSTART.md) - Inicio rápido
- [MIGRATIONS.md](../MIGRATIONS.md) - Guía completa de migraciones

---

## Migraciones Disponibles

1. **20250930_fix_license_includes.sql**: Corrige duplicados e índices en `license_includes`
2. **20251028_remove_full_name_column.sql**: Elimina columnas obsoletas (`full_name`, `email`, etc.)

Estas migraciones son **idempotentes** y pueden ejecutarse de forma segura, pero si tu base de datos ya está actualizada, no harán nada.

---

## Ejecutar Migraciones SQL Legacy

### Con psql directamente:

```bash
# Windows (PowerShell)
$env:PGPASSWORD="root"; psql -h localhost -p 5432 -U postgres -d drivers -f migrations/20250930_fix_license_includes.sql

# Linux/Mac
PGPASSWORD=root psql -h localhost -p 5432 -U postgres -d drivers -f migrations/20250930_fix_license_includes.sql
```

---

## Notas

- Estas migraciones son solo para bases de datos antiguas que no usaron `init.sql`
- Siempre haz backup antes de ejecutar migraciones en producción
- La columna `full_name` fue eliminada porque la información del usuario se maneja en el servicio de usuarios

