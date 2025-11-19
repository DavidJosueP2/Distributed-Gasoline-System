# 🔐 Fase 7: Networking, Seguridad y Monitoreo

> **Tiempo estimado**: 45 minutos  
> **Prerequisitos**: Fases 1-6 completadas

---

## 📋 Objetivos de esta Fase

Al finalizar esta fase, tendrás:

- ✅ Dominio personalizado configurado (opcional)
- ✅ SSL/TLS con Let's Encrypt automático
- ✅ Network Policies para seguridad entre pods
- ✅ Azure Monitor integrado
- ✅ Application Insights configurado
- ✅ Alertas automáticas configuradas
- ✅ Logging centralizado funcional

---

## 1. Configurar Dominio Personalizado (Opcional pero Recomendado)

### Obtener IP Pública del Ingress

```bash
# Obtener la IP del Load Balancer
INGRESS_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "IP Pública: $INGRESS_IP"
```

### Configurar DNS

En tu proveedor de DNS (GoDaddy, Namecheap, Cloudflare, etc.):

```
# Registro A
@ → $INGRESS_IP
www → $INGRESS_IP

# O subdominios específicos
api.tudominio.com → $INGRESS_IP
fuel.tudominio.com → $INGRESS_IP
```

### Asignar IP Estática en Azure (Recomendado)

Por defecto, la IP del Load Balancer es dinámica. Para hacerla estática:

```bash
# Variables
RESOURCE_GROUP="fuel-system-rg"
AKS_NAME="fuel-system-aks"

# Obtener el Resource Group del cluster (el que Azure crea automáticamente)
NODE_RESOURCE_GROUP=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query nodeResourceGroup -o tsv)

echo "Node Resource Group: $NODE_RESOURCE_GROUP"

# Obtener el nombre de la IP pública
PUBLIC_IP_NAME=$(az network public-ip list \
  --resource-group $NODE_RESOURCE_GROUP \
  --query "[?contains(name, 'kubernetes')].name" -o tsv)

echo "Public IP Name: $PUBLIC_IP_NAME"

# Hacer la IP estática
az network public-ip update \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --allocation-method Static

# Asignar un DNS label (opcional)
az network public-ip update \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --dns-name fuel-system

# Verificar
az network public-ip show \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --query "{ip:ipAddress, fqdn:dnsSettings.fqdn}" -o table

# Output:
# ip              fqdn
# xx.xx.xx.xx     fuel-system.eastus.cloudapp.azure.com
```

---

## 2. Instalar cert-manager (si no lo hiciste en Fase 3)

```bash
# Instalar cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --set nodeSelector."kubernetes\.io/os"=linux

# Verificar instalación
kubectl get pods -n cert-manager

# Esperar a que todos estén Running
kubectl wait --for=condition=ready pod --all -n cert-manager --timeout=120s
```

---

## 3. Configurar Let's Encrypt con cert-manager

### Crear ClusterIssuer para Let's Encrypt

Crea `deploy/azure/letsencrypt-issuer.yaml`:

```yaml
# Issuer de staging (para testing)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: tu-email@gmail.com  # ⚠️ CAMBIAR por tu email
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
    - http01:
        ingress:
          class: nginx
---
# Issuer de producción
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: tu-email@gmail.com  # ⚠️ CAMBIAR por tu email
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

Aplicar:
```bash
kubectl apply -f deploy/azure/letsencrypt-issuer.yaml

# Verificar
kubectl get clusterissuer

# Output esperado:
# NAME                  READY   AGE
# letsencrypt-staging   True    10s
# letsencrypt-prod      True    10s
```

---

## 4. Actualizar Ingress con SSL/TLS

### Opción A: Con Dominio Propio

Crea `deploy/azure/ingress-ssl.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fuel-system-ingress-ssl
  namespace: fuel-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"  # Usar staging primero para testing
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.tudominio.com  # ⚠️ CAMBIAR por tu dominio
    secretName: fuel-system-tls
  rules:
  - host: api.tudominio.com  # ⚠️ CAMBIAR por tu dominio
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: fuel-system-api-gateway
            port:
              number: 8080
      - path: /eureka
        pathType: Prefix
        backend:
          service:
            name: eureka-server
            port:
              number: 8761
