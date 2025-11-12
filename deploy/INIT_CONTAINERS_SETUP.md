# Configuración de Init Containers para Bases de Datos

## Resumen de Cambios

Este documento describe los cambios realizados para implementar la inicialización de bases de datos mediante **Init Containers** en Kubernetes para los microservicios del sistema de combustible.

## Fecha
2025-11-12

---

## 1. Driver Service (TypeORM con SQL manual)

### Problema Original
- El initContainer ejecutaba `init.sql` con rutas relativas (`./init.sql`)
- Los archivos SQL no se encontraban porque el initContainer usaba rutas incorrectas
- Las migraciones SQL no eran idempotentes, causando errores al re-ejecutarse

### Solución Implementada

#### A. Actualizaciones en `microservices.yaml`
**Archivo:** `deploy/helm/fuel-system/templates/microservices.yaml`

- ✅ Agregado health check de base de datos con retry (30 intentos, 2s cada uno)
- ✅ Rutas absolutas para archivos SQL: `/app/init.sql`, `/app/migrations/*.sql`, `/app/seed.sql`
- ✅ Flag `ON_ERROR_STOP=1` en psql para fallar rápido en errores críticos
- ✅ Validación de existencia de archivos antes de ejecutar
- ✅ Manejo de errores en migraciones (continúa si ya están aplicadas)

#### B. Migraciones SQL Idempotentes
**Archivos modificados:**
1. `services/driver-ms/migrations/20250930_fix_license_includes.sql`
2. `services/driver-ms/migrations/20251028_remove_full_name_column.sql`

**Cambios:**
- ✅ Verificación de existencia de tablas antes de modificarlas
- ✅ Uso de `DO $$ ... END $$` para lógica condicional
- ✅ Verificación de columnas en `information_schema` antes de DROP/ALTER
- ✅ Mensajes informativos con `RAISE NOTICE`
- ✅ Manejo seguro de constraints y vistas

#### C. Simplificación del Entrypoint
**Archivo:** `services/driver-ms/docker-entrypoint.sh`

**Antes:**
```bash
# Ejecutaba seed en background con sleep 10
(sleep 10 && psql seed.sql) &
exec node dist/main.js
```

**Después:**
```bash
# El seed ya se ejecuta en el initContainer
echo "🚀 Starting Driver Service..."
exec node dist/main.js
```

#### D. Dockerfile (Verificado - OK)
**Archivo:** `services/driver-ms/Dockerfile`

✅ Los archivos SQL están correctamente copiados al stage final:
```dockerfile
COPY --from=build /app/init.sql ./init.sql
COPY --from=build /app/seed.sql ./seed.sql
COPY --from=build /app/migrations ./migrations
```

---

## 2. Auth Service (TypeORM con synchronize:true)

### Problema Original
- Auth Service no estaba en `microservices.yaml` (tiene su propio archivo)
- No tenía initContainer para esperar a que la base de datos esté disponible
- Intentaba conectarse antes de que PostgreSQL estuviera listo

### Solución Implementada

#### A. Agregado Init Container en `auth-service.yaml`
**Archivo:** `deploy/helm/fuel-system/templates/auth-service.yaml`

- ✅ Init Container `wait-for-db` con imagen `postgres:15-alpine`
- ✅ Health check de base de datos (30 intentos, 2s cada uno)
- ✅ Usa las mismas variables de entorno que el contenedor principal
- ✅ Falla con exit code 1 si la DB no está disponible después de 60s

**Nota importante:** Auth Service NO necesita archivos SQL manuales porque usa:
```typescript
TypeOrmModule.forRoot({
  synchronize: true,  // Crea tablas automáticamente
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
})
```

---

## 3. Otros Servicios

### Users Service y Vehicles Service (Prisma ORM)
✅ **Ya funcionan correctamente** con sus initContainers de Prisma:
- `npx prisma db push` (users-service)
- `npx prisma migrate deploy` (vehicles-service)
- `node dist/prisma/seed.js` (ambos)

### Email, Logger, Publisher Services
✅ **No necesitan bases de datos**, por lo tanto no requieren initContainers

---

## 4. Estructura Final de InitContainers

### Driver Service (TypeORM manual)
```yaml
initContainers:
- name: typeorm-migrate
  image: driver-ms:latest
  command: [sh, -c, "
    # 1. Wait for DB
    # 2. Execute /app/init.sql
    # 3. Execute /app/migrations/*.sql
    # 4. Execute /app/seed.sql
  "]
```

