# 🚀 Fase 6: Despliegue de Microservicios en AKS

> **Tiempo estimado**: 30 minutos  
> **Prerequisitos**: Fases 1-5 completadas

---

## 📋 Objetivos de esta Fase

Al finalizar esta fase, tendrás:

- ✅ Eureka Server desplegado en AKS
- ✅ Archivo `values-azure.yaml` configurado para producción
- ✅ 9 microservicios desplegados con Helm
- ✅ Secrets de producción configurados
- ✅ Init Containers ejecutando migraciones automáticamente
- ✅ Todos los servicios registrados en Eureka
- ✅ API Gateway accesible públicamente

---

## 1. Crear Archivo de Valores para Azure

Crea el archivo `deploy/azure/values-azure.yaml`:

```yaml
# ==============================================
# VALUES PARA AZURE AKS - PRODUCCIÓN
# ==============================================

# Global configuration
global:
  imageRegistry: ""
  imagePullSecrets: []
  storageClass: "managed-csi"
  imageTag: "latest"  # Cambiar a tu versión específica: v1.0.0
  nodeEnv: "production"

# Image registry configuration (GHCR - GitHub Container Registry)
imageRegistry:
  url: "ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system"
  # ⚠️ NOTA: No necesitas username/password porque las imágenes son públicas

# PostgreSQL Configuration - Azure Database for PostgreSQL Flexible Server
# Configuración actual: GeneralPurpose tier, Standard_D4ads_v5, PostgreSQL 17
postgresql:
  enabled: false
  external:
    enabled: true
    hosts:
      auth: "fuel-system-postgres.postgres.database.azure.com"
      driver: "fuel-system-postgres.postgres.database.azure.com"
      users: "fuel-system-postgres.postgres.database.azure.com"
      vehicles: "fuel-system-postgres.postgres.database.azure.com"
      vehiclesShadow: "fuel-system-postgres.postgres.database.azure.com"
      routes: "fuel-system-postgres.postgres.database.azure.com"
    # Read replica para optimizar consultas SELECT
    readHosts:
      auth: "fuel-system-postgres-read.postgres.database.azure.com"
      driver: "fuel-system-postgres-read.postgres.database.azure.com"
      users: "fuel-system-postgres-read.postgres.database.azure.com"
      vehicles: "fuel-system-postgres-read.postgres.database.azure.com"
      routes: "fuel-system-postgres-read.postgres.database.azure.com"
    port: 5432
    username: "pgadmin"
    password: "FuelSystem2024@Secure"  # ⚠️ Se sobreescribe con secret
    sslMode: "require"  # IMPORTANTE: En Azure es obligatorio
    databases:
      auth: "auth_db"
      driver: "driver_db"
      users: "users_db"
      vehicles: "vehicles_db"
      vehiclesShadow: "vehicles_shadow_db"
      routes: "routes_db"

# RabbitMQ Configuration - Desplegado en AKS
rabbitmq:
  enabled: false
  external:
    enabled: true
    host: "rabbitmq.fuel-system.svc.cluster.local"
    port: 5672
    username: "admin"
    password: "FuelRabbit2024!Secure"  # ⚠️ Se sobreescribe con secret
    managementPort: 15672

# Elasticsearch Configuration - Desplegado en AKS
elasticsearch:
  enabled: false
  external:
    enabled: true
    host: "elasticsearch-master.fuel-system.svc.cluster.local"
    port: 9200
    scheme: "http"

# Eureka Server - Desplegado manualmente
eurekaServer:
  enabled: false
  external:
    enabled: true
    host: "eureka-server"
    port: 8761
    url: "http://eureka-server:8761/eureka"

# ==============================================
# SECRETS CONFIGURATION
# ==============================================
secrets:
  postgresql:
    username: "pgadmin"
    password: "FuelSystem2024@Secure"  # ⚠️ CAMBIAR en producción o usar Azure Key Vault
  rabbitmq:
    username: "admin"
    password: "FuelRabbit2024!Secure"  # ⚠️ CAMBIAR en producción
  jwt:
    secret: "your-super-secret-jwt-key-change-in-production-32chars-min"  # ⚠️ CAMBIAR
  smtp:
    host: "smtp.gmail.com"
    port: 587
    user: "tu-email@gmail.com"  # ⚠️ CAMBIAR
    password: "tu-app-password"  # ⚠️ CAMBIAR

# ==============================================
# API GATEWAY
# ==============================================
apiGateway:
  enabled: true
  replicaCount: 2
  image:
    repository: "api-gateway"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP  # Usamos Ingress para exposición
    port: 8080
    targetPort: 8080
  env:
    NODE_ENV: "production"
    PORT: "8080"
    GATEWAY_HTTP_PORT: "8080"
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80

# ==============================================
# AUTH SERVICE
# ==============================================
authService:
  enabled: true
  replicaCount: 2
  image:
    repository: "auth-svc"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP
    port: 50052
    targetPort: 50052
  env:
    NODE_ENV: "production"
    GRPC_PORT: "50052"
    AUTH_GRPC_PORT: "50052"
    DB_NAME: "auth_db"
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70

# ==============================================
# DRIVER SERVICE
# ==============================================
driverService:
  enabled: true
  replicaCount: 2
  image:
    repository: "driver-ms"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP
    port: 50062
    targetPort: 50062
  env:
    NODE_ENV: "production"
    GRPC_PORT: "50062"
    DRIVER_GRPC_PORT: "50062"
    DRIVER_HTTP_PORT: "3100"
    DB_NAME: "driver_db"
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70

# ==============================================
# USERS SERVICE
# ==============================================
usersService:
  enabled: true
  replicaCount: 2
  image:
    repository: "users-srv"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP
    port: 50057
    targetPort: 50057
  env:
    NODE_ENV: "production"
    GRPC_PORT: "50057"
    USERS_GRPC_PORT: "50057"
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70

# ==============================================
# VEHICLES SERVICE
# ==============================================
vehiclesService:
  enabled: true
  replicaCount: 2
  image:
    repository: "vehicles-svc"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP
    port: 50055
    targetPort: 50055
  env:
    NODE_ENV: "production"
    GRPC_PORT: "50055"
    VEHICLES_GRPC_PORT: "50055"
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70

# ==============================================
# ROUTES SERVICE
# ==============================================
routesService:
  enabled: true
  replicaCount: 2
  image:
    repository: "routes-srv"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP
    port: 50056
    targetPort: 50056
  env:
    NODE_ENV: "production"
    GRPC_PORT: "50056"
    ROUTES_GRPC_PORT: "50056"
    DB_NAME: "routes_db"
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70

# ==============================================
# FUEL SERVICE
# ==============================================
fuelService:
  enabled: true
  replicaCount: 2
  image:
    repository: "fuel-svc"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP
    port: 50054
    targetPort: 50054
  env:
    NODE_ENV: "production"
    GRPC_PORT: "50054"
    FUEL_GRPC_PORT: "50054"
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "250m"
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70

# ==============================================
# EMAIL SERVICE
# ==============================================
emailService:
  enabled: true
  replicaCount: 2
  image:
    repository: "email-svc"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP
    port: 50053
    targetPort: 50053
  env:
    NODE_ENV: "production"
    GRPC_PORT: "50053"
    EMAIL_GRPC_PORT: "50053"
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "250m"
  autoscaling:
    enabled: false  # Email no necesita autoscaling agresivo

# ==============================================
# LOGGER SERVICE
# ==============================================
loggerService:
  enabled: true
  replicaCount: 2
  image:
    repository: "logger-svc"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP
    port: 50058
    targetPort: 50058
  env:
    NODE_ENV: "production"
    GRPC_PORT: "50058"
    LOGGER_GRPC_PORT: "50058"
    LOGGER_HTTP_PORT: "3200"
  resources:
    requests:
      memory: "256Mi"
      cpu: "200m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: false

# ==============================================
# PUBLISHER SERVICE
# ==============================================
publisherService:
  enabled: true
  replicaCount: 1
  image:
    repository: "publisher-rabbit-srv"
    tag: "latest"
    pullPolicy: Always
  service:
    type: ClusterIP
    port: 4100
    targetPort: 4100
  env:
    NODE_ENV: "production"
    PORT: "4100"
    OUTBOX_PUBLISHER_PORT: "4100"
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "250m"
  autoscaling:
    enabled: false

# ==============================================
# INGRESS CONFIGURATION
# ==============================================
ingress:
  enabled: true
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
  hosts:
    - host: ""  # Sin host = acceso por IP
      paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: api-gateway
              port: 8080
  tls: []  # Configurar en Fase 7 con cert-manager
```