```

Aplicar:
```bash
kubectl apply -f deploy/azure/ingress-ssl.yaml

# Ver certificados (puede tardar 2-3 minutos)
kubectl get certificate -n fuel-system

# Ver el proceso de obtención del certificado
kubectl describe certificate fuel-system-tls -n fuel-system

# Ver challenges de ACME
kubectl get challenges -n fuel-system
```

### Opción B: Sin Dominio (Solo HTTP)

Si no tienes dominio, puedes usar solo HTTP con la IP pública:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fuel-system-ingress
  namespace: fuel-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  ingressClassName: nginx
  rules:
  - http:  # Sin host = acceso por IP
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: fuel-system-api-gateway
            port:
              number: 8080
```

---

## 5. Configurar Network Policies

### Habilitar Network Policies en AKS (si no está habilitado)

```bash
# Verificar si está habilitado
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query "networkProfile.networkPolicy"

# Si no está habilitado, necesitas recrear el cluster con:
# --network-policy azure
```

### Crear Network Policies

Crea `deploy/azure/network-policies.yaml`:

```yaml
# Política 1: Deny all por defecto
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: fuel-system
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Política 2: Permitir Ingress Controller → API Gateway
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-to-gateway
  namespace: fuel-system
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/component: api-gateway
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
---
# Política 3: Permitir API Gateway → Microservicios gRPC
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway-to-services
  namespace: fuel-system
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/part-of: fuel-system
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/component: api-gateway
    ports:
    - protocol: TCP
      port: 50051
    - protocol: TCP
      port: 50052
    - protocol: TCP
      port: 50053
    - protocol: TCP
      port: 50054
    - protocol: TCP
      port: 50055
    - protocol: TCP
      port: 50056
    - protocol: TCP
      port: 50057
    - protocol: TCP
      port: 50058
    - protocol: TCP
      port: 50062
---
# Política 4: Permitir microservicios → RabbitMQ
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-services-to-rabbitmq
  namespace: fuel-system
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: rabbitmq
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/part-of: fuel-system
    ports:
    - protocol: TCP
      port: 5672
---
# Política 5: Permitir microservicios → Elasticsearch
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-services-to-elasticsearch
  namespace: fuel-system
spec:
  podSelector:
    matchLabels:
      app: elasticsearch-master
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/part-of: fuel-system
    ports:
    - protocol: TCP
      port: 9200
---
# Política 6: Permitir todos los egress (necesario para conectar a PostgreSQL Azure)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all-egress
  namespace: fuel-system
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - {}
```

Aplicar:
```bash
kubectl apply -f deploy/azure/network-policies.yaml

# Verificar
kubectl get networkpolicies -n fuel-system
```

---

## 6. Configurar Azure Monitor

### Habilitar Container Insights (si no está habilitado)

```bash
# Habilitar monitoring addon
az aks enable-addons \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --addons monitoring

# Verificar
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query "addonProfiles.omsagent.enabled"
```

### Ver Métricas en Azure Portal

1. Ve a Azure Portal → Kubernetes services
2. Selecciona tu cluster `fuel-system-aks`
3. En el menú lateral: **Monitoring → Insights**
4. Explora:
   - **Cluster**: Uso de CPU/memoria del cluster
   - **Nodes**: Métricas por nodo
   - **Controllers**: Métricas por deployment/statefulset
   - **Containers**: Métricas por contenedor

---

## 7. Configurar Application Insights (Opcional)

### Crear Application Insights

