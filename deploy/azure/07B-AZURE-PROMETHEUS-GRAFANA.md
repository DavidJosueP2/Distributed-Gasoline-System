# 📊 Fase 7B: Prometheus + Grafana (Monitoreo Obligatorio)

> **Tiempo estimado**: 45 minutos  
> **Prerequisitos**: Fases 1-6 completadas  
> **⚠️ OBLIGATORIO**: Este sistema de monitoreo es un requisito del proyecto

---

## 📋 Objetivos de esta Fase

Al finalizar esta fase, tendrás:

- ✅ **Prometheus** instalado y configurando métricas de todos los microservicios
- ✅ **Grafana** instalado con dashboards visuales
- ✅ **Kube-state-metrics** para métricas de Kubernetes
- ✅ **Node-exporter** para métricas de nodos
- ✅ **Service Monitors** para scraping automático de métricas
- ✅ **Alertas** configuradas en Prometheus
- ✅ **Dashboards predefinidos** para microservicios, PostgreSQL, RabbitMQ

---

## 1. Arquitectura de Monitoreo

```
┌─────────────────────────────────────────────────────────────┐
│                    Grafana Dashboard                         │
│              (Visualización - Puerto 3000)                   │
└────────────────────┬────────────────────────────────────────┘
                     │ Queries
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Prometheus Server                           │
│            (Recolección - Puerto 9090)                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Service Discovery (Kubernetes)                       │  │
│  │  - Encuentra pods automáticamente                     │  │
│  │  - Lee anotaciones de servicios                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────┬──────────────┬─────────────────┬──────────────────┬───┘
     │              │                 │                  │
     ▼              ▼                 ▼                  ▼
┌─────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────────┐
│ Node    │  │ Kube-State   │  │ RabbitMQ │  │Microservices│
│Exporter │  │   Metrics    │  │Exporter  │  │  Metrics    │
│(Nodos)  │  │(K8s Objects) │  │          │  │  /metrics   │
└─────────┘  └──────────────┘  └──────────┘  └─────────────┘
```

---

## 2. Instalar Prometheus Stack con Helm

### Agregar Helm Repository

```bash
# Agregar repo de Prometheus Community
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Verificar
helm search repo prometheus-community/kube-prometheus-stack
```

---

## 3. Crear Archivo de Valores para Prometheus

Crea `deploy/azure/prometheus-values.yaml`:

