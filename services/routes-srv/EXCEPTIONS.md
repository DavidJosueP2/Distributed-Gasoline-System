# Excepciones del Routes Service

Este documento describe todas las excepciones personalizadas utilizadas en el servicio de rutas y viajes.

## 📋 **Excepciones Generales**

### `InvalidIdentifierException`
- **Código gRPC**: `INVALID_ARGUMENT`
- **Uso**: Cuando se proporciona un identificador inválido
- **Ejemplo**: Nombre de ruta vacío o nulo

### `NotFoundException`
- **Código gRPC**: `NOT_FOUND`
- **Uso**: Cuando no se encuentra un recurso solicitado
- **Ejemplo**: Ruta o viaje no encontrado

### `DataAlreadyExistsException`
- **Código gRPC**: `ALREADY_EXISTS`
- **Uso**: Cuando se intenta crear un dato que ya existe
- **Ejemplo**: Ruta con el mismo nombre ya existe

### `RpcExceptionFromValidationErrors`
- **Código gRPC**: `INVALID_ARGUMENT`
- **Uso**: Para errores de validación de campos
- **Ejemplo**: Campos requeridos faltantes o con formato incorrecto

## 🚗 **Excepciones Específicas del Dominio**

### `InvalidTripStatusTransitionException`
- **Código gRPC**: `FAILED_PRECONDITION`
- **Uso**: Cuando se intenta cambiar a un estado no permitido
- **Ejemplo**: Intentar iniciar un viaje que ya está terminado
- **Mensaje**: `"No se puede cambiar de estado {actual} a {nuevo}"`

### `TripNotInCorrectStatusException`
- **Código gRPC**: `FAILED_PRECONDITION`
- **Uso**: Cuando el viaje no está en el estado requerido para la operación
- **Ejemplo**: Intentar finalizar un viaje que no está en estado `EN_RUTA`
- **Mensaje**: `"El viaje debe estar en estado {requerido}, pero está en {actual}"`

### `InvalidVehicleTypeException`
- **Código gRPC**: `INVALID_ARGUMENT`
- **Uso**: Cuando se proporciona un tipo de vehículo inválido
- **Ejemplo**: Tipo de vehículo diferente a `LIVIANO` o `PESADO`
- **Mensaje**: `"Tipo de vehículo inválido: {tipo}. Debe ser LIVIANO o PESADO"`

### `InvalidDistanceException`
- **Código gRPC**: `INVALID_ARGUMENT`
- **Uso**: Cuando la distancia proporcionada es inválida
- **Ejemplo**: Distancia menor o igual a 0
- **Mensaje**: `"Distancia inválida: {distancia}. Debe ser mayor a 0"`

### `ReviewCommentRequiredException`
- **Código gRPC**: `INVALID_ARGUMENT`
- **Uso**: Cuando la desviación supera el umbral y requiere comentario obligatorio
- **Ejemplo**: Desviación > 3% sin comentario de revisión
- **Mensaje**: `"Desviación del {porcentaje}% requiere comentario de revisión obligatorio"`

### `VehicleServiceUnavailableException`
- **Código gRPC**: `UNAVAILABLE`
- **Uso**: Cuando el servicio de vehículos no está disponible
- **Ejemplo**: Error al obtener el perfil de consumo del vehículo
- **Mensaje**: `"Servicio de vehículos no disponible para obtener información del vehículo {id}"`

### `InvalidOdometerReadingException`
- **Código gRPC**: `INVALID_ARGUMENT`
- **Uso**: Cuando la lectura del odómetro final es menor o igual a la inicial
- **Ejemplo**: Odómetro final <= odómetro inicial
- **Mensaje**: `"Lectura de odómetro inválida: odómetro final ({final}) debe ser mayor al inicial ({inicial})"`

## 🔄 **Flujo de Estados y Excepciones**

### Estados de Viaje
```
CREADO → EN_RUTA → EN_REVISION → TERMINADO
```

### Transiciones Válidas
- `CREADO` → `EN_RUTA` ✅
- `EN_RUTA` → `EN_REVISION` ✅
- `EN_REVISION` → `TERMINADO` ✅

### Transiciones Inválidas
- Cualquier otro cambio de estado ❌
- **Excepción**: `InvalidTripStatusTransitionException`

## 📊 **Uso en los Servicios**

### RouteService
- `InvalidIdentifierException`: Nombre de ruta inválido
- `InvalidDistanceException`: Distancia inválida
- `NotFoundException`: Ruta no encontrada

### TripService
- `NotFoundException`: Viaje o ruta no encontrado
- `InvalidTripStatusTransitionException`: Transición de estado inválida
- `TripNotInCorrectStatusException`: Estado incorrecto para la operación
- `InvalidOdometerReadingException`: Lectura de odómetro inválida
- `ReviewCommentRequiredException`: Comentario obligatorio por desviación
- `VehicleServiceUnavailableException`: Servicio de vehículos no disponible

## 🛠️ **Implementación**

Todas las excepciones extienden de `RpcException` de NestJS y utilizan códigos de estado gRPC apropiados para mantener la consistencia en la comunicación entre microservicios.

```typescript
import { 
  NotFoundException,
  InvalidTripStatusTransitionException,
  TripNotInCorrectStatusException,
  // ... otras excepciones
} from '../exceptions';
```
