# Fase 6: Despliegue de Microservicios en AKS

> **Tiempo estimado**: 20 minutos (manual) o 10 minutos (CI/CD)  
> **Prerequisitos**: Fases 1-5 completadas

---

## IMPORTANTE: Dos Métodos de Despliegue

Antes de continuar, lee la **[Guía Unificada de Despliegue](./DEPLOY-GUIDE.md)** que explica:

- Diferencia entre despliegue **Manual** vs **CI/CD**
- Cómo funciona Helm con los archivos de valores
- Estructura de archivos y configuración
- Troubleshooting común

**Elige tu método:**

- **Método 1: Manual** - Recomendado para primera vez
- **Método 2: CI/CD** - Recomendado después de validar manual

---

## Método 1: Despliegue Manual

### Paso 1: Verificar Pre-requisitos

```bash
# Verificar contexto de kubectl
kubectl config current-context

# Debe mostrar tu cluster de AKS
# Output esperado: fuel-system-aks

# Verificar que RabbitMQ y Elasticsearch están corriendo
kubectl get pods -n fuel-system

# Debes ver:
# rabbitmq-0 (si es desarrollo) o rabbitmq-0,1,2 (si es producción)
# elasticsearch-master-0,1,2
```

### Paso 2: Crear Namespace

```bash
kubectl create namespace fuel-system --dry-run=client -o yaml | kubectl apply -f -
```

### Paso 3: Crear Secrets de Producción

**NOTA:** Estos son los valores de ejemplo que estás usando para pruebas. En producción real, usa valores seguros y diferentes.

```bash
# PostgreSQL Secret
# IMPORTANTE: El password debe coincidir con el de Azure PostgreSQL
# CRÍTICO: En Azure el username debe incluir el servidor: usuario@servidor
kubectl create secret generic fuel-system-postgresql \
  --from-literal=username='pgadmin@fuel-system-postgres' \
  --from-literal=password='FuelSystem2024!Secure' \
  --namespace=fuel-system

# RabbitMQ Secret
kubectl create secret generic fuel-system-rabbitmq \
  --from-literal=username=admin \
  --from-literal=password='RabbitDev2024' \
  --namespace=fuel-system

# JWT Secret
# Este es un ejemplo de 64 caracteres, puedes generar uno nuevo con:
# opensssl rand -base64 32
kubectl create secret generic fuel-system-jwt \
  --from-literal=secret='my-super-secret-jwt-key-minimum-32-characters-long-for-security' \
  --namespace=fuel-system

# SMTP Secret (ejemplo con Gmail)
# Nota: Para Gmail, usa una "App Password" no tu password normal
kubectl create secret generic fuel-system-smtp \
  --from-literal=host='smtp.gmail.com' \
  --from-literal=port='587' \
  --from-literal=user='fuel-system-test@gmail.com' \
  --from-literal=password='tu-app-password-de-gmail' \
  --namespace=fuel-system

# Verificar que todos los secrets se crearon correctamente
kubectl get secrets -n fuel-system
```

### Paso 4: Verificar values-azure.yaml

El archivo `deploy/azure/values-azure.yaml` ya está configurado con valores de ejemplo:

```yaml
postgresql:
  external:
    hosts:
      # FQDN de tu servidor PostgreSQL en Azure
      # Cambia si tu servidor tiene un nombre diferente
      auth: "fuel-system-postgres.postgres.database.azure.com"
      driver: "fuel-system-postgres.postgres.database.azure.com"
      # ... (todos usan el mismo servidor)
    
    # Read replicas (opcional, si las configuraste)
    readHosts:
      auth: "fuel-system-postgres-read.postgres.database.azure.com"
      # ...
    
    username: "pgadmin"
    password: "FuelSystem2024!Secure"  # Debe coincidir con el secret
    sslMode: "require"  # OBLIGATORIO en Azure

secrets:
  postgresql:
    password: "FuelSystem2024!Secure"
  rabbitmq:
    password: "RabbitDev2024"
  jwt:
    secret: "my-super-secret-jwt-key-minimum-32-characters-long-for-security"
```

**Si tu servidor PostgreSQL tiene un nombre diferente**, edita el archivo y cambia los valores de `hosts`.

### Paso 5: Desplegar Eureka Server

**NOTA:** Eureka se despliega con **1 réplica** para simplificar la configuración.

