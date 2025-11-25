# Fase 3: Creación del Cluster AKS

> **Tiempo estimado**: 30 minutos  
> **Prerequisitos**: Fase 1 y 2 completadas

---

## Objetivos de esta Fase

Al finalizar esta fase, tendrás:

- Cluster de Azure Kubernetes Service (AKS) creado
- NGINX Ingress Controller instalado
- Load Balancer público configurado
- Horizontal Pod Autoscaler (HPA) habilitado
- Cluster Autoscaler configurado
- Integración con GHCR (GitHub Container Registry)

> **Nota**: Este proyecto utiliza GHCR (GitHub Container Registry) con imágenes públicas, eliminando la necesidad de Azure Container Registry (ACR).

---

## 1. Variables de Entorno

### Windows PowerShell

```powershell
# Variables de fases anteriores
$RESOURCE_GROUP = "fuel-system-rg"
$LOCATION = "northcentralus"

# Variables para AKS
$AKS_NAME = "fuel-system-aks"
$KUBERNETES_VERSION = "1.33.2"

# Configuración de Desarrollo
$AKS_NODE_COUNT_DEV = 1
$AKS_NODE_SIZE_DEV = "Standard_B2as_v2"  # 2 vCPU, 4GB RAM
$AKS_MIN_NODES_DEV = 1
$AKS_MAX_NODES_DEV = 2

# Configuración de Producción
$AKS_NODE_COUNT_PROD = 3
$AKS_NODE_SIZE_PROD = "Standard_D2s_v3"  # 2 vCPU, 8GB RAM
$AKS_MIN_NODES_PROD = 3
$AKS_MAX_NODES_PROD = 10

# Seleccionar ambiente (desarrollo o producción)
$ENVIRONMENT = "desarrollo"  # Cambiar a "produccion" según necesidad

if ($ENVIRONMENT -eq "desarrollo") {
    $AKS_NODE_COUNT = $AKS_NODE_COUNT_DEV
    $AKS_NODE_SIZE = $AKS_NODE_SIZE_DEV
    $AKS_MIN_NODES = $AKS_MIN_NODES_DEV
    $AKS_MAX_NODES = $AKS_MAX_NODES_DEV
} else {
    $AKS_NODE_COUNT = $AKS_NODE_COUNT_PROD
    $AKS_NODE_SIZE = $AKS_NODE_SIZE_PROD
    $AKS_MIN_NODES = $AKS_MIN_NODES_PROD
    $AKS_MAX_NODES = $AKS_MAX_NODES_PROD
}

Write-Host "Configuración AKS - Ambiente: $ENVIRONMENT"
Write-Host "Cluster: $AKS_NAME"
Write-Host "Nodos: $AKS_NODE_COUNT (inicial)"
Write-Host "Autoscaling: $AKS_MIN_NODES - $AKS_MAX_NODES nodos"
Write-Host "Tamaño de nodo: $AKS_NODE_SIZE"
Write-Host "Versión K8s: $KUBERNETES_VERSION"
```

### Linux/macOS (Bash)

```bash
# Variables de fases anteriores
export RESOURCE_GROUP="fuel-system-rg"
export LOCATION="northcentralus"

# Variables para AKS
export AKS_NAME="fuel-system-aks"
export KUBERNETES_VERSION="1.33.2"

# Configuración de Desarrollo
export AKS_NODE_COUNT_DEV=1
export AKS_NODE_SIZE_DEV="Standard_B2as_v2"
export AKS_MIN_NODES_DEV=1
export AKS_MAX_NODES_DEV=2

# Configuración de Producción
export AKS_NODE_COUNT_PROD=3
export AKS_NODE_SIZE_PROD="Standard_D2s_v3"
export AKS_MIN_NODES_PROD=3
export AKS_MAX_NODES_PROD=10

# Seleccionar ambiente
export ENVIRONMENT="desarrollo"  # Cambiar a "produccion" según necesidad

if [ "$ENVIRONMENT" = "desarrollo" ]; then
    export AKS_NODE_COUNT=$AKS_NODE_COUNT_DEV
    export AKS_NODE_SIZE=$AKS_NODE_SIZE_DEV
    export AKS_MIN_NODES=$AKS_MIN_NODES_DEV
    export AKS_MAX_NODES=$AKS_MAX_NODES_DEV
else
    export AKS_NODE_COUNT=$AKS_NODE_COUNT_PROD
    export AKS_NODE_SIZE=$AKS_NODE_SIZE_PROD
    export AKS_MIN_NODES=$AKS_MIN_NODES_PROD
    export AKS_MAX_NODES=$AKS_MAX_NODES_PROD
fi

echo "Configuración AKS - Ambiente: $ENVIRONMENT"
echo "Cluster: $AKS_NAME"
echo "Nodos: $AKS_NODE_COUNT (inicial)"
echo "Autoscaling: $AKS_MIN_NODES - $AKS_MAX_NODES nodos"
echo "Tamaño de nodo: $AKS_NODE_SIZE"
```