---

## 2. Desplegar Eureka Server

Crea `deploy/azure/eureka-deployment-azure.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eureka-server
  namespace: fuel-system
  labels:
    app: eureka-server
spec:
  replicas: 2
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
        env:
        - name: JAVA_OPTS
          value: "-Xms512m -Xmx1024m"
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
          initialDelaySeconds: 45
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
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: eureka-server
  namespace: fuel-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: eureka-server
  minReplicas: 2
  maxReplicas: 4
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Desplegar Eureka

```bash
# Aplicar el deployment
kubectl apply -f deploy/azure/eureka-deployment-azure.yaml

# Verificar
kubectl get pods -n fuel-system -l app=eureka-server

# Ver logs
kubectl logs -f deployment/eureka-server -n fuel-system

# Esperar a que esté Ready (puede tardar 1-2 minutos)
kubectl wait --for=condition=ready pod -l app=eureka-server -n fuel-system --timeout=180s
```

---

## 3. Actualizar Secrets con Valores de Producción

### Opción A: Actualizar values-azure.yaml (No Recomendado)

Edita directamente el archivo `values-azure.yaml` con tus credenciales reales.

### Opción B: Crear Secrets Manualmente (Recomendado)

```bash
# PostgreSQL
kubectl create secret generic fuel-system-postgresql \
  --from-literal=username=pgadmin \
  --from-literal=password='FuelSystem2024!Secure' \
  --namespace=fuel-system \
  --dry-run=client -o yaml | kubectl apply -f -