```bash
# Crear deployment de Eureka con 1 réplica
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eureka-server
  namespace: fuel-system
  labels:
    app: eureka-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: eureka-server
  template:
    metadata:
      labels:
        app: eureka-server
    spec:
      containers:
      - name: eureka-server
        image: steeltoeoss/eureka-server:latest
        ports:
        - containerPort: 8761
          name: http
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8761
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8761
          initialDelaySeconds: 30
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: eureka-server
  namespace: fuel-system
  labels:
    app: eureka-server
spec:
  type: ClusterIP
  ports:
  - port: 8761
    targetPort: 8761
    protocol: TCP
    name: http
  selector:
    app: eureka-server
EOF

# Esperar a que esté listo (puede tomar 1-2 minutos)
kubectl wait --for=condition=ready pod -l app=eureka-server -n fuel-system --timeout=180s

# Verificar que está corriendo
kubectl get pods -n fuel-system -l app=eureka-server

# Ver logs
kubectl logs -n fuel-system -l app=eureka-server --tail=50
```

### Paso 6: Desplegar Microservicios con Helm

```bash
# Desde la raíz del proyecto
# Desplegar con Helm
helm upgrade --install fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --create-namespace \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml \
  --wait \
  --timeout 15m \
  --debug

# Monitorear pods mientras se despliegan
kubectl get pods -n fuel-system -w
```

**Lo que hace este comando:**

1. Lee `values.yaml` (configuración base)
2. Lee `values-azure.yaml` (sobrescribe con valores de Azure)
3. Crea ConfigMaps con variables de entorno
4. Crea Secrets (si no existen)
5. Despliega cada microservicio con sus init containers
6. Los init containers ejecutan migraciones de base de datos
7. Espera hasta que todos los pods estén en estado Running

### Paso 7: Verificar Despliegue

```bash
# Ver todos los pods (deben estar en Running)
kubectl get pods -n fuel-system

# Output esperado:
# NAME                                            READY   STATUS    RESTARTS   AGE
# eureka-server-xxx                               1/1     Running   0          5m
# fuel-system-api-gateway-xxx                     1/1     Running   0          3m
# fuel-system-auth-service-xxx                    1/1     Running   0          3m
# fuel-system-driver-service-xxx                  1/1     Running   0          3m
# fuel-system-users-service-xxx                   1/1     Running   0          3m
# fuel-system-vehicles-service-xxx                1/1     Running   0          3m
# fuel-system-routes-service-xxx                  1/1     Running   0          3m
# fuel-system-fuel-service-xxx                    1/1     Running   0          3m
# fuel-system-email-service-xxx                   1/1     Running   0          3m
# fuel-system-logger-service-xxx                  1/1     Running   0          3m
# fuel-system-publisher-service-xxx               1/1     Running   0          3m
# rabbitmq-0                                      1/1     Running   0          20m
# elasticsearch-master-0                          1/1     Running   0          20m

# Ver servicios
kubectl get svc -n fuel-system

# Ver logs de un microservicio
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Ver logs de init container (migraciones)
kubectl logs deployment/fuel-system-users-service -c prisma-migrate -n fuel-system
```

### Paso 8: Verificar Eureka Dashboard

```bash
# Port-forward a Eureka
kubectl port-forward svc/eureka-server -n fuel-system 8761:8761

# Abrir en navegador: http://localhost:8761
# Debes ver todos los microservicios registrados
```

### Paso 9: Obtener IP Pública y Probar API

```bash
# Obtener IP pública del Ingress
export INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "API Gateway: http://$INGRESS_IP"

# Probar health endpoint
curl http://$INGRESS_IP/health

# Probar login con usuario de prueba
curl -X POST http://$INGRESS_IP/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice_admin","password":"admin123"}'

# Si funciona, recibirás un token JWT
```

---

## Método 2: Despliegue con CI/CD (GitHub Actions)

### Paso 1: Configurar GitHub Secrets

Ve a tu repositorio → Settings → Secrets and variables → Actions

Crea estos secrets con los **valores de ejemplo** (para pruebas):

| Secret Name | Valor de Ejemplo |
|-------------|------------------|
| `AKS_CLUSTER_NAME` | `fuel-system-aks` |
| `AKS_RESOURCE_GROUP` | `fuel-system-rg` |
| `AZURE_CREDENTIALS` | JSON del Service Principal (ver Fase 1) |
| `POSTGRES_HOST` | `fuel-system-postgres.postgres.database.azure.com` |
| `POSTGRES_USERNAME` | `pgadmin` |
| `POSTGRES_PASSWORD` | `FuelSystem2024!Secure` |
| `RABBITMQ_PASSWORD` | `RabbitDev2024` |
| `JWT_SECRET` | `my-super-secret-jwt-key-minimum-32-characters-long-for-security` |
| `SMTP_USER` | `fuel-system-test@gmail.com` |
| `SMTP_PASSWORD` | Tu app password de Gmail |