---

## 2. Comparación de Configuraciones

### Ambiente de Desarrollo

| Recurso | Especificación | Propósito |
|---------|----------------|-----------|
| Nodos iniciales | 1 | Recursos mínimos para testing |
| Autoscaling | 1-2 nodos | Escalado limitado |
| Tamaño VM | Standard_B2s (2 vCPU, 4GB RAM) | Tamaño básico |
| Network Plugin | kubenet | Plugin de red económico |
| Monitoring | Deshabilitado | Reducir overhead |

### Ambiente de Producción

| Recurso | Especificación | Propósito |
|---------|----------------|-----------|
| Nodos iniciales | 3 | Alta disponibilidad |
| Autoscaling | 3-10 nodos | Escalado robusto |
| Tamaño VM | Standard_D2s_v3 (2 vCPU, 8GB RAM) | Tamaño estándar |
| Network Plugin | azure | Plugin de red avanzado |
| Monitoring | Habilitado | Observabilidad completa |

---

## 3. Verificar Disponibilidad de Recursos

### Verificar versiones de Kubernetes

```bash
# Ver versiones disponibles en la región
az aks get-versions --location $LOCATION --output table

# Verificar disponibilidad de versión específica
az aks get-versions --location $LOCATION --query "orchestrators[?orchestratorVersion=='1.33.2']" --output table
```

### Verificar tamaños de VM disponibles

```bash
# Ver todos los tamaños disponibles
az vm list-sizes --location $LOCATION --output table

# Filtrar serie B (Burstable)
az vm list-sizes --location $LOCATION --query "[?starts_with(name, 'Standard_B')]" --output table

# Filtrar serie D
az vm list-sizes --location $LOCATION --query "[?starts_with(name, 'Standard_D')]" --output table

# Verificar cuotas disponibles
az vm list-usage --location $LOCATION --output table
```

### Tamaños de VM recomendados

| Serie | Tamaño | vCPU | RAM | Uso Recomendado |
|-------|--------|------|-----|-----------------|
| B | Standard_B2s | 2 | 4 GB | Desarrollo, cargas ligeras |
| B | Standard_B2ms | 2 | 8 GB | Desarrollo, cargas moderadas |
| D | Standard_D2s_v3 | 2 | 8 GB | Producción, uso general |
| D | Standard_D4s_v3 | 4 | 16 GB | Producción, cargas intensivas |

---

## 4. Crear el Cluster AKS

### Configuración de Desarrollo

```bash
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --location $LOCATION \
  --node-count 1 \
  --node-vm-size Standard_B2ms \
  --kubernetes-version 1.33.2 \
  --enable-managed-identity \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 2 \
  --network-plugin kubenet \
  --generate-ssh-keys \
  --no-wait
```

**Características:**
- Network plugin: kubenet (overhead reducido)
- Sin addons de monitoring
- Autoscaling limitado (1-2 nodos)
- Tiempo de creación: 10-15 minutos

### Configuración de Producción

```bash
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --location $LOCATION \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --kubernetes-version 1.33.2 \
  --enable-managed-identity \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --network-plugin azure \
  --network-policy azure \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --no-wait
```

**Características:**
- Network plugin: azure (funcionalidad completa)
- Monitoring habilitado
- Autoscaling robusto (3-10 nodos)
- Network policies habilitadas
- Tiempo de creación: 15-20 minutos

### Configuración con Alta Disponibilidad (Producción Avanzada)

```bash
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --location $LOCATION \
  --node-count 5 \
  --node-vm-size Standard_D4s_v3 \
  --kubernetes-version 1.33.2 \
  --enable-managed-identity \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 15 \
  --network-plugin azure \
  --network-policy azure \
  --zones 1 2 3 \
  --enable-addons monitoring \
  --load-balancer-sku standard \
  --uptime-sla \
  --generate-ssh-keys \
  --no-wait
```