```yaml
# ==============================================
# PROMETHEUS + GRAFANA - VALUES PARA AZURE
# ==============================================

# Configuración global
global:
  rbac:
    create: true

# Prometheus Operator
prometheusOperator:
  enabled: true
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# Prometheus Server
prometheus:
  enabled: true
  
  prometheusSpec:
    # Retención de datos
    retention: 15d
    retentionSize: "10GB"
    
    # Recursos
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 3Gi
    
    # Storage
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: managed-csi
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 20Gi
    
    # Service Discovery - Scrape de todos los namespaces
    serviceMonitorSelector: {}
    serviceMonitorNamespaceSelector: {}
    podMonitorSelector: {}
    podMonitorNamespaceSelector: {}
    
    # Scrape interval
    scrapeInterval: 30s
    evaluationInterval: 30s
    
    # Configuración adicional
    additionalScrapeConfigs:
    # PostgreSQL (si tienes postgres_exporter)
    - job_name: 'postgresql'
      static_configs:
      - targets: ['postgres-exporter:9187']
        labels:
          service: 'postgresql'
    
    # RabbitMQ Prometheus Plugin
    - job_name: 'rabbitmq'
      static_configs:
      - targets: ['rabbitmq.fuel-system.svc.cluster.local:15692']
        labels:
          service: 'rabbitmq'
    
    # Elasticsearch
    - job_name: 'elasticsearch'
      static_configs:
      - targets: ['elasticsearch-master.fuel-system.svc.cluster.local:9114']
        labels:
          service: 'elasticsearch'

  # Service
  service:
    type: ClusterIP
    port: 9090

# Grafana
grafana:
  enabled: true
  
  # Admin credentials
  adminPassword: "FuelSystemGrafana2024!"  # ⚠️ CAMBIAR en producción
  
  # Recursos
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  
  # Persistence
  persistence:
    enabled: true
    storageClassName: managed-csi
    size: 10Gi
  
  # Service
  service:
    type: ClusterIP
    port: 80
  
  # Datasources (Prometheus automático)
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus-operated:9090
        access: proxy
        isDefault: true
  
  # Dashboards predefinidos
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default
  
  # Importar dashboards automáticamente
  dashboards:
    default:
      # Kubernetes Cluster Monitoring
      kubernetes-cluster:
        gnetId: 7249
        revision: 1
        datasource: Prometheus
      
      # Node Exporter Full
      node-exporter:
        gnetId: 1860
        revision: 27
        datasource: Prometheus
      
      # Kubernetes Pods
      kubernetes-pods:
        gnetId: 6417
        revision: 1
        datasource: Prometheus
      
      # RabbitMQ Overview
      rabbitmq-overview:
        gnetId: 10991
        revision: 11
        datasource: Prometheus
      
      # PostgreSQL Database
      postgresql-database:
        gnetId: 9628
        revision: 7
        datasource: Prometheus

# Alertmanager
alertmanager:
  enabled: true
  
  alertmanagerSpec:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
    
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: managed-csi
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 5Gi
  
  # Configuración de alertas
  config:
    global:
      resolve_timeout: 5m
    
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'null'
      routes:
      - match:
          alertname: Watchdog
        receiver: 'null'
      - match:
          severity: critical
        receiver: 'critical-alerts'
    
    receivers:
    - name: 'null'
    - name: 'critical-alerts'
      # Configurar aquí tus notificaciones (email, slack, etc.)
      # email_configs:
      # - to: 'admin@example.com'
      #   from: 'alertmanager@example.com'
      #   smarthost: 'smtp.gmail.com:587'
      #   auth_username: 'your-email@gmail.com'
      #   auth_password: 'your-app-password'

# Node Exporter (métricas de nodos)
nodeExporter:
  enabled: true
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi

# Kube State Metrics (métricas de objetos K8s)
kubeStateMetrics:
  enabled: true
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi

# Prometheus Node Exporter
prometheus-node-exporter:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi

# Default rules (alertas predefinidas)
defaultRules:
  create: true
  rules:
    alertmanager: true
    etcd: false
    configReloaders: true
    general: true
    k8s: true
    kubeApiserver: true
    kubeApiserverAvailability: true
    kubeApiserverSlos: true
    kubelet: true
    kubeProxy: true
    kubePrometheusGeneral: true
    kubePrometheusNodeRecording: true
    kubernetesApps: true
    kubernetesResources: true
    kubernetesStorage: true
    kubernetesSystem: true
    kubeScheduler: false
    kubeStateMetrics: true
    network: true
    node: true
    nodeExporterAlerting: true
    nodeExporterRecording: true
    prometheus: true
    prometheusOperator: true
```

---

## 4. Instalar Prometheus Stack

```bash
# Instalar en namespace monitoring
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values deploy/azure/prometheus-values.yaml \
  --wait \
  --timeout 10m

# Verificar instalación
kubectl get pods -n monitoring

# Output esperado:
# NAME                                                   READY   STATUS    RESTARTS   AGE
# alertmanager-prometheus-kube-prometheus-alertmanager-0  2/2     Running   0          2m
# prometheus-grafana-xxx-xxx                              3/3     Running   0          2m
# prometheus-kube-prometheus-operator-xxx-xxx             1/1     Running   0          2m
# prometheus-kube-state-metrics-xxx-xxx                   1/1     Running   0          2m
# prometheus-prometheus-node-exporter-xxx                 1/1     Running   0          2m
# prometheus-prometheus-kube-prometheus-prometheus-0      2/2     Running   0          2m
```