**IMPORTANTE:** En producción real, usa valores diferentes y seguros.

### Paso 2: Verificar Workflow

El archivo `.github/workflows/deploy-to-azure.yml` ya está configurado y hace lo siguiente:

1. Crea namespace `fuel-system`
2. Crea todos los secrets automáticamente
3. Despliega Eureka Server (1 réplica)
4. Despliega microservicios con Helm
5. Verifica el estado
6. Muestra la URL pública

### Paso 3: Hacer Deploy

**Opción A: Push a main (automático)**

```bash
git add .
git commit -m "Deploy to Azure AKS"
git push origin main

# El workflow se ejecuta automáticamente después de que
# "Build and Push Docker Images" termine exitosamente
```

**Opción B: Trigger manual**

1. Ve a GitHub → Actions
2. Selecciona "Deploy to Azure AKS"
3. Click en "Run workflow"
4. Selecciona branch "main"
5. Environment: "production"
6. Click "Run workflow"

### Paso 4: Monitorear

Ve a GitHub → Actions → Verás "Deploy to Azure AKS" ejecutándose

El workflow muestra:
- Logs de cada paso
- Estado de pods
- URL pública del API Gateway
- Resumen del despliegue

---

## Verificación Final

Una vez desplegado (cualquier método), verifica:

```bash
# 1. Todos los pods en Running
kubectl get pods -n fuel-system

# 2. Eureka Dashboard (debe mostrar 1 instancia de Eureka y todos los servicios)
kubectl port-forward svc/eureka-server -n fuel-system 8761:8761
# Abrir: http://localhost:8761

# 3. ConfigMap con configuración correcta
kubectl get configmap fuel-system-config -n fuel-system -o yaml | grep -A 5 POSTGRESQL

# Debe mostrar:
# POSTGRESQL_HOST: fuel-system-postgres.postgres.database.azure.com

# 4. Secrets creados
kubectl get secrets -n fuel-system

# Debe mostrar:
# fuel-system-postgresql
# fuel-system-rabbitmq
# fuel-system-jwt
# fuel-system-smtp

# 5. API Gateway funcionando
INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$INGRESS_IP/health

# 6. Verificar conexión a PostgreSQL desde un pod
kubectl exec -it deployment/fuel-system-auth-service -n fuel-system -- sh
# Dentro del pod:
env | grep DB
exit
```

---

## Troubleshooting

### Pods en CrashLoopBackOff

```bash
# Ver logs del pod
kubectl logs POD_NAME -n fuel-system

# Ver logs del init container (migraciones)
kubectl logs POD_NAME -c typeorm-migrate -n fuel-system
kubectl logs POD_NAME -c prisma-migrate -n fuel-system

# Ver eventos del pod
kubectl describe pod POD_NAME -n fuel-system

# Errores comunes:
# - "password authentication failed": Password incorrecto en secret
# - "could not connect to server": FQDN de PostgreSQL incorrecto
# - "SSL required": sslMode debe ser "require" en Azure
```

### Error de autenticación a PostgreSQL

```bash
# Verificar que el secret tiene el password correcto
kubectl get secret fuel-system-postgresql -n fuel-system -o jsonpath='{.data.password}' | base64 --decode
echo ""

# Debe mostrar: FuelSystem2024!Secure

# Si es incorrecto, actualizarlo:
kubectl delete secret fuel-system-postgresql -n fuel-system
kubectl create secret generic fuel-system-postgresql \
  --from-literal=username='pgadmin@fuel-system-postgres' \
  --from-literal=password='FuelSystem2024!Secure' \
  --namespace=fuel-system

# Reiniciar pods
kubectl rollout restart deployment -n fuel-system
```

### FQDN de PostgreSQL incorrecto

```bash
# Verificar el FQDN en ConfigMap
kubectl get configmap fuel-system-config -n fuel-system -o yaml | grep DB_HOST

# Si es incorrecto, editar values-azure.yaml y volver a desplegar
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml \
  --debug
```

### Servicios no se registran en Eureka

```bash
# Verificar que Eureka está corriendo
kubectl get pods -n fuel-system -l app=eureka-server

# Ver logs de Eureka
kubectl logs -n fuel-system -l app=eureka-server --tail=100

# Verificar ConfigMap
kubectl get configmap fuel-system-config -n fuel-system -o yaml | grep EUREKA

# Debe mostrar:
# EUREKA_HOST: eureka-server
# EUREKA_PORT: "8761"
# DISCOVERY_MODE: "eureka"

# Reiniciar microservicios
kubectl rollout restart deployment -n fuel-system
```