# RabbitMQ
kubectl create secret generic fuel-system-rabbitmq \
  --from-literal=username=admin \
  --from-literal=password='FuelRabbit2024!Secure' \
  --namespace=fuel-system \
  --dry-run=client -o yaml | kubectl apply -f -

# JWT
JWT_SECRET=$(openssl rand -base64 32)
kubectl create secret generic fuel-system-jwt \
  --from-literal=secret="$JWT_SECRET" \
  --namespace=fuel-system \
  --dry-run=client -o yaml | kubectl apply -f -

# SMTP
kubectl create secret generic fuel-system-smtp \
  --from-literal=host='smtp.gmail.com' \
  --from-literal=port='587' \
  --from-literal=user='tu-email@gmail.com' \
  --from-literal=password='tu-app-password' \
  --namespace=fuel-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Verificar secrets
kubectl get secrets -n fuel-system
```

---

## 4. Desplegar Microservicios con Helm

```bash
# Ir a la carpeta del chart
cd deploy/helm/fuel-system

# Dry-run para verificar configuración
helm install fuel-system . \
  --namespace fuel-system \
  --values values.yaml \
  --values ../../azure/values-azure.yaml \
  --dry-run --debug

# Si todo se ve bien, instalar
helm install fuel-system . \
  --namespace fuel-system \
  --values values.yaml \
  --values ../../azure/values-azure.yaml \
  --wait \
  --timeout 15m

# Ver el progreso
kubectl get pods -n fuel-system -w
```

**Nota**: El despliegue puede tardar 10-15 minutos debido a:
- Init Containers ejecutando migraciones
- Pull de imágenes desde ACR
- Health checks esperando a que los servicios estén listos

---

## 5. Verificar Despliegue

### Ver Todos los Pods

```bash
# Ver estado de todos los pods
kubectl get pods -n fuel-system

# Output esperado (todos en Running):
# NAME                                    READY   STATUS    RESTARTS   AGE
# eureka-server-xxx-xxx                   1/1     Running   0          5m
# fuel-system-api-gateway-xxx-xxx         1/1     Running   0          3m
# fuel-system-auth-service-xxx-xxx        1/1     Running   0          3m
# fuel-system-driver-service-xxx-xxx      1/1     Running   0          3m
# fuel-system-users-service-xxx-xxx       1/1     Running   0          3m
# fuel-system-vehicles-service-xxx-xxx    1/1     Running   0          3m
# fuel-system-routes-service-xxx-xxx      1/1     Running   0          3m
# fuel-system-fuel-service-xxx-xxx        1/1     Running   0          3m
# fuel-system-email-service-xxx-xxx       1/1     Running   0          3m
# fuel-system-logger-service-xxx-xxx      1/1     Running   0          3m
# rabbitmq-0                              1/1     Running   0          20m
# rabbitmq-1                              1/1     Running   0          19m
# rabbitmq-2                              1/1     Running   0          18m
# elasticsearch-master-0                  1/1     Running   0          15m
# elasticsearch-master-1                  1/1     Running   0          14m
# elasticsearch-master-2                  1/1     Running   0          13m
```

### Ver Logs de Init Containers (Migraciones)

```bash
# Ver logs del init container de driver-service
kubectl logs fuel-system-driver-service-xxx-xxx -c typeorm-migrate -n fuel-system

# Ver logs del init container de users-service
kubectl logs fuel-system-users-service-xxx-xxx -c prisma-migrate -n fuel-system

# Ver logs del init container de vehicles-service
kubectl logs fuel-system-vehicles-service-xxx-xxx -c prisma-migrate -n fuel-system
```

### Verificar Eureka Dashboard

```bash
# Port-forward a Eureka
kubectl port-forward svc/eureka-server -n fuel-system 8761:8761

