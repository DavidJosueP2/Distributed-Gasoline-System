# Distributed Gasoline System

Proyecto de microservicios para gestionar conductores, tipos de licencia y su integración mediante Eureka y gRPC.

## Requisitos
- Node.js >= 18
- npm
- Docker (para levantar Eureka fácilmente)
- Postman / curl para probar endpoints

## Instalación
Desde la raíz del repositorio:

1. Instala dependencias para todos los workspaces:

```bash
npm install
```

2. (Opcional) construir individualmente los servicios:

```bash
cd services/api-gateway && npm run build
cd services/driver-ms && npm run build
```

## Cómo ejecutar localmente (rápido)
Voy a describir dos opciones: arrancar todo (Eureka + driver-ms + gateway) o ejecutar cada servicio por separado.

A. Levantar Eureka con Docker:

```bash
# desde la raíz del repo (usa Docker)
npm run eureka:up
# espera unos segundos a que esté listo (puedes abrir http://localhost:8761)
```

B. Ejecutar driver-ms (en otra terminal):

```bash
cd services/driver-ms
# en Windows bash.exe la variable CROSS-ENV se usa desde package.json; simplemente:
npm run start:dev
# o si tienes problemas con cross-env en tu shell:
# npx nest start --watch
```

C. Ejecutar api-gateway (en otra terminal):

```bash
cd services/api-gateway
npm run start:dev
```

El flujo recomendado:
1. Levantar Eureka (docker)
2. Levantar driver-ms
3. Levantar api-gateway

Si todo está bien, el gateway descubrirá `DRIVER-SERVICE` y las peticiones HTTP a la gateway se redirigirán a driver-ms.

## Scripts útiles (raíz)
- `npm run eureka:up` — levanta el contenedor Eureka (Docker Compose)
- `npm run eureka:down` — baja los contenedores

## Endpoints (expuestos por api-gateway como proxy)
Los siguientes endpoints están disponibles en el API Gateway (por defecto `http://localhost:8080`):

Drivers
- GET /drivers -> lista de drivers
- POST /drivers -> crear driver
  - body: { user_id: number, availability?: number }
- GET /drivers/:id -> obtener driver
- PUT /drivers/:id -> actualizar driver
- DELETE /drivers/:id -> eliminar driver
- GET /drivers/:id/can-drive/:licenseTypeId -> chequea si el driver puede conducir con un tipo de licencia

Driver Licenses (proxy to DriverLicensesService)
- POST /drivers/:driverId/licenses -> crear licencia para driver
  - body: { license_type_id: number, number?: string, issued_at?: "YYYY-MM-DD", expires_at?: "YYYY-MM-DD", status?: number }
- GET /drivers/:driverId/licenses -> listar licencias del driver
- POST /drivers/:driverId/licenses/:licenseId/suspend -> suspender licencia
- GET /drivers/:driverId/licenses/active -> listar licencias activas

License Types
- POST /license-types -> crear tipo de licencia
  - body: { code: string, description?: string, is_professional?: boolean }
- GET /license-types -> listar tipos
- GET /license-types/by-code?code=XXX -> buscar por código
- GET /license-types/:id -> get by id
- PUT /license-types/:id -> actualizar
- DELETE /license-types/:id -> eliminar
- POST /license-types/:parentId/includes/:childId -> agregar inclusion
- DELETE /license-types/:parentId/includes/:childId -> eliminar inclusion
- GET /license-types/:id/closure -> obtener closure de inclusiones

Nota: El gateway valida entradas con `class-validator` y devolverá 400 para payloads inválidos.

## Variables de entorno más relevantes
- `EUREKA_HOST`, `EUREKA_PORT` — host y puerto de Eureka (por defecto localhost:8761)
- `DRIVER_APP_NAME` — nombre con el que se registra driver-ms (por defecto DRIVER-SERVICE)
- `DRIVER_GRPC_PORT`, `DRIVER_HTTP_PORT` — puertos por defecto para driver-ms
- `PROTO_ROOT` — ruta a folder `protos/` si necesitas cambiarla

## Pruebas rápidas (curl)
- Crear driver (a gateway):

```bash
curl -X POST http://localhost:8080/drivers -H "Content-Type: application/json" -d '{"user_id":123}'
```

- Crear licencia para driver (a gateway):

```bash
curl -X POST http://localhost:8080/drivers/1/licenses -H "Content-Type: application/json" -d '{"license_type_id": 2, "number":"ABC123", "issued_at":"2025-01-01", "expires_at":"2026-01-01"}'
```

## Troubleshooting
- Si el gateway no encuentra `DRIVER-SERVICE`, verifica que Eureka esté corriendo como contenedor (`http://localhost:8761`) y que `driver-ms` se haya registrado (logs del servicio muestran registro de Eureka).
- Si `npm run start:dev` falla en Windows por `cross-env`, prueba `npx nest start --watch` o instala `cross-env` globalmente.

