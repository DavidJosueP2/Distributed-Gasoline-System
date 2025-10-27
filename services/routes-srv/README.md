# Routes Service

Servicio de gestión de rutas y viajes para el sistema distribuido de combustible.

## Descripción

Este servicio maneja:
- **Rutas**: Definición de rutas con coordenadas y tipos de vehículo
- **Viajes**: Gestión completa del ciclo de vida de viajes
- **Cálculos de combustible**: Estimación y cálculo real de consumo

## Estados de Viaje

- `CREADO`: Admin creó el viaje, conductor no lo ha iniciado
- `EN_RUTA`: Conductor inició el viaje
- `EN_REVISION`: Viaje terminado, supervisor revisando
- `TERMINADO`: Viaje completado y aprobado

## Flujo de Trabajo

1. **Admin crea viaje** → Estado: `CREADO`
2. **Conductor inicia viaje** → Estado: `EN_RUTA`
3. **Conductor finaliza viaje** → Estado: `EN_REVISION`
4. **Supervisor revisa** → Estado: `TERMINADO`

## Integración

- **VehiclesService**: Obtiene consumo efectivo de vehículos
- **Eureka**: Registro de servicio para descubrimiento
- **TypeORM**: Persistencia con PostgreSQL

## Variables de Entorno

```bash
# Service Configuration
ROUTES_APP_NAME=ROUTES-SERVICE
ROUTES_GRPC_PORT=50053

# Database
ROUTES_DB_HOST=localhost
ROUTES_DB_PORT=5500
ROUTES_DB_USER=postgres
ROUTES_DB_PASS=admin
ROUTES_DB_NAME=routes

# Eureka
EUREKA_HOST=localhost
EUREKA_PORT=8761
```

## Instalación

```bash
npm install
npm run start:dev
```

## Endpoints gRPC

### RoutesService
- `CreateRoute`: Crear nueva ruta
- `GetRoute`: Obtener ruta por ID
- `ListRoutes`: Listar rutas (con filtro opcional)
- `UpdateRoute`: Actualizar ruta
- `DeleteRoute`: Eliminar ruta

### TripsService
- `CreateTrip`: Crear nuevo viaje
- `GetTrip`: Obtener viaje por ID
- `ListTrips`: Listar viajes (con filtros opcionales)
- `UpdateTrip`: Actualizar viaje
- `StartTrip`: Iniciar viaje
- `FinishTrip`: Finalizar viaje
- `ReviewTrip`: Revisar viaje