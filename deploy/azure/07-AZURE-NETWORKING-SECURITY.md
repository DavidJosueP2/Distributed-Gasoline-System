# Fase 7: Networking, Seguridad y Monitoreo en Azure AKS

**Tiempo estimado**: 60 minutos  
**Prerequisitos**: Fases 1-6 completadas  
**Última actualización**: Noviembre 2025

---

## Objetivos de esta Fase

Al finalizar esta fase, el sistema contará con:

- Acceso público HTTPS configurado (con IP o DNS)
- SSL/TLS con certificados automáticos (Let's Encrypt)
- Network Security Groups (NSG) configurados correctamente
- Network Policies para seguridad entre pods
- Azure Monitor integrado para observabilidad
- Application Insights configurado (opcional)
- Sistema de alertas automáticas
- Logging centralizado funcional

---

## 1. Configuración de Acceso Público

### 1.1. Identificar la IP Pública del LoadBalancer

El sistema actual utiliza un LoadBalancer directo en el API Gateway (no Ingress Controller). Para obtener la IP pública:

```bash
# Obtener la IP pública del API Gateway
export API_GATEWAY_IP=$(kubectl get service fuel-system-api-gateway -n fuel-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "API Gateway IP: $API_GATEWAY_IP"
echo "URL de acceso: http://$API_GATEWAY_IP:8080"
```

### 1.2. Hacer la IP Estática (Recomendado)

Por defecto, Azure asigna IPs dinámicas a los LoadBalancers. Para convertirla en estática:

```bash
# Variables
export RESOURCE_GROUP="fuel-system-rg"
export AKS_NAME="fuel-system-aks"

# Obtener el Resource Group automático del cluster
export NODE_RESOURCE_GROUP=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query nodeResourceGroup -o tsv)

echo "Node Resource Group: $NODE_RESOURCE_GROUP"

# Obtener el nombre de la IP pública del API Gateway
export PUBLIC_IP_NAME=$(az network public-ip list \
  --resource-group $NODE_RESOURCE_GROUP \
  --query "[?ipAddress=='$API_GATEWAY_IP'].name" -o tsv)

echo "Public IP Name: $PUBLIC_IP_NAME"

# Convertir la IP a estática
az network public-ip update \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --allocation-method Static

# Verificar cambio
az network public-ip show \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --query "{IP:ipAddress, AllocationMethod:publicIPAllocationMethod, SKU:sku.name}" \
  -o table
```

**Nota**: Una vez estática, la IP permanecerá asignada al servicio incluso si se reinicia el pod o el servicio.

---

## 2. Configuración de Network Security Groups (NSG)

Azure AKS bloquea por defecto todo el tráfico entrante desde Internet. Es necesario configurar reglas NSG para permitir acceso público.

### 2.1. Obtener el NSG del Cluster

```bash
# Listar NSGs en el Resource Group del cluster
export NSG_NAME=$(az network nsg list \
  --resource-group $NODE_RESOURCE_GROUP \
  --query "[0].name" -o tsv)

echo "NSG Name: $NSG_NAME"
```

### 2.2. Configurar Reglas de Firewall para HTTP/HTTPS

```bash
# Obtener el NodePort del API Gateway (puerto HTTP)
export API_GATEWAY_NODEPORT=$(kubectl get svc fuel-system-api-gateway -n fuel-system \
  -o jsonpath='{.spec.ports[0].nodePort}')

echo "API Gateway NodePort: $API_GATEWAY_NODEPORT"

# Crear regla para permitir tráfico desde Azure Load Balancer
az network nsg rule create \
  --resource-group $NODE_RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name AllowAzureLoadBalancer \
  --priority 100 \
  --source-address-prefixes AzureLoadBalancer \
  --destination-port-ranges 30000-32767 \
  --access Allow \
  --protocol Tcp \
  --description "Allow Azure Load Balancer health checks to NodePorts"

# Crear regla para permitir tráfico HTTP desde Internet
az network nsg rule create \
  --resource-group $NODE_RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name AllowHTTPFromInternet \
  --priority 200 \
  --source-address-prefixes Internet \
  --destination-port-ranges $API_GATEWAY_NODEPORT \
  --access Allow \
  --protocol Tcp \
  --description "Allow HTTP traffic from Internet to API Gateway"

# Verificar reglas creadas
az network nsg rule list \
  --resource-group $NODE_RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --query "[?name=='AllowHTTPFromInternet' || name=='AllowAzureLoadBalancer'].{Name:name, Priority:priority, Source:sourceAddressPrefix, DestPort:destinationPortRanges, Access:access}" \
  -o table
```

### 2.3. Probar Conectividad

```bash
# Probar acceso al health endpoint
curl http://$API_GATEWAY_IP:8080/health

# Respuesta esperada:
# {"status":"ok","service":"api-gateway"}

# Probar autenticación
curl -X POST http://$API_GATEWAY_IP:8080/auth/log-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

---

## 3. Configuración HTTPS con Certificados SSL/TLS

### Opción A: HTTPS con IP Pública (Self-Signed Certificate)

**Escenario**: No se dispone de un dominio DNS.

#### 3.1. Generar Certificado Auto-Firmado

```bash
# Crear directorio para certificados
mkdir -p ~/certs

# Generar certificado auto-firmado
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ~/certs/tls.key \
  -out ~/certs/tls.crt \
  -subj "/CN=$API_GATEWAY_IP/O=FuelSystem"

# Crear secret en Kubernetes
kubectl create secret tls fuel-system-tls \
  --cert=~/certs/tls.crt \
  --key=~/certs/tls.key \
  -n fuel-system
```

#### 3.2. Configurar API Gateway para HTTPS

Esta configuración requiere modificar el deployment del API Gateway para exponer el puerto 443 y configurar el certificado. 

**Nota**: Con certificados auto-firmados, los navegadores mostrarán advertencias de seguridad. Esta opción es adecuada para desarrollo/testing.

---

### Opción B: HTTPS con Dominio DNS (Let's Encrypt)

**Escenario**: Se dispone de un dominio propio.

#### 3.1. Configurar DNS

En el proveedor de DNS (GoDaddy, Namecheap, Cloudflare, Route53, etc.), crear un registro A:

```
# Registro DNS tipo A
api.tudominio.com → <API_GATEWAY_IP>

# O subdominios adicionales
fuel-api.tudominio.com → <API_GATEWAY_IP>
*.tudominio.com → <API_GATEWAY_IP>  # Wildcard (opcional)
```

**Verificar propagación DNS**:

```bash
# Esperar 5-10 minutos para propagación
nslookup api.tudominio.com

# O usar herramientas online:
# https://www.whatsmydns.net/
```

#### 3.2. Asignar DNS Label a la IP Pública (Alternativa)

Azure permite asignar un FQDN automático sin necesidad de dominio propio:

```bash
# Asignar DNS label
az network public-ip update \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --dns-name fuel-system-api

# Verificar FQDN asignado
export API_FQDN=$(az network public-ip show \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --query dnsSettings.fqdn -o tsv)

echo "FQDN asignado: $API_FQDN"
# Ejemplo: fuel-system-api.northcentralus.cloudapp.azure.com
```

#### 3.3. Instalar cert-manager

cert-manager automatiza la obtención y renovación de certificados SSL/TLS de Let's Encrypt:

```bash
# Agregar repositorio de Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Instalar cert-manager con CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --set nodeSelector."kubernetes\.io/os"=linux

# Verificar instalación
kubectl get pods -n cert-manager

# Esperar a que todos los pods estén Running
kubectl wait --for=condition=ready pod --all -n cert-manager --timeout=120s
```

#### 3.4. Crear ClusterIssuer para Let's Encrypt

Crear archivo `deploy/azure/letsencrypt-issuers.yaml`:

```yaml
# ClusterIssuer de Staging (para pruebas)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@tudominio.com  # Cambiar por email real
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
    - http01:
        ingress:
          class: nginx
---
# ClusterIssuer de Producción
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@tudominio.com  # Cambiar por email real
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

Aplicar configuración:

```bash
kubectl apply -f deploy/azure/letsencrypt-issuers.yaml

# Verificar ClusterIssuers
kubectl get clusterissuer

# Output esperado:
# NAME                  READY   AGE
# letsencrypt-staging   True    10s
# letsencrypt-prod      True    10s
```

#### 3.5. Desplegar NGINX Ingress Controller

**Nota**: Actualmente el sistema usa LoadBalancer directo. Para usar HTTPS con Let's Encrypt, se requiere un Ingress Controller.

```bash
# Instalar NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz

# Obtener IP del Ingress
kubectl get svc ingress-nginx-controller -n ingress-nginx

# Esperar a que se asigne External IP (2-3 minutos)
kubectl wait --for=jsonpath='{.status.loadBalancer.ingress[0].ip}' \
  svc/ingress-nginx-controller -n ingress-nginx --timeout=300s

export INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Ingress IP: $INGRESS_IP"
```

**Importante**: Actualizar el registro DNS para apuntar al nuevo Ingress IP.

#### 3.6. Configurar NSG para Ingress Controller

```bash
# Obtener NodePorts del Ingress
export INGRESS_HTTP_PORT=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}')
export INGRESS_HTTPS_PORT=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.spec.ports[?(@.name=="https")].nodePort}')

echo "HTTP NodePort: $INGRESS_HTTP_PORT"
echo "HTTPS NodePort: $INGRESS_HTTPS_PORT"

# Crear regla NSG para Ingress
az network nsg rule create \
  --resource-group $NODE_RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name AllowIngressHTTPS \
  --priority 201 \
  --source-address-prefixes Internet \
  --destination-port-ranges $INGRESS_HTTP_PORT $INGRESS_HTTPS_PORT \
  --access Allow \
  --protocol Tcp \
  --description "Allow HTTP/HTTPS from Internet to Ingress Controller"
```

#### 3.7. Cambiar API Gateway a ClusterIP

Actualizar `values.yaml`:

```yaml
apiGateway:
  enabled: true
  replicaCount: 2
  service:
    type: ClusterIP  # Cambiar de LoadBalancer a ClusterIP
    port: 8080
    targetPort: 8080
  # ...resto de la configuración
```

Aplicar cambio:

```bash
helm upgrade fuel-system deploy/helm/fuel-system -n fuel-system
```

#### 3.8. Crear Ingress con SSL/TLS

Crear archivo `deploy/azure/ingress-ssl.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fuel-system-ingress-ssl
  namespace: fuel-system
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"  # Usar staging primero para testing
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.tudominio.com  # Cambiar por dominio real
    secretName: fuel-system-tls-cert
  rules:
  - host: api.tudominio.com  # Cambiar por dominio real
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

Aplicar Ingress:

```bash
kubectl apply -f deploy/azure/ingress-ssl.yaml

# Monitorear proceso de obtención del certificado (2-5 minutos)
kubectl get certificate -n fuel-system -w

# Ver detalles del certificado
kubectl describe certificate fuel-system-tls-cert -n fuel-system

# Ver challenges ACME (validación de dominio)
kubectl get challenges -n fuel-system

# Verificar que el certificado esté listo
kubectl get certificate fuel-system-tls-cert -n fuel-system \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
# Output esperado: True
```

#### 3.9. Probar Acceso HTTPS

```bash
# Probar acceso HTTPS
curl https://api.tudominio.com/health

# Verificar certificado SSL
openssl s_client -connect api.tudominio.com:443 -servername api.tudominio.com < /dev/null

# En navegador, abrir:
# https://api.tudominio.com/eureka
```

---

## 4. Network Policies para Seguridad entre Pods

### 4.1. Verificar Soporte de Network Policies

```bash
# Verificar si Network Policy está habilitado en el cluster
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query "networkProfile.networkPolicy" -o tsv

# Output esperado: azure o calico
# Si aparece null, el cluster no tiene Network Policies habilitado
```

**Nota**: Si Network Policy no está habilitado, no es posible agregarlo a un cluster existente. Se requiere recrear el cluster con `--network-policy azure`.

### 4.2. Crear Network Policies

Crear archivo `deploy/azure/network-policies.yaml`:

```yaml
# Política 1: Denegar todo el tráfico por defecto
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
# Política 2: Permitir tráfico del Ingress al API Gateway
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
# Política 3: Permitir API Gateway a microservicios gRPC
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
    - protocol: TCP
      port: 3100
---
# Política 4: Permitir microservicios a Eureka Server
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-services-to-eureka
  namespace: fuel-system
spec:
  podSelector:
    matchLabels:
      app: eureka-server
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/part-of: fuel-system
    ports:
    - protocol: TCP
      port: 8761
---
# Política 5: Permitir microservicios a RabbitMQ
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
    - protocol: TCP
      port: 15672
---
# Política 6: Permitir Logger Service a Elasticsearch
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-logger-to-elasticsearch
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
          app.kubernetes.io/component: logger-service
    ports:
    - protocol: TCP
      port: 9200
---
# Política 7: Permitir todo el tráfico Egress (necesario para PostgreSQL Azure)
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
---
# Política 8: Permitir DNS interno
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: fuel-system
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

Aplicar Network Policies:

```bash
kubectl apply -f deploy/azure/network-policies.yaml

# Verificar políticas creadas
kubectl get networkpolicies -n fuel-system

# Describir una política específica
kubectl describe networkpolicy allow-gateway-to-services -n fuel-system
```

---

## 5. Azure Monitor y Container Insights

### 5.1. Habilitar Container Insights

```bash
# Habilitar monitoring addon en el cluster
az aks enable-addons \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --addons monitoring

# Verificar que está habilitado
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query "addonProfiles.omsagent.enabled" -o tsv

# Output esperado: true
```

### 5.2. Acceder a Métricas en Azure Portal

1. Navegar a: Azure Portal → Kubernetes services → fuel-system-aks
2. En el menú lateral, seleccionar: **Monitoring → Insights**
3. Explorar las siguientes vistas:
   - **Cluster**: Uso general de CPU y memoria del cluster
   - **Nodes**: Métricas individuales por nodo
   - **Controllers**: Métricas por Deployment/StatefulSet
   - **Containers**: Métricas detalladas por contenedor

### 5.3. Queries de Log Analytics

En Azure Portal → fuel-system-aks → Monitoring → Logs:

```kusto
// Ver logs del API Gateway (últimas 24 horas)
ContainerLog
| where ContainerName == "api-gateway"
| where TimeGenerated > ago(24h)
| project TimeGenerated, LogEntry
| order by TimeGenerated desc

// Buscar errores en todos los servicios
ContainerLog
| where LogEntry contains "error" or LogEntry contains "ERROR" or LogEntry contains "Exception"
| where TimeGenerated > ago(1h)
| project TimeGenerated, ContainerName, LogEntry
| order by TimeGenerated desc

// Uso de CPU por pod (últimas 6 horas)
Perf
| where ObjectName == "K8SContainer"
| where CounterName == "cpuUsageNanoCores"
| where TimeGenerated > ago(6h)
| summarize avg(CounterValue) by bin(TimeGenerated, 5m), InstanceName
| render timechart

// Pods que han fallado o reiniciado
KubePodInventory
| where TimeGenerated > ago(1h)
| where PodStatus == "Failed" or RestartCount > 0
| project TimeGenerated, Namespace, Name, PodStatus, RestartCount
| order by TimeGenerated desc

// Requests HTTP del API Gateway (si está logeando)
ContainerLog
| where ContainerName == "api-gateway"
| where LogEntry contains "GET" or LogEntry contains "POST"
| where TimeGenerated > ago(1h)
| project TimeGenerated, LogEntry
| order by TimeGenerated desc
```

---

## 6. Application Insights (Opcional)

### 6.1. Crear Application Insights

```bash
# Crear Application Insights resource
az monitor app-insights component create \
  --app fuel-system-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Obtener Instrumentation Key
export INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app fuel-system-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

echo "Instrumentation Key: $INSTRUMENTATION_KEY"

# Obtener Connection String (recomendado para SDKs modernos)
export CONNECTION_STRING=$(az monitor app-insights component show \
  --app fuel-system-insights \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv)

echo "Connection String: $CONNECTION_STRING"
```

### 6.2. Integrar con Microservicios Node.js

Agregar al `package.json` de cada microservicio:

```json
{
  "dependencies": {
    "applicationinsights": "^2.9.0"
  }
}
```

Configurar en el código (archivo principal `main.ts` o `index.ts`):

```typescript
import * as appInsights from 'applicationinsights';

// Configurar Application Insights
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .start();
  
  console.log('Application Insights initialized');
}
```

Agregar la variable de entorno en `values.yaml`:

```yaml
# En cada servicio
env:
  APPLICATIONINSIGHTS_CONNECTION_STRING: "<connection-string>"
```

O mejor, crear un Secret:

```bash
kubectl create secret generic app-insights \
  --from-literal=connection-string="$CONNECTION_STRING" \
  -n fuel-system
```

---

## 7. Sistema de Alertas

### 7.1. Crear Action Group

```bash
# Crear Action Group para notificaciones por email
az monitor action-group create \
  --name fuel-system-alerts \
  --resource-group $RESOURCE_GROUP \
  --short-name fsalerts \
  --email-receiver name=admin email=admin@tudominio.com

# Verificar
az monitor action-group list \
  --resource-group $RESOURCE_GROUP \
  --query "[].{Name:name, ShortName:shortName}" -o table
```

### 7.2. Crear Alertas de Métricas

```bash
# Obtener ID del cluster para las alertas
export CLUSTER_ID=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query id -o tsv)

# Alerta: CPU del cluster mayor a 80%
az monitor metrics alert create \
  --name "AKS-High-CPU-Usage" \
  --resource-group $RESOURCE_GROUP \
  --scopes $CLUSTER_ID \
  --condition "avg node_cpu_usage_percentage > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action fuel-system-alerts \
  --description "Alert when cluster CPU usage exceeds 80%"

# Alerta: Memoria del cluster mayor a 85%
az monitor metrics alert create \
  --name "AKS-High-Memory-Usage" \
  --resource-group $RESOURCE_GROUP \
  --scopes $CLUSTER_ID \
  --condition "avg node_memory_working_set_percentage > 85" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action fuel-system-alerts \
  --description "Alert when cluster memory usage exceeds 85%"

# Alerta: Pods en estado Failed
az monitor metrics alert create \
  --name "AKS-Failed-Pods" \
  --resource-group $RESOURCE_GROUP \
  --scopes $CLUSTER_ID \
  --condition "max kube_pod_status_phase{phase='Failed'} > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action fuel-system-alerts \
  --description "Alert when there are pods in Failed state"

# Listar alertas creadas
az monitor metrics alert list \
  --resource-group $RESOURCE_GROUP \
  --query "[].{Name:name, Enabled:enabled}" -o table
```

### 7.3. Crear Alertas de Logs (Query-based)

```bash
# Obtener ID del Log Analytics Workspace
export WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RESOURCE_GROUP \
  --workspace-name DefaultWorkspace-$SUBSCRIPTION_ID-$LOCATION \
  --query id -o tsv)

# Alerta: Errores en logs (más de 10 en 5 minutos)
az monitor scheduled-query create \
  --name "High-Error-Rate" \
  --resource-group $RESOURCE_GROUP \
  --scopes $WORKSPACE_ID \
  --condition "count > 10" \
  --condition-query "ContainerLog | where LogEntry contains 'ERROR' | summarize count()" \
  --window-size 5m \
  --evaluation-frequency 5m \
  --action fuel-system-alerts \
  --description "Alert when error count exceeds 10 in 5 minutes"
```

---

## 8. Backup y Disaster Recovery

### 8.1. Backup de PostgreSQL (Automático)

Azure PostgreSQL Flexible Server realiza backups automáticos:

```bash
# Ver configuración de backup
az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name fuel-system-postgres \
  --query "{BackupRetention:backup.backupRetentionDays, GeoRedundant:backup.geoRedundantBackup}" \
  -o table

# Listar backups disponibles
az postgres flexible-server backup list \
  --resource-group $RESOURCE_GROUP \
  --name fuel-system-postgres \
  --query "[].{Name:name, BackupType:backupType, CompletedTime:completedTime}" -o table
```

### 8.2. Restaurar PostgreSQL desde Backup

```bash
# Restaurar a un punto específico en el tiempo (Point-in-Time Restore)
az postgres flexible-server restore \
  --resource-group $RESOURCE_GROUP \
  --name fuel-system-postgres-restored \
  --source-server fuel-system-postgres \
  --restore-time "2025-11-23T10:00:00Z"

# Restaurar desde el último backup
az postgres flexible-server restore \
  --resource-group $RESOURCE_GROUP \
  --name fuel-system-postgres-restored \
  --source-server fuel-system-postgres
```

### 8.3. Backup de Configuración de Kubernetes

```bash
# Crear directorio para backups
mkdir -p ~/backups/fuel-system

# Exportar toda la configuración del namespace
kubectl get all,configmap,secret,ingress,networkpolicy -n fuel-system -o yaml \
  > ~/backups/fuel-system/fuel-system-backup-$(date +%Y%m%d).yaml

# Exportar solo secrets (importante)
kubectl get secrets -n fuel-system -o yaml \
  > ~/backups/fuel-system/secrets-backup-$(date +%Y%m%d).yaml

# Exportar configuraciones de Helm
helm get values fuel-system -n fuel-system \
  > ~/backups/fuel-system/helm-values-backup-$(date +%Y%m%d).yaml
```

### 8.4. Backup con Velero (Avanzado - Opcional)

Velero es una herramienta de backup/restore para Kubernetes:

```bash
# Instalar Velero CLI
# Windows (PowerShell como admin):
choco install velero

# Crear Storage Account para backups
az storage account create \
  --name fuelsystembackups \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_LRS

# Crear Blob Container
az storage container create \
  --name velero \
  --account-name fuelsystembackups

# Instalar Velero en el cluster
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm repo update

helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.provider=azure \
  --set configuration.backupStorageLocation.bucket=velero \
  --set configuration.backupStorageLocation.config.resourceGroup=$RESOURCE_GROUP \
  --set configuration.backupStorageLocation.config.storageAccount=fuelsystembackups

# Crear backup manual
velero backup create fuel-system-backup --include-namespaces fuel-system

# Listar backups
velero backup get

# Restaurar desde backup
velero restore create --from-backup fuel-system-backup
```

---

## 9. Pruebas de Seguridad

### 9.1. Escaneo de Vulnerabilidades con Trivy

```bash
# Instalar Trivy (Windows)
choco install trivy

# Escanear imagen del API Gateway
trivy image ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest

# Escanear todas las imágenes del cluster
kubectl get pods -n fuel-system -o json | \
  jq -r '.items[].spec.containers[].image' | \
  sort -u | \
  xargs -I {} trivy image {}

# Generar reporte HTML
trivy image --format html \
  --output trivy-report.html \
  ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
```

### 9.2. Verificar Configuración de Seguridad con kube-bench

```bash
# Ejecutar kube-bench en el cluster
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job-aks.yaml

# Ver resultados
kubectl logs -n default $(kubectl get pods -n default -l app=kube-bench -o name) | less

# Limpiar
kubectl delete -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job-aks.yaml
```

---

## 10. Monitoreo de Costos

### 10.1. Habilitar Cost Analysis

```bash
# Ver costos del Resource Group
az consumption usage list \
  --resource-group $RESOURCE_GROUP \
  --start-date $(date -d '30 days ago' +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[].{Service:meterDetails.meterName, Cost:pretaxCost}" \
  -o table

# Ver costos por servicio
az consumption usage list \
  --resource-group $RESOURCE_GROUP \
  --start-date $(date -d '7 days ago' +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[] | group_by(@, &meterDetails.meterCategory)" \
  -o table
```

### 10.2. Configurar Alertas de Presupuesto

```bash
# Crear presupuesto mensual
az consumption budget create \
  --amount 500 \
  --budget-name fuel-system-monthly-budget \
  --category Cost \
  --time-grain Monthly \
  --time-period start-date=$(date +%Y-%m-01) \
  --resource-group $RESOURCE_GROUP \
  --notifications \
    threshold=80 \
    operator=GreaterThan \
    contact-emails="admin@tudominio.com"
```

---

## 11. Script de Configuración Completa

Crear archivo `deploy/azure/setup-networking-security.sh`:

```bash
#!/bin/bash
set -e

# Variables
export RESOURCE_GROUP="fuel-system-rg"
export AKS_NAME="fuel-system-aks"
export LOCATION="northcentralus"
export ADMIN_EMAIL="admin@tudominio.com"

echo "========================================="
echo "Configuración de Networking y Seguridad"
echo "========================================="

# 1. Obtener información del cluster
echo -e "\n[1/8] Obteniendo información del cluster..."
export NODE_RESOURCE_GROUP=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query nodeResourceGroup -o tsv)

echo "Node Resource Group: $NODE_RESOURCE_GROUP"

# 2. Obtener IP pública del API Gateway
echo -e "\n[2/8] Configurando IP estática..."
export API_GATEWAY_IP=$(kubectl get service fuel-system-api-gateway -n fuel-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "API Gateway IP: $API_GATEWAY_IP"

export PUBLIC_IP_NAME=$(az network public-ip list \
  --resource-group $NODE_RESOURCE_GROUP \
  --query "[?ipAddress=='$API_GATEWAY_IP'].name" -o tsv)

az network public-ip update \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --allocation-method Static

echo "IP configurada como estática"

# 3. Configurar NSG
echo -e "\n[3/8] Configurando Network Security Groups..."
export NSG_NAME=$(az network nsg list \
  --resource-group $NODE_RESOURCE_GROUP \
  --query "[0].name" -o tsv)

export API_GATEWAY_NODEPORT=$(kubectl get svc fuel-system-api-gateway -n fuel-system \
  -o jsonpath='{.spec.ports[0].nodePort}')

# Crear reglas NSG
az network nsg rule create \
  --resource-group $NODE_RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name AllowAzureLoadBalancer \
  --priority 100 \
  --source-address-prefixes AzureLoadBalancer \
  --destination-port-ranges 30000-32767 \
  --access Allow \
  --protocol Tcp \
  --description "Allow Azure Load Balancer health checks" \
  2>/dev/null || echo "Regla AllowAzureLoadBalancer ya existe"

az network nsg rule create \
  --resource-group $NODE_RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name AllowHTTPFromInternet \
  --priority 200 \
  --source-address-prefixes Internet \
  --destination-port-ranges $API_GATEWAY_NODEPORT \
  --access Allow \
  --protocol Tcp \
  --description "Allow HTTP traffic from Internet" \
  2>/dev/null || echo "Regla AllowHTTPFromInternet ya existe"

echo "NSG configurado correctamente"

# 4. Aplicar Network Policies
echo -e "\n[4/8] Aplicando Network Policies..."
if kubectl get networkpolicy -n fuel-system &>/dev/null; then
  kubectl apply -f deploy/azure/network-policies.yaml
  echo "Network Policies aplicadas"
else
  echo "Network Policies no soportadas en este cluster (omitiendo)"
fi

# 5. Habilitar Container Insights
echo -e "\n[5/8] Habilitando Azure Monitor..."
az aks enable-addons \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --addons monitoring

echo "Azure Monitor habilitado"

# 6. Crear Application Insights
echo -e "\n[6/8] Creando Application Insights..."
az monitor app-insights component create \
  --app fuel-system-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web \
  2>/dev/null || echo "Application Insights ya existe"

# 7. Crear Action Group y Alertas
echo -e "\n[7/8] Configurando alertas..."
az monitor action-group create \
  --name fuel-system-alerts \
  --resource-group $RESOURCE_GROUP \
  --short-name fsalerts \
  --email-receiver name=admin email=$ADMIN_EMAIL \
  2>/dev/null || echo "Action Group ya existe"

export CLUSTER_ID=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query id -o tsv)

az monitor metrics alert create \
  --name "AKS-High-CPU-Usage" \
  --resource-group $RESOURCE_GROUP \
  --scopes $CLUSTER_ID \
  --condition "avg node_cpu_usage_percentage > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action fuel-system-alerts \
  --description "Alert when cluster CPU usage exceeds 80%" \
  2>/dev/null || echo "Alerta AKS-High-CPU-Usage ya existe"

echo "Alertas configuradas"

# 8. Resumen
echo -e "\n[8/8] Configuración completada"
echo "========================================="
echo "RESUMEN DE CONFIGURACIÓN"
echo "========================================="
echo "API Gateway IP: $API_GATEWAY_IP"
echo "URL de acceso: http://$API_GATEWAY_IP:8080"
echo "NSG configurado: $NSG_NAME"
echo "Azure Monitor: Habilitado"
echo "Application Insights: fuel-system-insights"
echo "Action Group: fuel-system-alerts"
echo "========================================="

# Probar conectividad
echo -e "\nProbando conectividad..."
curl -s http://$API_GATEWAY_IP:8080/health || echo "Advertencia: No se pudo conectar al API Gateway"

echo -e "\n¡Configuración completada exitosamente!"
```

Hacer el script ejecutable y ejecutarlo:

```bash
chmod +x deploy/azure/setup-networking-security.sh
./deploy/azure/setup-networking-security.sh
```

---

## 12. Checklist Final

Verificar que todos los componentes están correctamente configurados:

```bash
# 1. Verificar IP estática
az network public-ip show \
  --resource-group $NODE_RESOURCE_GROUP \
  --name $PUBLIC_IP_NAME \
  --query "{IP:ipAddress, AllocationMethod:publicIPAllocationMethod}" -o table

# 2. Verificar reglas NSG
az network nsg rule list \
  --resource-group $NODE_RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --query "[].{Name:name, Priority:priority, Access:access}" -o table

# 3. Verificar Network Policies
kubectl get networkpolicies -n fuel-system

# 4. Verificar Azure Monitor
az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --query "addonProfiles.omsagent.enabled" -o tsv

# 5. Verificar Application Insights
az monitor app-insights component show \
  --app fuel-system-insights \
  --resource-group $RESOURCE_GROUP \
  --query "{Name:name, AppId:appId}" -o table

# 6. Verificar alertas
az monitor metrics alert list \
  --resource-group $RESOURCE_GROUP \
  --query "[].{Name:name, Enabled:enabled}" -o table

# 7. Probar acceso público
curl http://$API_GATEWAY_IP:8080/health

# 8. Ver logs en tiempo real
kubectl logs -f -l app.kubernetes.io/component=api-gateway -n fuel-system

# 9. Ver pods en ejecución
kubectl get pods -n fuel-system

# 10. Ver servicios y endpoints
kubectl get svc,endpoints -n fuel-system
```

---

## Resumen de Configuración Completada

Al finalizar esta fase, el sistema cuenta con:

**Networking:**
- IP pública estática asignada al API Gateway
- Network Security Groups configurados para acceso HTTP/HTTPS
- Opciones documentadas para configuración DNS (futuro)
- Soporte para HTTPS con certificados SSL/TLS (Let's Encrypt o self-signed)

**Seguridad:**
- Network Policies implementadas para aislamiento entre pods
- Políticas de denegación por defecto con permisos explícitos
- Tráfico controlado entre microservicios
- Escaneo de vulnerabilidades configurado

**Monitoreo:**
- Azure Monitor y Container Insights habilitados
- Log Analytics configurado para queries avanzadas
- Application Insights integrado (opcional)
- Métricas de CPU, memoria y logs centralizados

**Alertas:**
- Action Groups configurados para notificaciones
- Alertas de CPU, memoria y pods fallidos
- Alertas basadas en queries de logs
- Notificaciones por email a administradores

**Backup:**
- Backups automáticos de PostgreSQL configurados
- Procedimientos de backup de configuración de Kubernetes documentados
- Opciones de disaster recovery con Velero (opcional)

**URLs de Acceso:**
- API Gateway: `http://<API_GATEWAY_IP>:8080`
- Health Check: `http://<API_GATEWAY_IP>:8080/health`
- Eureka Dashboard: `http://<API_GATEWAY_IP>:8080/eureka` (si configurado en Ingress)

---

## Próximos Pasos Recomendados

1. **Configurar dominio DNS** cuando esté disponible y seguir Opción B para HTTPS
2. **Implementar WAF** (Web Application Firewall) con Azure Application Gateway
3. **Configurar Azure Front Door** para CDN y balanceo global
4. **Implementar Azure Key Vault** para gestión centralizada de secrets
5. **Configurar Azure Private Link** para conexiones privadas a PostgreSQL
6. **Implementar políticas de autoescalado avanzadas** (KEDA)

---

**Configuración completada**. El sistema está ahora en producción con seguridad y monitoreo implementados.