**Características adicionales:**
- Distribución en múltiples zonas de disponibilidad
- SLA de uptime garantizado
- Load Balancer estándar
- Escalado más agresivo

### Monitorear creación del cluster

```bash
# Verificar estado
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query "provisioningState" \
  -o tsv

# Esperar hasta completar (bloqueante)
az aks wait \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --created \
  --interval 30 \
  --timeout 1200
```

---

## 5. Configurar Acceso al Cluster

```bash
# Obtener credenciales
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --overwrite-existing

# Verificar conectividad
kubectl cluster-info

# Ver nodos
kubectl get nodes -o wide

# Verificar versión
kubectl version --short
```

**Salida esperada:**

```
NAME                                STATUS   ROLES   AGE   VERSION
aks-nodepool1-12345678-vmss000000   Ready    agent   5m    v1.33.2
aks-nodepool1-12345678-vmss000001   Ready    agent   5m    v1.33.2
```

---

## 6. Verificar Integración con GHCR

### Verificar acceso a imágenes públicas

```bash
# Test de pull desde GHCR
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest

# Verificar imagen
docker inspect ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
```

### Test desde el cluster

```bash
# Crear pod de prueba
kubectl run test-ghcr \
  --image=ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest \
  --namespace=default \
  --command -- sleep 3600

# Verificar pull exitoso
kubectl get pod test-ghcr
kubectl describe pod test-ghcr

# Limpiar
kubectl delete pod test-ghcr
```

**Ventajas de GHCR:**
- Sin autenticación para imágenes públicas
- Sin costos de registry
- Integración nativa con GitHub Actions
- Bandwidth ilimitado

---

## 7. Crear Namespace

```bash
# Crear namespace para el sistema
kubectl create namespace fuel-system

# Configurar como namespace predeterminado
kubectl config set-context --current --namespace=fuel-system

# Verificar namespaces
kubectl get namespaces
```

---

## 8. Instalar NGINX Ingress Controller

### Agregar repositorio Helm

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm search repo ingress-nginx
```

### Instalación para Desarrollo

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=1 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set controller.resources.requests.cpu=50m \
  --set controller.resources.requests.memory=64Mi \
  --set controller.resources.limits.cpu=200m \
  --set controller.resources.limits.memory=256Mi

# Esperar a que esté disponible
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s
```

### Instalación para Producción

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz \
  --set controller.resources.requests.cpu=100m \
  --set controller.resources.requests.memory=128Mi \
  --set controller.resources.limits.cpu=500m \
  --set controller.resources.limits.memory=512Mi \
  --set controller.autoscaling.enabled=true \
  --set controller.autoscaling.minReplicas=2 \
  --set controller.autoscaling.maxReplicas=5

# Esperar a que esté disponible
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s
```

### Verificar instalación

```bash
# Ver pods
kubectl get pods -n ingress-nginx

# Ver servicio y obtener IP pública
kubectl get service ingress-nginx-controller -n ingress-nginx

# Extraer IP pública
INGRESS_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Ingress Public IP: $INGRESS_IP"
```

---

## 9. Configurar Metrics Server

```bash
# Instalar Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verificar instalación
kubectl get deployment metrics-server -n kube-system

# Esperar a que esté disponible
kubectl wait --for=condition=available deployment/metrics-server -n kube-system --timeout=120s

# Verificar métricas (esperar 1-2 minutos)
kubectl top nodes
kubectl top pods -n fuel-system
```

---

## 10. Verificar Cluster Autoscaler

```bash
# Ver configuración de autoscaling
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query "agentPoolProfiles[0].{name:name,count:count,minCount:minCount,maxCount:maxCount,enableAutoScaling:enableAutoScaling}" \
  --output table

# Ver logs del cluster autoscaler
kubectl logs -n kube-system -l app=cluster-autoscaler --tail=50
```

---

## 11. Configurar Priority Classes

```bash
# Crear priority classes para gestión de recursos
cat <<EOF | kubectl apply -f -
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000
globalDefault: false
description: "High priority for critical services"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: medium-priority
value: 500
globalDefault: true
description: "Medium priority for standard services"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: false
description: "Low priority for non-critical services"
EOF

# Verificar
kubectl get priorityclasses
```

---

## 12. Configurar Resource Quotas (Opcional)

```bash
# Establecer límites de recursos en namespace
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: fuel-system-quota
  namespace: fuel-system
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    persistentvolumeclaims: "20"
    services.loadbalancers: "3"
EOF

