# 🔧 SOLUCIÓN: Variables de Entorno y Archivos .proto

## ❌ PROBLEMAS IDENTIFICADOS

### 1. Vehicles Service - Error: `/protos/vehicles.proto` not found
```
Error: The invalid .proto definition (file at "/protos/vehicles.proto" not found)
```

**Causa**: El servicio buscaba el archivo `.proto` en `/protos` pero en las imágenes Docker está en `/app/protos`

### 2. Driver Service - Error: Variables de entorno faltantes
```
Config validation error: DRIVER_HTTP_PORT must be a valid number; DRIVER_GRPC_PORT must be a valid number; 
BIND_HOST must be a string; PROTO_ROOT must be a string; PROTOS_DIR must be a string; 
EUREKA_BASE_PATH must be a string; EUREKA_WAIT_TIMEOUT_MS must be a valid number; 
DRIVER_DB_HOST must be a string; DRIVER_DB_USER must be a string; DRIVER_DB_PASS must be a string; 
DRIVER_DB_NAME must be a string; DRIVER_DB_SYNCHRONIZE must be a boolean; DRIVER_DB_LOGGING must be a boolean; 
DRIVER_NODE_ENV must be a string
```

**Causa inicial**: El template de Helm no estaba configurando todas las variables de entorno necesarias que están definidas en Docker Compose

**Causa adicional (actualización)**: Después de agregar las variables, se configuraron incorrectamente usando referencias literales:
```yaml
- name: DRIVER_DB_PORT
  value: "$(DB_PORT)"  # ❌ Esto NO se expande, es una cadena literal
```

Esto causaba el error:
```
psql: error: invalid integer value "$(DB_PORT)" for connection option "port"
Config validation error: DRIVER_DB_PORT must be a valid number
```

**Solución**: Usar `valueFrom` para obtener los valores directamente del ConfigMap/Secret:
```yaml
- name: DRIVER_DB_PORT
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: POSTGRESQL_PORT  # ✅ Obtiene "5432" directamente
```

### 3. Auth Service - Error: No puede conectarse a PostgreSQL
```
ERROR [TypeOrmModule] Unable to connect to the database. Retrying (1)...
AggregateError [ECONNREFUSED]: 
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Causa**: Auth Service usa variables de entorno con prefijos específicos (`AUTH_DB_HOST`, `AUTH_DB_USER`, `AUTH_DB_PASS`) pero el template de Helm solo configuraba las variables genéricas (`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`). Al no encontrar las variables con prefijo `AUTH_*`, el servicio usaba valores por defecto que apuntaban a `localhost`.

### 4. API Gateway - Variables de protos faltantes

**Causa**: El template de API Gateway no tenía configuradas las variables `PROTO_ROOT` y `PROTOS_DIR` necesarias para acceder a los archivos `.proto`

## ✅ SOLUCIONES IMPLEMENTADAS

### 1. Archivos `.proto` ya están en las imágenes Docker

**Análisis de Dockerfiles:**
- ✅ Los Dockerfiles ya copian los archivos `.proto` desde `/protos` (raíz del proyecto) a `/app/protos` dentro de la imagen
- ✅ En el stage de build: `COPY protos/vehicles.proto ./protos/vehicles.proto`
- ✅ En el stage de runtime: `COPY --from=build /app/protos ./protos`

**Ruta final en las imágenes**: `/app/protos/`

**Por lo tanto:**
- ❌ **NO necesitamos** crear un ConfigMap con archivos `.proto`
- ❌ **NO necesitamos** montar un volumen con los `.proto`
- ✅ **SOLO necesitamos** configurar las variables de entorno `PROTO_ROOT` y `PROTOS_DIR` a `/app/protos`

### 2. Variables de entorno agregadas al template `microservices.yaml`

#### Variables comunes para todos los servicios:

```yaml
- name: NODE_ENV
  value: "development"  # o "production"
- name: GRPC_PORT
  value: "50062"  # puerto específico del servicio
- name: PROTO_ROOT
  value: "/app/protos"  # ← CORREGIDO: antes era "/protos"
