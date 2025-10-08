# driver-ms (Driver Microservice)

A comprehensive NestJS microservice for managing drivers, license types, and driver licenses in a distributed gasoline delivery system. The service uses TypeORM with PostgreSQL and follows a migration-first approach with dual transport support (HTTP REST + gRPC).


## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Installation & Setup](#installation--setup)
- [Database Management](#database-management)
- [Running the Service](#running-the-service)
- [API Documentation](#api-documentation)
- [Service Discovery](#service-discovery)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## What I changed / implemented

- Config and tooling
  - Added `.prettierrc` and `.gitattributes` to enforce LF line endings and avoid the ESLint/Prettier CRLF warnings on Windows.
  - Added `class-transformer` and `class-validator` usage in environment validation.

- Database and migrations
  - Created `src/data-source.ts` exporting a named `AppDataSource` DataSource for TypeORM CLI and migrations.
  - Added migration `src/migrations/20250930FixLicenseIncludes.ts` (and SQL backup variant) to deduplicate and correct the `license_includes` table schema (composite primary key) when present. The migration will now safely no-op if `license_includes` does not exist.
  - Set `DB_SYNCHRONIZE=false` in development env to avoid destructive auto-sync.

- Application code
  - Drivers + License Types + Driver Licenses módulos (HTTP + gRPC wrappers) con servicios TypeORM.
  - Endpoints críticos de MVP para licencias de conductores (crear, listar, suspender, listar activas).
  - `LicenseTypesService` reforzado (update seguro vía `Repository.update`, verificación de unicidad de `code`, y fallback para closure con CTE si falta la vista).
  - Validaciones de negocio en `DriverLicensesService` (ver sección Validations).

## Prerequisites

- Node.js (recommended 18+)
- npm
- PostgreSQL accessible with credentials set in your environment file

## Environment

Create a file named `.env.development` (or copy from `.env.example` if present) and set the following variables at minimum:

- DB_HOST
- DB_PORT
- DB_USERNAME
- DB_PASSWORD
- DB_DATABASE
- NODE_ENV=development
- DB_SYNCHRONIZE=false

Note: `DB_SYNCHRONIZE` must be false when using migrations in this repository. The repository includes a migration to fix `license_includes` duplicates; run it instead of enabling sync.

## Important files and locations

- `src/data-source.ts` — named DataSource export (`AppDataSource`) used by TypeORM CLI
- `src/migrations/*.ts` — TypeORM migrations (run with the CLI)
- `migrations/*.sql` — raw SQL migration/backups for manual application
- `src/drivers` — drivers module (controller, service, DTOs, entities)
- `src/license-types` — license types module (entities and service with inclusion logic)

## Common commands

- Install dependencies

```bash
npm install
```

- Build the project

```bash
npm run build
```

- Run migrations (uses the named data-source at `src/data-source.ts`)

```bash
npm run typeorm:migrate
# or directly
npx typeorm-ts-node-commonjs migration:run --dataSource src/data-source.ts
```

- Revert last migration

```bash
npx typeorm-ts-node-commonjs migration:revert --dataSource src/data-source.ts
```

- Start the service (development)

```bash
npm run start:dev
```

## Message patterns / Endpoints (microservice)

This service exposes microservice MessagePattern handlers (not HTTP REST endpoints). The controller names and message patterns are:

- `createDriver` — create a driver
- `findAllDrivers` — list drivers
- `findOneDriver` — find a driver by id
- `updateDriver` — update driver data
- `removeDriver` — remove a driver
- `drivers.canDrive` — check if a driver is eligible to drive a vehicle requiring a given license type

Payload examples

- Create driver

```json
{
  "user_id": 123,
  "availability": "AVAILABLE",   // enum: AVAILABLE | UNAVAILABLE
  "version": 1
}
```

- Update driver

```json
{
  "id": 1,
  "availability": "UNAVAILABLE"
}
```

Note: These are messages for internal microservice transport (e.g., NATS, TCP, Redis). If you need HTTP wrappers, add a controller to expose HTTP routes that forward to the same service methods.

### Check eligibility: `drivers.canDrive`

This message pattern accepts a payload with `driverId` and `licenseTypeId` and returns a boolean indicating whether the driver can legally drive for that license type.

Logic implemented:
- Loads the driver's VALID licenses (status = VALID)
- If the driver has the exact license type -> returns true
- Otherwise it fetches the license closure for the requested `licenseTypeId` (using `licenseTypes.getClosure`) and returns true if the driver holds any VALID license that is a parent (i.e., includes the requested license type via the closure relationship)

Example payload:

```json
{
  "driverId": 42,
  "licenseTypeId": 7
}
```

Example response:

```json
true
```

If the driver doesn't exist a `NotFoundException` will be thrown by the service.

## API endpoints (REST) — rutas disponibles

Además de los MessagePatterns y gRPC, este servicio expone wrappers HTTP (controladores REST) con las rutas principales para `drivers` y `license-types`. Estas rutas son útiles para pruebas manuales, debugging y para integrarlas en gateways HTTP.

Drivers
- POST /drivers
  - Qué hace: crea un nuevo driver
  - Body (JSON): CreateDriverDto
    - user_id: number (required)
    - availability?: string (enum: AVAILABLE, ON_ROUTE, LICENSE_EXPIRED, INACTIVE)
    - version?: number
  - Respuesta: 201 Created con el objeto Driver creado (JSON)
  - Errores: 400 Bad Request (validación), 500 Internal Server Error

- GET /drivers
  - Qué hace: lista todos los drivers
  - Query: (ninguna obligatoria)
  - Respuesta: 200 OK con array de drivers (JSON)

- GET /drivers/:id
  - Qué hace: devuelve un resumen del driver por id
  - Respuesta: 200 OK con:
    {
      "driver_id": number,
      "user_id": number,
      "availability": "AVAILABLE|ON_ROUTE|LICENSE_EXPIRED|INACTIVE",
      "license_ids": number[],
      "active_license_ids": number[]
    }
  - Nota: `license_ids` es historial; `active_license_ids` filtra por status VALID y fecha de expiración futura.

- PUT /drivers/:id
  - Qué hace: actualiza los datos de un driver
  - Params: id (path)
  - Body (JSON): UpdateDriverDto (ej. availability, version)
  - Respuesta: 200 OK con el driver actualizado o 404 Not Found

- DELETE /drivers/:id
  - Qué hace: elimina un driver
  - Respuesta: 204 No Content en éxito, 404 si no existe

- GET /drivers/:id/can-drive?licenseTypeId=<id>
  - Qué hace: chequea si el driver con `id` puede conducir un vehículo que requiere `licenseTypeId`
  - Params: id (path), licenseTypeId (query)
  - Respuesta: 200 OK con boolean (true/false)
  - Errores: 404 Not Found si driver no existe

License types
- POST /license-types
  - Qué hace: crea un nuevo tipo de licencia
  - Body (JSON): { code, description?, is_professional? }
  - Respuesta: 201 Created con el LicenseType creado

- GET /license-types
  - Qué hace: lista todos los tipos de licencia (incluye relaciones parent/child)
  - Respuesta: 200 OK con array de LicenseType

- GET /license-types/:id
  - Qué hace: devuelve un LicenseType por id (con includes y driver_licenses)
  - Respuesta: 200 OK o 404 Not Found

- GET /license-types/by-code?code=XXX
  - Qué hace: busca un LicenseType por código único
  - Respuesta: 200 OK con LicenseType o 404

- PUT /license-types/:id
  - Qué hace: actualiza un LicenseType
  - Body: campos permitidos (code, description, is_professional)
  - Respuesta: 200 OK con objeto actualizado

- DELETE /license-types/:id
  - Qué hace: elimina un LicenseType
  - Respuesta: 204 No Content o 404

- POST /license-types/:parentId/includes  (body: { childId })
  - Qué hace: agrega una inclusión (parent -> child)
  - Respuesta: 201 Created con el LicenseInclude creado

- DELETE /license-types/:parentId/includes/:childId
  - Qué hace: quita una inclusión entre tipos
  - Respuesta: 204 No Content o 404

- GET /license-types/:id/closure
  - Qué hace: devuelve la "closure" (lista de child_ids) para un tipo padre
  - Respuesta: 200 OK con { child_ids: [int, ...] }

Driver licenses (Driver → Licenses)
- POST /drivers/:driverId/licenses
  - Qué hace: asigna una licencia a un conductor
  - Body (JSON): { license_type_id: number, number: string, issued_at: YYYY-MM-DD, expires_at: YYYY-MM-DD }
  - Reglas: number único; un solo `license_type_id` por driver; `expires_at` > `issued_at`.
  - Respuesta: 201 Created con la licencia creada

- GET /drivers/:driverId/licenses
  - Qué hace: lista licencias del conductor (incluye `license_type`)
  - Respuesta: 200 OK con array ordenado por `expires_at` desc

- POST /drivers/:driverId/licenses/:licenseId/suspend
  - Qué hace: suspende una licencia del conductor (status → SUSPENDED)
  - Respuesta: 200 OK con la licencia actualizada

- GET /drivers/:driverId/licenses/active
  - Qué hace: lista licencias activas (status VALID y `expires_at` >= hoy)
  - Respuesta: 200 OK con array

Notas
- Si prefieres la ruta `GET /drivers/:driverId/active-licenses`, se puede agregar como alias sin romper compatibilidad.

Formato de respuesta
- Todos los endpoints REST retornan JSON en caso de éxito.
- Errores de validación retornan 400 con detalles de campo.

## gRPC methods (DriversService / LicenseTypesService / DriverLicensesService)

El servicio también expone las RPC definidas en `protos/driver_ms.proto`. Resumen rápido (nombres y mensajes):

DriversService
- Create(CreateDriverRequest) returns (Driver)
- FindAll(FindAllDriversRequest) returns (DriversList)
- FindOne(FindOneDriverRequest) returns (Driver)
- Update(UpdateDriverRequest) returns (Driver)
- Remove(RemoveDriverRequest) returns (RemoveDriverResponse)
- CanDrive(CanDriveRequest) returns (CanDriveResponse)

Mensajes relevantes (ejemplos)
- CreateDriverRequest
  - { user_id: 123, availability: AVAILABLE }

- FindOneDriverRequest
  - { id: 1 }

- CanDriveRequest
  - { driver_id: 42, license_type_id: 7 }

Respuesta de ejemplo (CanDrive):
```
{ "can_drive": true }
```

LicenseTypesService
- Create(CreateLicenseTypeRequest) returns (LicenseType)
- FindAll(FindAllLicenseTypesRequest) returns (LicenseTypeList)
- FindOne(FindOneLicenseTypeRequest) returns (LicenseType)
- FindByCode(FindByCodeRequest) returns (LicenseType)
- Update(UpdateLicenseTypeRequest) returns (LicenseType)
- Remove(RemoveLicenseTypeRequest) returns (RemoveLicenseTypeResponse)
- AddInclusion(AddInclusionRequest) returns (LicenseInclude)
- RemoveInclusion(RemoveInclusionRequest) returns (RemoveInclusionResponse)
- GetClosure(GetClosureRequest) returns (GetClosureResponse)

DriverLicensesService (nuevo)
- Create(CreateDriverLicenseRequest) returns (DriverLicense)
- FindByDriver(FindByDriverRequest) returns (DriverLicenseList)
- Suspend(SuspendLicenseRequest) returns (DriverLicense)
- FindActiveByDriver(FindByDriverRequest) returns (DriverLicenseList)

Notas
- Los nombres de campos en gRPC usan snake_case (ej. `driver_id`) según el proto. Asegúrate de enviar los campos exactamente como el proto lo define.
- Las rutas REST y los métodos gRPC comparten la misma lógica de negocio (los controladores REST delegan a los mismos servicios que usan los handlers gRPC / MessagePatterns).


## License includes migration / duplicate handling

Problem observed: when running migrations, PostgreSQL sometimes failed creating an index/PK on `license_includes` because duplicates existed on one of the columns. The repository now contains a migration that:

1. Checks whether `license_includes` exists; if not, the migration is a no-op.
2. If it exists, creates a backup table `license_includes_bkp` and copies rows.
3. Deletes exact duplicate (parent, child) pairs keeping one.
4. Drops interfering single-column indexes and creates non-unique indexes to match schema.
5. Adds a composite PK (parent_license_type_id, child_license_type_id) when missing.

If your DB still triggers duplicate-key errors when running this migration, do one of the following:

- Inspect duplicates manually:

```sql
SELECT parent_license_type_id, child_license_type_id, COUNT(*)
FROM license_includes
GROUP BY parent_license_type_id, child_license_type_id
HAVING COUNT(*) > 1;
```

- Move duplicates to a safe table (example):

```sql
CREATE TABLE license_includes_duplicates AS
SELECT *, ROW_NUMBER() OVER (PARTITION BY parent_license_type_id, child_license_type_id) AS rn
FROM license_includes;
DELETE FROM license_includes WHERE ctid IN (
  SELECT ctid FROM (
    SELECT ctid, ROW_NUMBER() OVER (PARTITION BY parent_license_type_id, child_license_type_id ORDER BY ctid) AS rn
    FROM license_includes
  ) t WHERE t.rn > 1
);
```

- If data can be discarded in dev, drop and recreate the database, then run migrations:

```bash
# (use psql or PGAdmin)
DROP DATABASE your_db;
CREATE DATABASE your_db;
npm run typeorm:migrate
```

## Permissions

- The DB user must have privileges to:
  - CREATE TABLE
  - DROP INDEX
  - CREATE INDEX
  - ALTER TABLE
  - INSERT/DELETE/SELECT/UPDATE on the target tables

If you run into permission errors while executing the migration, grant the user those privileges or run the migration as a superuser.

## Troubleshooting

- Migration fails with `no existe la relación "license_includes"`: This is handled now; migration checks and no-ops if table missing. Re-run migration after pulling latest changes.
- Migration fails with duplicate-key errors: inspect duplicates as shown above and dedupe manually or allow the migration to remove duplicates after backup.
- ESLint/Prettier CRLF warnings on Windows: run a one-time conversion to LF in your editor or run a git setting to check out with LF. `.gitattributes` was added to help with this.

## Summary

This repository is configured to be migration-first and safe for collaborative development. Key improvements:

- Enforced LF EOL via Prettier and .gitattributes
- DataSource + migration files to correct `license_includes` safely
- Drivers + Driver Licenses módulos (CRUD + reglas de negocio)
- Service-side guards para evitar duplicados (licencias y tipos), updates seguros y closure robusto

If you want, I can also:
- Add a dedicated CLI script to list/print duplicates before changing them
- Add HTTP endpoints that wrap the existing microservice message patterns for easier manual testing
- Provide a small SQL runbook to recover in case of accidental data loss

---
Last updated: 2025-10-01