---

## 5. Exponer Grafana y Prometheus

### Crear Ingress para Grafana y Prometheus

Crea `deploy/azure/monitoring-ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monitoring-ingress
  namespace: monitoring
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
  - http:
      paths:
      # Grafana
      - path: /grafana(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: prometheus-grafana
            port:
              number: 80
      # Prometheus
      - path: /prometheus(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: prometheus-kube-prometheus-prometheus
            port:
              number: 9090
      # Alertmanager
      - path: /alertmanager(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: prometheus-kube-prometheus-alertmanager
            port:
              number: 9093
```

Aplicar:
```bash
kubectl apply -f deploy/azure/monitoring-ingress.yaml

# Verificar
kubectl get ingress -n monitoring
```

### Acceder a Grafana y Prometheus

```bash
# Obtener IP del Ingress
INGRESS_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Grafana: http://$INGRESS_IP/grafana"
echo "Prometheus: http://$INGRESS_IP/prometheus"
echo "Alertmanager: http://$INGRESS_IP/alertmanager"

# Credenciales de Grafana:
# Usuario: admin
# Password: FuelSystemGrafana2024!
```

---

## 6. Configurar Service Monitors para Microservicios

### Crear Service Monitors

Crea `deploy/azure/service-monitors.yaml`:

```yaml
# Service Monitor para API Gateway
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-gateway-monitor
  namespace: fuel-system
  labels:
    app: api-gateway
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: api-gateway
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
---
# Service Monitor para Auth Service
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: auth-service-monitor
  namespace: fuel-system
  labels:
    app: auth-service
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: auth-service
  endpoints:
  - port: grpc
    path: /metrics
    interval: 30s
---
# Service Monitor para Driver Service
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: driver-service-monitor
  namespace: fuel-system
  labels:
    app: driver-service
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: driver-service
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
---
# Service Monitor genérico para todos los microservicios
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fuel-system-services
  namespace: fuel-system
  labels:
    app: fuel-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: fuel-system
  namespaceSelector:
    matchNames:
    - fuel-system
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
  - port: grpc
    path: /metrics
    interval: 30s
```

Aplicar:
```bash
kubectl apply -f deploy/azure/service-monitors.yaml

# Verificar
kubectl get servicemonitor -n fuel-system
```

---

## 7. Configurar Exporters Adicionales

### RabbitMQ Exporter (si no tiene plugin de Prometheus)

```bash
# RabbitMQ ya tiene plugin de Prometheus en puerto 15692
# Verificar que esté habilitado
kubectl exec -it rabbitmq-0 -n fuel-system -- rabbitmq-plugins list

# Si no está habilitado:
kubectl exec -it rabbitmq-0 -n fuel-system -- rabbitmq-plugins enable rabbitmq_prometheus
```

### PostgreSQL Exporter (Opcional)

Si quieres métricas detalladas de PostgreSQL:

```bash
# Instalar postgres_exporter con Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

helm install postgres-exporter prometheus-community/prometheus-postgres-exporter \
  --namespace monitoring \
  --set config.datasource.host=fuel-system-postgres.postgres.database.azure.com \
  --set config.datasource.user=pgadmin \
  --set config.datasource.password=FuelSystem2024@Secure \
  --set config.datasource.database=postgres \
  --set config.datasource.sslmode=require
```

---

## 8. Crear Dashboards Personalizados

### Dashboard para Fuel System Microservices

Crea `deploy/azure/fuel-system-dashboard.json` (ejemplo simplificado):

```json
{
  "dashboard": {
    "title": "Fuel System Microservices",
    "panels": [
      {
        "title": "CPU Usage by Service",
        "targets": [
          {
            "expr": "rate(container_cpu_usage_seconds_total{namespace=\"fuel-system\"}[5m])"
          }
        ]
      },
      {
        "title": "Memory Usage by Service",
        "targets": [
          {
            "expr": "container_memory_usage_bytes{namespace=\"fuel-system\"}"
          }
        ]
      },
      {
        "title": "HTTP Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{namespace=\"fuel-system\"}[5m])"
          }
        ]
      }
    ]
  }
}
```