### ImagePullBackOff

```bash
# Verificar que la imagen existe y es pública
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest

# Ver detalles del error
kubectl describe pod POD_NAME -n fuel-system

# Verificar que el imageRegistry.url es correcto
kubectl get deployment fuel-system-api-gateway -n fuel-system -o yaml | grep image:
```

---

## Comandos Útiles

```bash
# Ver todo en el namespace
kubectl get all -n fuel-system

# Logs en tiempo real de un servicio
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Logs de todos los pods de un servicio
kubectl logs -n fuel-system -l app.kubernetes.io/component=api-gateway --tail=100

# Ejecutar comando en un pod
kubectl exec -it deployment/fuel-system-api-gateway -n fuel-system -- sh

# Port-forward a un servicio
kubectl port-forward svc/fuel-system-api-gateway -n fuel-system 8080:8080

# Reiniciar un deployment
kubectl rollout restart deployment/fuel-system-api-gateway -n fuel-system

# Reiniciar todos los deployments
kubectl rollout restart deployment -n fuel-system

# Ver uso de recursos
kubectl top nodes
kubectl top pods -n fuel-system

# Ver eventos recientes
kubectl get events -n fuel-system --sort-by='.lastTimestamp' | tail -20

# Describir un recurso
kubectl describe deployment fuel-system-api-gateway -n fuel-system
kubectl describe pod POD_NAME -n fuel-system
kubectl describe svc fuel-system-api-gateway -n fuel-system
```

---

## Actualizar Despliegue

### Después de cambios en código

```bash
# Las imágenes se rebuildan automáticamente con GitHub Actions
# cuando haces push a main

# Método Manual - Actualizar con las nuevas imágenes:
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml \
  --set global.imageTag=latest \
  --debug

# O forzar recreación de pods:
kubectl rollout restart deployment -n fuel-system

# Método CI/CD - Solo push:
git push origin main
# El workflow se encarga de todo automáticamente
```

### Cambiar configuración (variables de entorno)

```bash
# 1. Editar values-azure.yaml o values.yaml
# 2. Actualizar con Helm:
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml \
  --debug

# Los pods se reiniciarán automáticamente con la nueva configuración
```

### Cambiar secrets

```bash
# 1. Eliminar el secret existente
kubectl delete secret fuel-system-postgresql -n fuel-system

# 2. Crear nuevo secret con valores actualizados
kubectl create secret generic fuel-system-postgresql \
  --from-literal=username='pgadmin@fuel-system-postgres' \
  --from-literal=password='NuevoPassword' \
  --namespace=fuel-system

# 3. Reiniciar pods para que tomen el nuevo secret
kubectl rollout restart deployment -n fuel-system
```

---

## Valores de Ejemplo Usados

Para referencia, estos son los valores de ejemplo que estás usando en tus pruebas:

| Recurso | Valor |
|---------|-------|
| **PostgreSQL FQDN** | `fuel-system-postgres.postgres.database.azure.com` |
| **PostgreSQL Read Replica** | `fuel-system-postgres-read.postgres.database.azure.com` |
| **PostgreSQL Username** | `pgadmin@fuel-system-postgres` (formato: usuario@servidor) |
| **PostgreSQL Password** | `FuelSystem2024!Secure` |
| **PostgreSQL SSL Mode** | `require` (OBLIGATORIO en Azure) |
| **PostgreSQL SSL Reject Unauthorized** | `false` (Azure usa certificados autofirmados) |
| **RabbitMQ Username** | `admin` |
| **RabbitMQ Password** | `RabbitDev2024` |
| **JWT Secret** | `my-super-secret-jwt-key-minimum-32-characters-long-for-security` |
| **Eureka Replicas** | `1` |

**IMPORTANTE:** En producción real, usa valores diferentes, más seguros y guárdalos en un gestor de secrets como Azure Key Vault.

---

## Despliegue Completado

Si llegaste hasta aquí exitosamente, tienes:

- Cluster AKS funcionando
- PostgreSQL en Azure (`fuel-system-postgres.postgres.database.azure.com`)
- RabbitMQ y Elasticsearch en AKS
- Eureka Server activo (1 réplica)
- 10 microservicios desplegados y registrados en Eureka
- API Gateway accesible públicamente
- Sistema completo funcional con IP estática

---

## Siguiente Fase

Continuar con [Fase 7: Networking y Seguridad](./07-AZURE-NETWORKING-SECURITY.md)

En la Fase 7 configurarás:
- Dominio personalizado
- SSL/TLS con Let's Encrypt
- Network Policies
- Monitoreo con Azure Monitor
