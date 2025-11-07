# 🔧 Variables de Entorno Actualizadas - Fuel System

**Fecha**: Noviembre 6, 2025  
**Problema Resuelto**: Microservicios NO se registraban en Eureka

## 🎯 Problema Identificado

Los microservicios **NO se estaban registrando en Eureka** porque faltaban variables de entorno críticas en el ConfigMap de Kubernetes, especialmente:

❌ **`DISCOVERY_MODE=eureka`** - Sin esta variable, los microservicios no sabían que debían usar Eureka
❌ Faltan variables de Eureka (EUREKA_HOST, EUREKA_PORT, etc.)
❌ Faltan APP_NAMEs específicos por servicio
❌ Faltan muchas variables de configuración del .env

## ✅ Archivos Actualizados

### 1. **`deploy/helm/fuel-system/templates/configmap.yaml`**

Agregadas **TODAS** las variables de entorno críticas:

#### Variables de Service Discovery (CRÍTICAS):
```yaml
DISCOVERY_MODE: "eureka"                    # ← CRÍTICO: Activa el registro en Eureka
EUREKA_HOST: "eureka-server"                # Host del servidor Eureka
EUREKA_PORT: "8761"                         # Puerto de Eureka
EUREKA_BASE_PATH: "/eureka"                 # Path base de Eureka
EUREKA_WAIT_TIMEOUT_MS: "15000"             # Timeout para conexión
```

#### Variables de Nombres de Aplicación:
```yaml
GATEWAY_APP_NAME: "API-GATEWAY"
AUTH_APP_NAME: "AUTH-SERVICE"
DRIVER_APP_NAME: "DRIVER-SERVICE"
USERS_APP_NAME: "USERS-SERVICE"
VEHICLES_APP_NAME: "VEHICLES-SERVICE"
EMAIL_APP_NAME: "EMAIL-SERVICE"
LOGGER_APP_NAME: "LOGGER-SERVICE"
```

#### Variables de Proto Files:
```yaml
PROTO_ROOT: "/app/protos"
PROTOS_DIR: "/app/protos"
```

#### Variables de PostgreSQL (por servicio):
```yaml
AUTH_DB_HOST: "auth-db-postgresql"
DRIVER_DB_HOST: "driver-db-postgresql"
USERS_DB_HOST: "users-db-postgresql"
VEHICLES_DB_HOST: "vehicles-db-postgresql"

AUTH_DB_NAME: "auth_db"
DRIVER_DB_NAME: "driver_db"
USERS_DB_NAME: "users_db"
VEHICLES_DB_NAME: "vehicles_db"

# TypeORM Configuration
DRIVER_DB_SYNCHRONIZE: "false"
DRIVER_DB_LOGGING: "false"
```

#### Variables de RabbitMQ:
```yaml
RABBITMQ_HOST: "rabbitmq"
RABBITMQ_PORT: "5672"
RABBITMQ_MANAGEMENT_PORT: "15672"

# Outbox Pattern
OUTBOX_EXCHANGE: "service.events"
PUBLISH_BATCH: "20"
POLL_MS: "500"
OUTBOX_PUBLISHER_PORT: "4100"
```

#### Variables de Elasticsearch:
```yaml
ELASTICSEARCH_HOST: "elasticsearch-master"
ELASTICSEARCH_PORT: "9200"
ELASTICSEARCH_NODE: "http://elasticsearch-master:9200"
```

#### Variables Generales:
```yaml
NODE_ENV: "production" (o "development" en local)
LOG_LEVEL: "info"
SERVICE_BIND_HOST: "0.0.0.0"
GATEWAY_HTTP_PORT: "8080"
GRPC_CALL_TIMEOUT_MS: "5000"
```

### 2. **`deploy/helm/fuel-system/templates/microservices.yaml`**

Actualizado para inyectar las variables desde el ConfigMap:

```yaml
env:
- name: DISCOVERY_MODE
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: DISCOVERY_MODE
- name: EUREKA_HOST
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: EUREKA_HOST
- name: EUREKA_PORT
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: EUREKA_PORT
# ... y todas las demás variables
```

### 3. **`deploy/helm/fuel-system/templates/api-gateway.yaml`**

Agregadas todas las variables de Service Discovery y Gateway específicas:

```yaml
env:
- name: DISCOVERY_MODE
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: DISCOVERY_MODE
- name: GATEWAY_APP_NAME
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: GATEWAY_APP_NAME
- name: GRPC_CALL_TIMEOUT_MS
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: GRPC_CALL_TIMEOUT_MS
# ... etc
```

### 4. **`deploy/helm/fuel-system/templates/auth-service.yaml`**

Agregadas todas las variables de Service Discovery y Auth específicas:

```yaml
env:
- name: DISCOVERY_MODE
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: DISCOVERY_MODE
- name: AUTH_APP_NAME
  valueFrom:
    configMapKeyRef:
      name: fuel-system-config
      key: AUTH_APP_NAME
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: fuel-system-jwt
      key: secret
# ... etc
```

## 🚀 Cómo Aplicar los Cambios

### Opción 1: Actualizar el despliegue existente (Recomendado)

```powershell
# Navegar al directorio del chart
cd deploy/helm/fuel-system

# Actualizar el release existente
helm upgrade fuel-system . `
  --namespace fuel-system `
  --values ./values.yaml `
  --values ../../local/values-local.yaml

# Verificar que los pods se reinicien con las nuevas variables
kubectl get pods -n fuel-system -w
```

### Opción 2: Reinstalar completamente (si hay problemas)

```powershell
# Desinstalar el release actual
helm uninstall fuel-system -n fuel-system

# Esperar a que se eliminen todos los pods
kubectl get pods -n fuel-system -w

# Reinstalar con las nuevas configuraciones
helm install fuel-system . `
  --namespace fuel-system `
  --values ./values.yaml `
  --values ../../local/values-local.yaml

# Verificar el despliegue
kubectl get pods -n fuel-system
```

## ✅ Verificación Post-Despliegue

### 1. Verificar que el ConfigMap tiene las nuevas variables:

```powershell
kubectl get configmap fuel-system-config -n fuel-system -o yaml | grep DISCOVERY_MODE
```

**Esperado:**
```yaml
DISCOVERY_MODE: eureka
```

### 2. Verificar que los pods tienen las variables inyectadas:

```powershell
# Verificar variables en API Gateway
kubectl exec -n fuel-system deployment/fuel-system-api-gateway -- env | grep DISCOVERY_MODE

# Verificar variables en Users Service
kubectl exec -n fuel-system deployment/fuel-system-users-service -- env | grep DISCOVERY_MODE

# Verificar variables de Eureka
kubectl exec -n fuel-system deployment/fuel-system-api-gateway -- env | grep EUREKA
```

**Esperado:**
```
DISCOVERY_MODE=eureka
EUREKA_HOST=eureka-server
EUREKA_PORT=8761
EUREKA_BASE_PATH=/eureka
```

### 3. Verificar logs de los microservicios:

```powershell
# Ver logs del API Gateway
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Ver logs del Users Service
kubectl logs -f deployment/fuel-system-users-service -n fuel-system

# Ver logs del Driver Service
kubectl logs -f deployment/fuel-system-driver-service -n fuel-system
```

**Buscar en los logs:**
- ✅ "Registering with Eureka..."
- ✅ "Connected to Eureka Server"
- ✅ "Service registered successfully"
- ❌ NO debe aparecer: "DISCOVERY_MODE not set" o "Cannot connect to Eureka"

### 4. Verificar en Eureka Dashboard:

```
1. Abrir: http://localhost:8761
2. Ir a la sección "Instances currently registered with Eureka"
3. Verificar que aparecen los servicios:
   - API-GATEWAY
   - AUTH-SERVICE
   - USERS-SERVICE
   - VEHICLES-SERVICE
   - EMAIL-SERVICE
   - DRIVER-SERVICE (si está funcionando)
   - LOGGER-SERVICE (si está funcionando)
```

## 🔍 Troubleshooting

### Si los servicios siguen sin registrarse:

#### 1. Verificar que Eureka Server está accesible:

```powershell
# Desde dentro de un pod
kubectl exec -n fuel-system deployment/fuel-system-api-gateway -- curl http://eureka-server:8761/eureka/apps

# Desde tu máquina
curl http://localhost:8761/eureka/apps
```

#### 2. Verificar conectividad de red:

```powershell
# Probar conectividad desde un pod al servicio de Eureka
kubectl exec -n fuel-system deployment/fuel-system-api-gateway -- nslookup eureka-server
kubectl exec -n fuel-system deployment/fuel-system-api-gateway -- ping -c 2 eureka-server
```

#### 3. Verificar que el servicio de Eureka existe:

```powershell
kubectl get svc eureka-server -n fuel-system
```

**Esperado:**
```
NAME            TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)          AGE
eureka-server   NodePort   10.96.92.23    <none>        8761:30761/TCP   5h
```

#### 4. Ver eventos del namespace:

```powershell
kubectl get events -n fuel-system --sort-by='.lastTimestamp' | tail -20
```

## 📊 Resumen de Cambios por Componente

| Componente | Variables Agregadas | Impacto |
|------------|---------------------|---------|
| **ConfigMap** | +40 variables | ⭐⭐⭐ CRÍTICO - Base de todas las configuraciones |
| **API Gateway** | +12 variables | ⭐⭐⭐ CRÍTICO - Necesita registrarse en Eureka |
| **Auth Service** | +10 variables | ⭐⭐⭐ CRÍTICO - Necesita registrarse en Eureka |
| **Microservicios** | +15 variables cada uno | ⭐⭐⭐ CRÍTICO - Necesitan registrarse en Eureka |

## 🎯 Variables Más Importantes

En orden de criticidad:

1. **`DISCOVERY_MODE=eureka`** ⭐⭐⭐⭐⭐
   - Sin esta variable, NADA se registra en Eureka
   
2. **`EUREKA_HOST` y `EUREKA_PORT`** ⭐⭐⭐⭐⭐
   - Los servicios necesitan saber dónde está Eureka
   
3. **`{SERVICE}_APP_NAME`** ⭐⭐⭐⭐
   - Nombre con el que el servicio se registra en Eureka
   
4. **`PROTO_ROOT` y `PROTOS_DIR`** ⭐⭐⭐
   - Necesario para que gRPC funcione correctamente
   
5. **Variables de BD específicas** ⭐⭐⭐
   - Cada servicio necesita sus propias variables de BD

## 🎉 Resultado Esperado

Después de aplicar estos cambios:

✅ Todos los microservicios deberían registrarse automáticamente en Eureka
✅ El dashboard de Eureka (http://localhost:8761) mostrará todos los servicios
✅ El API Gateway podrá descubrir dinámicamente los servicios
✅ Los logs no mostrarán errores de "Cannot connect to Eureka"
✅ Los servicios podrán comunicarse entre sí a través de Eureka

## 📝 Notas Adicionales

- Estas variables son las mismas que están en el archivo `.env` de la raíz del proyecto
- Se respetan los prefijos por servicio (AUTH_, DRIVER_, USERS_, etc.)
- Las contraseñas y secrets se mantienen en Kubernetes Secrets, no en ConfigMap
- La configuración funciona tanto para Kind local como para Azure AKS

---

**¡Importante!** Después de aplicar estos cambios, los pods se van a reiniciar automáticamente. Espera unos 2-3 minutos para que todos los servicios se registren en Eureka.

**Siguiente paso:** Ejecuta `helm upgrade` y luego verifica en http://localhost:8761 que los servicios aparecen registrados.