Importar en Grafana:
1. Ve a Grafana: `http://<INGRESS_IP>/grafana`
2. Login con admin / FuelSystemGrafana2024!
3. Click en "+" → Import
4. Pega el JSON o sube el archivo
5. Click "Load" → "Import"

---

## 9. Configurar Alertas Personalizadas

### Crear PrometheusRules

Crea `deploy/azure/prometheus-rules.yaml`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: fuel-system-alerts
  namespace: fuel-system
  labels:
    prometheus: kube-prometheus
spec:
  groups:
  - name: fuel-system
    interval: 30s
    rules:
    # Alerta: Pod down
    - alert: PodDown
      expr: up{namespace="fuel-system"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Pod {{ $labels.pod }} is down"
        description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has been down for more than 5 minutes."
    
    # Alerta: High CPU
    - alert: HighCPUUsage
      expr: rate(container_cpu_usage_seconds_total{namespace="fuel-system"}[5m]) > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High CPU usage on {{ $labels.pod }}"
        description: "Pod {{ $labels.pod }} is using more than 80% CPU for 10 minutes."
    
    # Alerta: High Memory
    - alert: HighMemoryUsage
      expr: container_memory_usage_bytes{namespace="fuel-system"} / container_spec_memory_limit_bytes{namespace="fuel-system"} > 0.9
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage on {{ $labels.pod }}"
        description: "Pod {{ $labels.pod }} is using more than 90% of memory limit."
    
    # Alerta: PostgreSQL Connection Issues
    - alert: PostgreSQLDown
      expr: pg_up == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "PostgreSQL is down"
        description: "PostgreSQL database is not responding."
    
    # Alerta: RabbitMQ Queue Growing
    - alert: RabbitMQQueueGrowing
      expr: rabbitmq_queue_messages > 1000
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "RabbitMQ queue {{ $labels.queue }} is growing"
        description: "Queue {{ $labels.queue }} has more than 1000 messages for 15 minutes."
    
    # Alerta: High HTTP Error Rate
    - alert: HighHTTPErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High HTTP error rate on {{ $labels.service }}"
        description: "Service {{ $labels.service }} has more than 5% HTTP 5xx errors."
```

Aplicar:
```bash
kubectl apply -f deploy/azure/prometheus-rules.yaml

# Verificar
kubectl get prometheusrules -n fuel-system
```

---

## 10. Script de Instalación Completa

Guarda como `deploy/azure/setup-monitoring.ps1`:

```powershell
$NAMESPACE = "monitoring"

Write-Host "📊 Instalando Prometheus + Grafana..." -ForegroundColor Cyan

# 1. Agregar repo
Write-Host "`n1. Agregando repositorio de Prometheus..." -ForegroundColor Yellow
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# 2. Instalar stack
Write-Host "`n2. Instalando Prometheus Stack (esto puede tardar 5 minutos)..." -ForegroundColor Yellow
helm install prometheus prometheus-community/kube-prometheus-stack `
  --namespace $NAMESPACE `
  --create-namespace `
  --values deploy/azure/prometheus-values.yaml `
  --wait `
  --timeout 10m

# 3. Aplicar ingress
Write-Host "`n3. Configurando Ingress..." -ForegroundColor Yellow
kubectl apply -f deploy/azure/monitoring-ingress.yaml

# 4. Aplicar service monitors
Write-Host "`n4. Configurando Service Monitors..." -ForegroundColor Yellow
kubectl apply -f deploy/azure/service-monitors.yaml

# 5. Aplicar alertas
Write-Host "`n5. Configurando Alertas..." -ForegroundColor Yellow
kubectl apply -f deploy/azure/prometheus-rules.yaml

# 6. Obtener IP del Ingress
$INGRESS_IP = kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

Write-Host "`n✅ Prometheus + Grafana instalado exitosamente!" -ForegroundColor Green
Write-Host "`n=== ACCESOS ===" -ForegroundColor Cyan
Write-Host "Grafana: http://$INGRESS_IP/grafana"
Write-Host "  Usuario: admin"
Write-Host "  Password: FuelSystemGrafana2024!"
Write-Host "`nPrometheus: http://$INGRESS_IP/prometheus"
Write-Host "Alertmanager: http://$INGRESS_IP/alertmanager"

Write-Host "`n📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Accede a Grafana y explora los dashboards"
Write-Host "2. Verifica que Prometheus esté scrapeando tus servicios"
Write-Host "3. Configura notificaciones en Alertmanager"
```

Ejecutar:
```powershell
.\setup-monitoring.ps1
```

---

## 11. Verificación

### Verificar que Prometheus está Scrapeando

1. Ve a Prometheus: `http://<INGRESS_IP>/prometheus`
2. Click en "Status" → "Targets"
3. Deberías ver todos tus servicios listados

### Verificar Dashboards en Grafana

1. Ve a Grafana: `http://<INGRESS_IP>/grafana`
2. Login: admin / FuelSystemGrafana2024!
3. Click en "Dashboards" → "Browse"
4. Explora los dashboards importados

### Verificar Alertas

```bash
# Ver alertas activas en Prometheus
curl http://<INGRESS_IP>/prometheus/api/v1/alerts

# Ver reglas configuradas
kubectl get prometheusrules -n fuel-system
```

---

## 12. Dashboards Recomendados para Importar

IDs de dashboards de Grafana.com para importar:

```
# Kubernetes
- 7249: Kubernetes Cluster Monitoring
- 6417: Kubernetes Pods Monitoring
- 1860: Node Exporter Full

# Bases de Datos
- 9628: PostgreSQL Database
- 10991: RabbitMQ Overview
- 2322: Elasticsearch Overview

# Aplicaciones
- 6581: NestJS Monitoring (para tus microservicios Node.js)
- 11074: NGINX Ingress Controller
```

Para importar:
1. Grafana → "+" → Import
2. Ingresa el ID del dashboard
3. Click "Load"
4. Selecciona datasource "Prometheus"
5. Click "Import"

---

## 13. Costos Estimados

### Recursos de Monitoreo
- Prometheus Server (1Gi RAM, 500m CPU): ~$30/mes
- Grafana (256Mi RAM, 200m CPU): ~$10/mes
- Kube-state-metrics: ~$5/mes
- Node-exporter (por nodo): ~$5/mes x 3 = $15/mes
- Storage (Prometheus 20GB + Grafana 10GB): ~$15/mes
- **Total**: ~$75/mes

> **💡 NOTA**: Este costo es adicional a la infraestructura base, pero es **obligatorio** para el proyecto.

---

## ✅ Fase 7B Completada

Si llegaste hasta aquí, ¡excelente! Tienes:

- ✅ **Prometheus** recolectando métricas de todo el cluster
- ✅ **Grafana** con dashboards visuales predefinidos
- ✅ **Service Monitors** para scraping automático
- ✅ **Alertas** configuradas para situaciones críticas
- ✅ **Exporters** para PostgreSQL, RabbitMQ, Elasticsearch
- ✅ **Ingress** configurado para acceso web
- ✅ Sistema de monitoreo completo y funcional

---

## 📍 Integración con Fase 7A

Esta fase (7B) complementa la Fase 7A (Networking y Seguridad) con monitoreo obligatorio.

**Orden recomendado**:
1. Fase 7A: Networking y Seguridad
2. **Fase 7B: Prometheus + Grafana** (este documento)

Ambas son obligatorias para completar el despliegue a Azure.

---

**¡Sistema de monitoreo profesional configurado! 📊**