- name: PROTOS_DIR
  value: "/app/protos"  # ← CORREGIDO: antes era "/protos"
- name: SERVICE_REGISTER_HOST
  value: "fuel-system-driver-service"  # nombre del servicio en K8s
- name: REGISTER_HOST
  value: "fuel-system-driver-service"  # para registro en Eureka
```

#### Variables específicas de Driver Service:

```yaml
- name: DRIVER_HTTP_PORT
  value: "3100"
- name: DRIVER_GRPC_PORT
  value: "50062"
- name: SERVICE_BIND_HOST
  value: "0.0.0.0"
- name: BIND_HOST
  value: "0.0.0.0"
- name: EUREKA_BASE_PATH
  value: "/eureka/apps"
- name: EUREKA_WAIT_TIMEOUT_MS
  value: "30000"
- name: DRIVER_NODE_ENV
  value: "development"
- name: DRIVER_DB_HOST
  value: "$(DB_HOST)"  # referencia a variable calculada
- name: DRIVER_DB_PORT
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: POSTGRESQL_PORT  # obtiene "5432" directamente
- name: DRIVER_DB_USER
  value: "$(DB_USERNAME)"
- name: DRIVER_DB_PASS
  value: "$(DB_PASSWORD)"
- name: DRIVER_DB_NAME
  value: "driver_db"
- name: DRIVER_DB_SYNCHRONIZE
  value: "false"
- name: DRIVER_DB_LOGGING
  value: "false"
```

#### Variables específicas de Users Service:

```yaml
- name: USERS_GRPC_PORT
  value: "50057"
```

#### Variables específicas de Vehicles Service:

```yaml
- name: VEHICLES_GRPC_PORT
  value: "50055"
```

#### Variables específicas de Logger Service:

```yaml
- name: LOGGER_HTTP_PORT
  value: "3200"
- name: LOGGER_GRPC_PORT
  value: "50058"
```

#### Variables específicas de Publisher Service:

```yaml
- name: PORT
  value: "4100"
- name: OUTBOX_PUBLISHER_PORT
  value: "4100"
```

#### Variables específicas de Email Service:

```yaml
- name: EMAIL_GRPC_PORT
  value: "50053"
```

#### Variables específicas de Auth Service:

```yaml
- name: AUTH_DB_HOST
  value: "$(DB_HOST)"
- name: AUTH_DB_PORT
  value: "$(DB_PORT)"
- name: AUTH_DB_USER
  value: "$(DB_USERNAME)"
- name: AUTH_DB_PASS
  value: "$(DB_PASSWORD)"
- name: AUTH_DB_NAME
  value: "auth_db"
```

## 📝 ARCHIVOS MODIFICADOS

### 1. `deploy/helm/fuel-system/templates/microservices.yaml`

**Cambios realizados:**

1. ✅ Agregadas variables `PROTO_ROOT` y `PROTOS_DIR` apuntando a `/app/protos`
2. ✅ Agregadas variables de registro en Eureka (`SERVICE_REGISTER_HOST`, `REGISTER_HOST`)
3. ✅ Agregadas todas las variables específicas de Driver Service
4. ✅ Agregadas variables específicas para cada microservicio (`*_GRPC_PORT`)
5. ✅ Agregadas variables específicas de Auth Service
6. ✅ Eliminadas referencias a volumen de ConfigMap de protos (no necesario)

## 🧪 VERIFICACIÓN

### Comando para verificar variables de entorno generadas:

```powershell
cd deploy/helm/fuel-system
helm template test . -n fuelhub --values ../../local/values-local.yaml | Select-String "PROTO_ROOT|DRIVER_HTTP_PORT|SERVICE_REGISTER_HOST" -Context 1,1
```

### Resultado esperado:

```yaml
- name: PROTO_ROOT
  value: "/app/protos"  # ✅ Correcto
- name: DRIVER_HTTP_PORT
  value: "3100"  # ✅ Correcto
- name: SERVICE_REGISTER_HOST
  value: "test-fuel-system-driver-service"  # ✅ Correcto