# Verificar
kubectl describe resourcequota fuel-system-quota -n fuel-system
```

---

## 13. Asignar IP Estática (Producción)

```bash
# Obtener resource group de nodos
NODE_RESOURCE_GROUP=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query nodeResourceGroup -o tsv)

# Obtener nombre de IP pública
PUBLIC_IP_NAME=$(az network public-ip list \
  --resource-group $NODE_RESOURCE_GROUP \
  --query "[?contains(name, 'kubernetes')].name" -o tsv)

# Hacer IP estática
az network public-ip update \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --allocation-method Static

# Asignar DNS label (opcional)
az network public-ip update \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --dns-name fuel-system-aks

# Verificar
az network public-ip show \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --query "{ip:ipAddress, fqdn:dnsSettings.fqdn}" -o table
```

---

## 14. Script de Configuración Automatizada

Crear archivo `setup-aks.ps1`:

```powershell
# Configuración AKS - Fuel System
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("desarrollo","produccion")]
    [string]$Environment
)

# Variables base
$RESOURCE_GROUP = "fuel-system-rg"
$LOCATION = "eastus"
$AKS_NAME = "fuel-system-aks"
$KUBERNETES_VERSION = "1.33.2"

# Configuración según ambiente
$config = @{
    desarrollo = @{
        NodeCount = 1
        NodeSize = "Standard_B2s"
        MinNodes = 1
        MaxNodes = 2
        NetworkPlugin = "kubenet"
        EnableMonitoring = $false
        ReplicaCount = 1
    }
    produccion = @{
        NodeCount = 3
        NodeSize = "Standard_D2s_v3"
        MinNodes = 3
        MaxNodes = 10
        NetworkPlugin = "azure"
        EnableMonitoring = $true
        ReplicaCount = 2
    }
}

$env_config = $config[$Environment]

Write-Host "Iniciando configuración AKS - Ambiente: $Environment"
Write-Host "Cluster: $AKS_NAME"
Write-Host "Nodos: $($env_config.NodeCount) (min: $($env_config.MinNodes), max: $($env_config.MaxNodes))"
Write-Host "Tamaño: $($env_config.NodeSize)"
Write-Host ""

# Verificar disponibilidad
Write-Host "Verificando disponibilidad de recursos..."
az vm list-sizes --location $LOCATION --query "[?name=='$($env_config.NodeSize)']" --output table

# Crear cluster
Write-Host "Creando cluster AKS..."
$createArgs = @(
    "aks", "create",
    "--resource-group", $RESOURCE_GROUP,
    "--name", $AKS_NAME,
    "--location", $LOCATION,
    "--node-count", $env_config.NodeCount,
    "--node-vm-size", $env_config.NodeSize,
    "--kubernetes-version", $KUBERNETES_VERSION,
    "--enable-managed-identity",
    "--enable-cluster-autoscaler",
    "--min-count", $env_config.MinNodes,
    "--max-count", $env_config.MaxNodes,
    "--network-plugin", $env_config.NetworkPlugin,
    "--generate-ssh-keys"
)

if ($env_config.EnableMonitoring) {
    $createArgs += "--enable-addons"
    $createArgs += "monitoring"
}

& az @createArgs --no-wait

Write-Host "Esperando a que el cluster esté listo..."
az aks wait --resource-group $RESOURCE_GROUP --name $AKS_NAME --created --interval 30 --timeout 1200

# Obtener credenciales
Write-Host "Configurando acceso al cluster..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME --overwrite-existing

# Verificar nodos
Write-Host "Verificando nodos..."
kubectl get nodes

# Crear namespace
Write-Host "Creando namespace fuel-system..."
kubectl create namespace fuel-system

# Instalar NGINX Ingress
Write-Host "Instalando NGINX Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx `
    --namespace ingress-nginx `
    --create-namespace `
    --set controller.replicaCount=$($env_config.ReplicaCount) `
    --set controller.nodeSelector."kubernetes\.io/os"=linux

kubectl wait --namespace ingress-nginx `
    --for=condition=ready pod `
    --selector=app.kubernetes.io/component=controller `
    --timeout=180s

# Instalar Metrics Server
Write-Host "Instalando Metrics Server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Configurar Priority Classes
Write-Host "Configurando Priority Classes..."
@"
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000
globalDefault: false
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: medium-priority
value: 500
globalDefault: true
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: false
"@ | kubectl apply -f -

# Obtener IP pública
Write-Host "Obteniendo IP pública del Load Balancer..."
Start-Sleep -Seconds 60