### Auth Service (TypeORM auto)
```yaml
initContainers:
- name: wait-for-db
  image: postgres:15-alpine
  command: [sh, -c, "
    # Wait for DB to be ready
    # TypeORM synchronize:true creates tables automatically
  "]
```

### Users/Vehicles Services (Prisma)
```yaml
initContainers:
- name: prisma-migrate
  image: service:latest
  command: [sh, -c, "
    npx prisma [db push|migrate deploy]
    node dist/prisma/seed.js
  "]
```

---

## 5. Variables de Entorno Críticas

### Driver Service
```yaml
DRIVER_DB_HOST: driver-db-postgresql
DRIVER_DB_PORT: 5432
DRIVER_DB_USER: postgres
DRIVER_DB_PASS: root
DRIVER_DB_NAME: driver_db
DRIVER_DB_SYNCHRONIZE: "false"  # Usamos SQL manual
```

### Auth Service
```yaml
AUTH_DB_HOST: auth-db-postgresql
AUTH_DB_PORT: 5432
AUTH_DB_USER: postgres
AUTH_DB_PASS: root
AUTH_DB_NAME: auth_db
DB_SYNCHRONIZE: "false"  # Cambiar a true solo en dev
```

---

## 6. Orden de Despliegue Recomendado

1. **Infraestructura de Bases de Datos**
   ```bash
   helm install auth-db bitnami/postgresql -f auth-db-values.yaml
   helm install driver-db bitnami/postgresql -f driver-db-values.yaml
   helm install users-db bitnami/postgresql -f users-db-values.yaml
   helm install vehicles-db bitnami/postgresql -f vehicles-db-values.yaml
   ```

2. **Servicios de Infraestructura**
   ```bash
   helm install rabbitmq bitnami/rabbitmq
   helm install elasticsearch elastic/elasticsearch
   ```

3. **Eureka Server**
   ```bash
   kubectl apply -f eureka-deployment.yaml
   ```

4. **Microservicios**
   ```bash
   helm install fuel-system ./helm/fuel-system -f values-local.yaml
   ```

---

## 7. Verificación

### Verificar InitContainers
```bash
# Ver logs del initContainer de driver-service
kubectl logs -f deployment/fuel-system-driver-service -c typeorm-migrate

# Ver logs del initContainer de auth-service
kubectl logs -f deployment/fuel-system-auth-service -c wait-for-db
```

### Verificar Estado de Pods
```bash
kubectl get pods -l app.kubernetes.io/instance=fuel-system
```

### Verificar Bases de Datos
```bash
# Driver DB
kubectl exec -it driver-db-postgresql-0 -- psql -U postgres -d driver_db -c "\dt"

# Auth DB
kubectl exec -it auth-db-postgresql-0 -- psql -U postgres -d auth_db -c "\dt"
```

---

## 8. Troubleshooting

### Init Container falla con "file not found"
**Causa:** Los archivos SQL no están en la imagen Docker
**Solución:** Verificar el Dockerfile que copie los archivos en el stage final:
```dockerfile
COPY --from=build /app/init.sql ./init.sql
COPY --from=build /app/seed.sql ./seed.sql
COPY --from=build /app/migrations ./migrations
```

### Init Container falla con "database does not exist"
**Causa:** La base de datos no existe en PostgreSQL
**Solución:** Crear la base de datos manualmente o en el values.yaml:
```yaml
postgresql:
  auth:
    database: driver_db
```

### Migraciones fallan con "relation does not exist"
**Causa:** Las migraciones intentan modificar tablas que no existen
**Solución:** Ejecutar `init.sql` primero, luego las migraciones (ya implementado)

### TypeORM synchronize no crea tablas
**Causa:** synchronize está en false
**Solución:** Cambiar a `true` en desarrollo o usar migraciones en producción

---

## 9. Próximos Pasos

1. ✅ **Completado:** Init containers para driver-service y auth-service
2. 🔄 **Pendiente:** Crear archivos SQL para auth-service si se desea no usar synchronize
3. 🔄 **Pendiente:** Agregar versionado de migraciones (tabla `schema_migrations`)
4. 🔄 **Pendiente:** Implementar rollback de migraciones
5. 🔄 **Pendiente:** Agregar health checks a los pods principales

---

## Referencias

- Documentación original: `/deploy/MIGRATIONS_GUIDE.md`
- Estrategia de seeding: `/deploy/SEEDING_STRATEGY.md`
- Configuración de Helm: `/deploy/helm/fuel-system/values-local.yaml`