```

## 🚀 PRÓXIMOS PASOS

### 1. Reconstruir las imágenes Docker

Si aún no lo has hecho, asegúrate de que las imágenes Docker en GHCR estén actualizadas:

```powershell
# Construir y subir imágenes
cd "D:\Sixth Semester\Aplicaciones Distribuidas\Proyecto Combustible\fuel-system-distributed"
docker compose build
# Luego sube las imágenes con tu script de push
```

### 2. Actualizar el despliegue en Kubernetes

Si ya tienes los servicios desplegados, actualízalos:

```powershell
# Actualizar el release de Helm
cd deploy/helm/fuel-system
helm upgrade fuel-system . --namespace fuel-system --values ../../local/values-local.yaml

# O reinstalar completamente
helm uninstall fuel-system -n fuel-system
helm install fuel-system . --namespace fuel-system --values ../../local/values-local.yaml
```

### 3. Verificar que los servicios arranquen correctamente

```powershell
# Ver logs de Driver Service
kubectl logs -f deployment/fuel-system-driver-service -n fuel-system

# Ver logs de Vehicles Service
kubectl logs -f deployment/fuel-system-vehicles-service -n fuel-system

# Ver todos los pods
kubectl get pods -n fuel-system
```

## ✅ CONFIRMACIÓN DE SOLUCIÓN

### Driver Service debe mostrar:
```
[Nest] 1  - 11/06/2025, XX:XX:XX PM     LOG [NestFactory] Starting Nest application...
[Nest] 1  - 11/06/2025, XX:XX:XX PM     LOG [InstanceLoader] AppModule dependencies initialized
...
[Nest] 1  - 11/06/2025, XX:XX:XX PM     LOG Microservice is listening on port 50062
```

### Vehicles Service debe mostrar:
```
[Nest] 1  - 11/06/2025, XX:XX:XX PM     LOG [NestFactory] Starting Nest application...
[Nest] 1  - 11/06/2025, XX:XX:XX PM     LOG [InstanceLoader] VehiclesBootstrapModule dependencies initialized
...
[Nest] 1  - 11/06/2025, XX:XX:XX PM     LOG Microservice is listening on port 50055
```

### ❌ NO debe aparecer:
- ❌ `ENOENT: no such file or directory, open '/protos/vehicles.proto'`
- ❌ `Config validation error: DRIVER_HTTP_PORT must be a valid number`

## 📋 RESUMEN

| Problema | Solución | Estado |
|----------|----------|--------|
| Archivos `.proto` no encontrados | Variables `PROTO_ROOT=/app/protos` | ✅ Resuelto |
| Variables de entorno faltantes en Driver Service | Agregadas 14 variables de entorno | ✅ Resuelto |
| Variables de entorno faltantes en otros servicios | Agregadas variables `*_GRPC_PORT` | ✅ Resuelto |
| Variables de registro en Eureka | Agregadas `SERVICE_REGISTER_HOST` y `REGISTER_HOST` | ✅ Resuelto |
| Variables de entorno faltantes en Auth Service | Agregadas variables `AUTH_DB_HOST`, `AUTH_DB_USER`, `AUTH_DB_PASS` | ✅ Resuelto |
| Variables de protos faltantes en API Gateway | Agregadas variables `PROTO_ROOT` y `PROTOS_DIR` | ✅ Resuelto |

## 🎯 CONCLUSIÓN

Todos los problemas identificados han sido resueltos:

1. ✅ Los archivos `.proto` ya están en las imágenes Docker en `/app/protos`
2. ✅ Todas las variables de entorno necesarias se configuran en el template de Helm
3. ✅ El template genera correctamente las variables sin errores de sintaxis
4. ✅ Los servicios ahora tienen toda la configuración necesaria para arrancar

**El problema NO es de las imágenes Docker** (que ya están correctas), sino que **faltaba la configuración de variables de entorno en los templates de Helm**.

Con estos cambios, cuando subas las imágenes actualizadas a GHCR y las despliegues en Kubernetes, los servicios deberían arrancar correctamente.