# Abrir en navegador: http://localhost:8761
# Deberías ver todos los microservicios registrados
```

---

## 6. Verificar Conectividad

### Test API Gateway

```bash
# Obtener IP del Ingress
INGRESS_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Ingress IP: $INGRESS_IP"

# Test health endpoint
curl http://$INGRESS_IP/health

# Test login
curl -X POST http://$INGRESS_IP/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice_admin","password":"admin123"}'

# Debería devolver un token JWT
```

---

## 7. Script de Despliegue Completo

Guarda como `deploy/azure/deploy-to-azure.ps1`:

```powershell
# Variables
$NAMESPACE = "fuel-system"
$CHART_PATH = "deploy/helm/fuel-system"

Write-Host "🚀 Desplegando Fuel System a Azure AKS..." -ForegroundColor Cyan

# 1. Verificar contexto
Write-Host "`n1. Verificando contexto de kubectl..." -ForegroundColor Yellow
$currentContext = kubectl config current-context
Write-Host "Context actual: $currentContext" -ForegroundColor Gray

# 2. Crear namespace si no existe
Write-Host "`n2. Verificando namespace..." -ForegroundColor Yellow
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 3. Desplegar Eureka
Write-Host "`n3. Desplegando Eureka Server..." -ForegroundColor Yellow
kubectl apply -f deploy/azure/eureka-deployment-azure.yaml
kubectl wait --for=condition=ready pod -l app=eureka-server -n $NAMESPACE --timeout=180s

# 4. Crear secrets
Write-Host "`n4. Creando secrets..." -ForegroundColor Yellow
# (Aquí irían los comandos de creación de secrets)

# 5. Desplegar con Helm
Write-Host "`n5. Desplegando microservicios con Helm..." -ForegroundColor Yellow
helm upgrade --install fuel-system $CHART_PATH `
  --namespace $NAMESPACE `
  --values $CHART_PATH/values.yaml `
  --values deploy/azure/values-azure.yaml `
  --wait `
  --timeout 15m

# 6. Verificar despliegue
Write-Host "`n6. Verificando despliegue..." -ForegroundColor Yellow
kubectl get pods -n $NAMESPACE

# 7. Obtener IP del Ingress
Write-Host "`n7. Obteniendo IP pública..." -ForegroundColor Yellow
$INGRESS_IP = kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

Write-Host "`n✅ Despliegue completado!" -ForegroundColor Green
Write-Host "`nAcceso al sistema:" -ForegroundColor Cyan
Write-Host "API Gateway: http://$INGRESS_IP"
Write-Host "Eureka Dashboard: http://$INGRESS_IP/eureka"
Write-Host "`nPara ver logs:" -ForegroundColor Yellow
Write-Host "kubectl logs -f deployment/fuel-system-api-gateway -n $NAMESPACE"
```

---

## 8. Troubleshooting

### Pods en CrashLoopBackOff

```bash
# Ver logs del pod
kubectl logs <pod-name> -n fuel-system

# Ver logs del contenedor anterior (si crasheó)
kubectl logs <pod-name> -n fuel-system --previous

# Ver eventos
kubectl describe pod <pod-name> -n fuel-system
```

### Init Container falla

```bash
# Ver logs del init container
kubectl logs <pod-name> -c <init-container-name> -n fuel-system

# Ejemplos:
kubectl logs fuel-system-driver-service-xxx -c typeorm-migrate -n fuel-system
kubectl logs fuel-system-users-service-xxx -c prisma-migrate -n fuel-system
```

### Servicios no se registran en Eureka

```bash
# Verificar variables de entorno
kubectl exec <pod-name> -n fuel-system -- env | grep EUREKA

# Verificar que Eureka está accesible
kubectl exec <pod-name> -n fuel-system -- curl http://eureka-server:8761
```

---

## ✅ Fase 6 Completada

Si llegaste hasta aquí, ¡felicitaciones! Tienes:

- ✅ Eureka Server funcionando con 2 réplicas
- ✅ 9 microservicios desplegados y funcionando
- ✅ Migraciones ejecutadas automáticamente
- ✅ Todos los servicios registrados en Eureka
- ✅ API Gateway accesible públicamente
- ✅ Sistema funcional end-to-end

---

## 📍 Próximo Paso

Continúa con: **[Fase 7: Networking y Seguridad](./07-AZURE-NETWORKING-SECURITY.md)**

En la Fase 7 configurarás:
- Dominio personalizado
- SSL/TLS con Let's Encrypt
- Network Policies
- Azure Monitor
- Alertas y logging avanzado

---

**¡Excelente trabajo! El sistema está funcionando en producción! 🎉**