```bash
# Crear Application Insights
az monitor app-insights component create \
  --app fuel-system-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Obtener Instrumentation Key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app fuel-system-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

echo "Instrumentation Key: $INSTRUMENTATION_KEY"
```

### Configurar en Microservicios

Agrega la variable de entorno en `values-azure.yaml`:

```yaml
# En cada servicio
env:
  APPINSIGHTS_INSTRUMENTATIONKEY: "tu-instrumentation-key"
```

Y en tu código Node.js:

```javascript
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectConsole(true)
  .start();
```

---

## 8. Configurar Alertas

### Alerta de CPU Alta

```bash
# Crear action group para notificaciones
az monitor action-group create \
  --name fuel-system-alerts \
  --resource-group $RESOURCE_GROUP \
  --short-name fsalerts \
  --email-receiver name=admin email=tu-email@gmail.com

# Alerta de CPU alta (>80%)
az monitor metrics alert create \
  --name "AKS-High-CPU" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerService/managedClusters/$AKS_NAME" \
  --condition "avg node_cpu_usage_percentage > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action fuel-system-alerts \
  --description "Alert when AKS CPU exceeds 80%"
```

### Alerta de Pods Fallando

```bash
# Alerta cuando hay pods en estado Failed
az monitor metrics alert create \
  --name "AKS-Failed-Pods" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerService/managedClusters/$AKS_NAME" \
  --condition "max kube_pod_status_phase{phase='Failed'} > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action fuel-system-alerts \
  --description "Alert when there are failed pods"
```

---

## 9. Configurar Log Analytics

### Ver Logs en Azure

1. Azure Portal → Kubernetes services → fuel-system-aks
2. Monitoring → Logs
3. Queries de ejemplo:

```kusto
// Ver logs de API Gateway
ContainerLog
| where ContainerName == "api-gateway"
| project TimeGenerated, LogEntry
| order by TimeGenerated desc

// Ver errores en todos los contenedores
ContainerLog
| where LogEntry contains "error" or LogEntry contains "ERROR"
| project TimeGenerated, ContainerName, LogEntry
| order by TimeGenerated desc

// Ver uso de CPU por pod
Perf
| where ObjectName == "K8SContainer"
| where CounterName == "cpuUsageNanoCores"
| summarize avg(CounterValue) by bin(TimeGenerated, 5m), InstanceName
| render timechart
```

---

## 10. Backup y Disaster Recovery

### Backup de PostgreSQL (Automático en Azure)

Azure PostgreSQL hace backups automáticos. Para restaurar:

```bash
# Restaurar a un punto específico
az postgres flexible-server restore \
  --resource-group $RESOURCE_GROUP \
  --name fuel-system-postgres-restored \
  --source-server fuel-system-postgres \
  --restore-time "2025-11-15T10:00:00Z"
```

### Backup de Configuración de Kubernetes

```bash
# Exportar todos los recursos de Kubernetes
kubectl get all -n fuel-system -o yaml > backup-fuel-system.yaml

# Exportar secrets (encriptados)
kubectl get secrets -n fuel-system -o yaml > backup-secrets.yaml

# Exportar configmaps
kubectl get configmaps -n fuel-system -o yaml > backup-configmaps.yaml
```

### Usar Velero para Backups Automáticos (Avanzado)

```bash
# Instalar Velero
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.provider=azure \
  --set configuration.backupStorageLocation.bucket=fuel-system-backups \
  --set configuration.backupStorageLocation.config.resourceGroup=$RESOURCE_GROUP

# Crear backup
velero backup create fuel-system-backup --include-namespaces fuel-system
```

---

## 11. Testing de Seguridad

### Escanear Vulnerabilidades con Trivy

```bash
# Instalar Trivy
choco install trivy

# Escanear una imagen
trivy image fuelsystemacr.azurecr.io/api-gateway:latest

# Escanear todas las imágenes en AKS
kubectl get pods -n fuel-system -o json | \
  jq -r '.items[].spec.containers[].image' | \
  sort -u | \
  xargs -I {} trivy image {}
```