$INGRESS_IP = kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Resumen
Write-Host ""
Write-Host "========================================"
Write-Host "Configuración AKS Completada"
Write-Host "========================================"
Write-Host ""
Write-Host "Detalles del cluster:"
Write-Host "  Nombre: $AKS_NAME"
Write-Host "  Ambiente: $Environment"
Write-Host "  Nodos: $($env_config.NodeCount) (autoscaling: $($env_config.MinNodes)-$($env_config.MaxNodes))"
Write-Host "  Tamaño de nodo: $($env_config.NodeSize)"
Write-Host "  IP pública Ingress: $INGRESS_IP"
Write-Host "  Versión Kubernetes: $KUBERNETES_VERSION"
Write-Host ""
Write-Host "Próximos pasos:"
Write-Host "  1. Configurar DNS apuntando a: $INGRESS_IP"
Write-Host "  2. Continuar con Fase 4: RabbitMQ y Elasticsearch"
```

**Uso del script:**

```powershell
# Ambiente de desarrollo
.\setup-aks.ps1 -Environment desarrollo

# Ambiente de producción
.\setup-aks.ps1 -Environment produccion
```

---

## 15. Troubleshooting

### Error: Cuota insuficiente

```bash
# Verificar cuotas actuales
az vm list-usage --location $LOCATION --output table

# Solicitar aumento de cuota
# Azure Portal → Subscriptions → Usage + quotas → Request increase
```

### Error: SKU no disponible

```bash
# Verificar SKUs disponibles en la región
az vm list-skus --location $LOCATION --size Standard_B --output table
az vm list-skus --location $LOCATION --size Standard_D --output table

# Intentar con otra región
export LOCATION="westus"  # o westeurope, centralus
```

### Pods en estado Pending

```bash
# Verificar recursos de nodos
kubectl describe nodes

# Ver eventos del cluster
kubectl get events -n fuel-system --sort-by='.lastTimestamp'

# Verificar que autoscaler está funcionando
kubectl logs -n kube-system -l app=cluster-autoscaler
```

### Problemas con Ingress Controller

```bash
# Verificar pods del Ingress
kubectl get pods -n ingress-nginx

# Ver logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller

# Verificar servicio
kubectl describe service ingress-nginx-controller -n ingress-nginx
```

---

## 16. Ajustes según Ambiente

### Archivo values-azure.yaml para Desarrollo

```yaml
global:
  nodeEnv: "development"

apiGateway:
  replicaCount: 1
  resources:
    requests:
      memory: "128Mi"
      cpu: "50m"
    limits:
      memory: "256Mi"
      cpu: "200m"
  autoscaling:
    enabled: false

authService:
  replicaCount: 1
  autoscaling:
    enabled: false

# Aplicar mismo patrón para todos los servicios
```

### Archivo values-azure.yaml para Producción

```yaml
global:
  nodeEnv: "production"

apiGateway:
  replicaCount: 2
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

authService:
  replicaCount: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5

# Aplicar mismo patrón para todos los servicios
```

---

## 17. Estimación de Costos

### Configuración de Desarrollo

| Componente | Especificación | Costo Mensual (USD) |
|------------|----------------|---------------------|
| AKS Cluster | 1-2 nodos Standard_B2s | 30-60 |
| Load Balancer | Standard | 18 |
| Public IP | Estática | 3 |
| Egress (50GB) | Transferencia de datos | 4 |
| **Total** | | **55-85** |

### Configuración de Producción

| Componente | Especificación | Costo Mensual (USD) |
|------------|----------------|---------------------|
| AKS Cluster | 3-10 nodos Standard_D2s_v3 | 450-1500 |
| Load Balancer | Standard | 18 |
| Public IP | Estática | 3 |
| Monitoring | Azure Monitor | 30 |
| Egress (200GB) | Transferencia de datos | 16 |
| **Total** | | **517-1567** |

---

## Fase 3 Completada

Verificación de configuración exitosa:

- Cluster AKS creado y operacional
- Nodos en estado Ready
- NGINX Ingress Controller desplegado
- Metrics Server instalado
- Namespace fuel-system creado
- Priority Classes configuradas
- Autoscaling habilitado

**Tiempo total**: 30-45 minutos  
**Versión Kubernetes**: 1.33.2

---

## Próximo Paso

Continuar con: **[Fase 4: RabbitMQ y Elasticsearch](./04-AZURE-RABBITMQ-ELASTICSEARCH.md)**

---

**Documentación actualizada: Noviembre 18, 2025**