---

## 12. Script de Configuración Final

Guarda como `deploy/azure/setup-production-security.ps1`:

```powershell
$RESOURCE_GROUP = "fuel-system-rg"
$AKS_NAME = "fuel-system-aks"
$LOCATION = "eastus"
$EMAIL = "tu-email@gmail.com"

Write-Host "🔐 Configurando seguridad y monitoreo..." -ForegroundColor Cyan

# 1. Hacer IP estática
Write-Host "`n1. Configurando IP estática..." -ForegroundColor Yellow
$NODE_RG = az aks show --resource-group $RESOURCE_GROUP --name $AKS_NAME --query nodeResourceGroup -o tsv
$PUBLIC_IP = az network public-ip list --resource-group $NODE_RG --query "[?contains(name, 'kubernetes')].name" -o tsv
az network public-ip update --resource-group $NODE_RG --name $PUBLIC_IP --allocation-method Static

# 2. Instalar cert-manager
Write-Host "`n2. Instalando cert-manager..." -ForegroundColor Yellow
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager `
  --namespace cert-manager `
  --create-namespace `
  --set installCRDs=true

# 3. Crear ClusterIssuers
Write-Host "`n3. Configurando Let's Encrypt..." -ForegroundColor Yellow
kubectl apply -f deploy/azure/letsencrypt-issuer.yaml

# 4. Habilitar Container Insights
Write-Host "`n4. Habilitando Azure Monitor..." -ForegroundColor Yellow
az aks enable-addons `
  --resource-group $RESOURCE_GROUP `
  --name $AKS_NAME `
  --addons monitoring

# 5. Crear Application Insights
Write-Host "`n5. Creando Application Insights..." -ForegroundColor Yellow
az monitor app-insights component create `
  --app fuel-system-insights `
  --location $LOCATION `
  --resource-group $RESOURCE_GROUP `
  --application-type web

Write-Host "`n✅ Configuración de seguridad completada!" -ForegroundColor Green
```

---

## ✅ Fase 7 y Guía Completa

¡Felicitaciones! Has completado toda la guía de despliegue a Azure. Ahora tienes:

### Sistema Completo en Producción ✅
- ✅ Cluster AKS con 3-5 nodos
- ✅ Azure Database for PostgreSQL (6 bases de datos)
- ✅ RabbitMQ Cluster (3 nodos)
- ✅ Elasticsearch Cluster (3 nodos)
- ✅ 9 microservicios desplegados y funcionando
- ✅ Eureka Server para service discovery
- ✅ NGINX Ingress Controller con Load Balancer
- ✅ SSL/TLS con Let's Encrypt (opcional)
- ✅ Network Policies para seguridad
- ✅ Azure Monitor integrado
- ✅ Alertas configuradas
- ✅ Logging centralizado

---

## 📊 Checklist Final

```bash
# Verificar todos los componentes
kubectl get all -n fuel-system
kubectl get ingress -n fuel-system
kubectl get certificate -n fuel-system
kubectl get networkpolicies -n fuel-system

# Verificar salud
curl http://<tu-ip-o-dominio>/health

# Verificar Eureka
# Abrir en navegador: http://<tu-ip-o-dominio>/eureka
```

---

## 🎉 ¡Sistema en Producción!

Tu sistema Fuel System está ahora **desplegado y funcionando en Azure** con:

- 🔒 **Seguridad**: SSL/TLS, Network Policies, Secrets
- 📊 **Monitoreo**: Azure Monitor, Application Insights, Alertas
- 🔄 **Alta Disponibilidad**: Múltiples réplicas, autoescalado
- 💾 **Persistencia**: Azure PostgreSQL con backups automáticos
- 🚀 **Rendimiento**: Load balancing, caching, optimización

---

**¡Excelente trabajo completando toda la guía! 🎊**

