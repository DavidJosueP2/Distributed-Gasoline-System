# ==============================================
# Script de Despliegue Local - Fuel System (Windows)
# ==============================================
# Este script automatiza el despliegue completo en Kubernetes local

$ErrorActionPreference = "Stop"

# Variables
$NAMESPACE = "fuel-system"
$CLUSTER_NAME = "fuel-local"

Write-Host "================================================" -ForegroundColor Blue
Write-Host "🚀 Fuel System - Despliegue Local con Kubernetes" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue

function Print-Step {
    param($Message)
    Write-Host "`n✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param($Message)
    Write-Host "`n✗ $Message" -ForegroundColor Red
}

function Print-Info {
    param($Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# Verificar que kubectl esté instalado
if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Print-Error "kubectl no está instalado. Por favor, instálalo primero."
    exit 1
}

# Verificar que helm esté instalado
if (!(Get-Command helm -ErrorAction SilentlyContinue)) {
    Print-Error "helm no está instalado. Por favor, instálalo primero."
    exit 1
}

Print-Step "Herramientas verificadas (kubectl, helm)"

# Crear namespace
Print-Info "Creando namespace $NAMESPACE..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
Print-Step "Namespace $NAMESPACE creado/verificado"

# Agregar repos de Helm
Print-Info "Agregando repositorios de Helm..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add elastic https://helm.elastic.co
helm repo update
Print-Step "Repositorios de Helm actualizados"

# Desplegar PostgreSQL - Auth DB
Print-Info "Desplegando Auth DB (PostgreSQL)..."
helm upgrade --install auth-db bitnami/postgresql `
  --namespace $NAMESPACE `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=auth_db `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m `
  --wait --timeout 5m
Print-Step "Auth DB desplegada"

# Desplegar PostgreSQL - Driver DB
Print-Info "Desplegando Driver DB (PostgreSQL)..."
helm upgrade --install driver-db bitnami/postgresql `
  --namespace $NAMESPACE `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=driver_db `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m `
  --wait --timeout 5m
Print-Step "Driver DB desplegada"

# Desplegar PostgreSQL - Users DB
Print-Info "Desplegando Users DB (PostgreSQL)..."
helm upgrade --install users-db bitnami/postgresql `
  --namespace $NAMESPACE `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=users_db `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m `
  --wait --timeout 5m
Print-Step "Users DB desplegada"

# Desplegar PostgreSQL - Vehicles DB
Print-Info "Desplegando Vehicles DB (PostgreSQL)..."
helm upgrade --install vehicles-db bitnami/postgresql `
  --namespace $NAMESPACE `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=vehicles_db `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m `
  --wait --timeout 5m
Print-Step "Vehicles DB desplegada"

# Desplegar PostgreSQL - Vehicles Shadow DB
Print-Info "Desplegando Vehicles Shadow DB (PostgreSQL)..."
helm upgrade --install vehicles-shadow-db bitnami/postgresql `
  --namespace $NAMESPACE `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=vehicles_shadow_db `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m `
  --wait --timeout 5m
Print-Step "Vehicles Shadow DB desplegada"

# Desplegar RabbitMQ (usando imagen legacy gratuita)
Print-Info "Desplegando RabbitMQ..."
helm upgrade --install rabbitmq bitnami/rabbitmq `
  -n $NAMESPACE --create-namespace `
  --set auth.username=admin `
  --set auth.password=admin123 `
  --set replicaCount=1 `
  --set service.type=NodePort `
  --set service.nodePorts.amqp=30672 `
  --set service.nodePorts.manager=31672 `
  --set image.registry=docker.io `
  --set image.repository=bitnamilegacy/rabbitmq `
  --set image.tag=3.13.7-debian-12-r4 `
  --set persistence.enabled=true `
  --set persistence.size=8Gi `
  --set volumePermissions.enabled=true `
  --set volumePermissions.image.registry=docker.io `
  --set volumePermissions.image.repository=bitnamilegacy/os-shell `
  --set volumePermissions.image.tag=12-debian-12-r50 `
  --set global.security.allowInsecureImages=true `
  --wait --debug --timeout 10m
Print-Step "RabbitMQ desplegado"

# Desplegar Elasticsearch
Print-Info "Desplegando Elasticsearch..."
helm upgrade --install elasticsearch elastic/elasticsearch `
  --namespace $NAMESPACE --create-namespace `
  --version 7.17.3 `
  --set replicas=1 `
  --set resources.requests.memory=1Gi `
  --set resources.requests.cpu=500m `
  --set resources.limits.memory=2Gi `
  --set resources.limits.cpu=1000m `
  --set persistence.enabled=true `
  --set volumeClaimTemplate.resources.requests.storage=5Gi `
  --set service.type=NodePort `
  --set service.nodePort=30920 `
  --set image=docker.elastic.co/elasticsearch/elasticsearch `
  --set imageTag=7.17.3 `
  --set readinessProbe.initialDelaySeconds=45 `
  --set readinessProbe.periodSeconds=10 `
  --set readinessProbe.failureThreshold=12 `
  --timeout 10m `
  --wait --debug
Print-Step "Elasticsearch desplegado"

# Desplegar Eureka Server
Print-Info "Desplegando Eureka Server..."
kubectl apply -f .\eureka-deployment.yaml
kubectl wait --for=condition=available --timeout=300s deployment/eureka-server -n $NAMESPACE
Print-Step "Eureka Server desplegado"

# Mostrar estado
Print-Step "Infraestructura desplegada exitosamente"

Write-Host "`n================================================" -ForegroundColor Blue
Write-Host "✓ Despliegue completado" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Blue

Write-Host "`n📊 Estado de los recursos:" -ForegroundColor Yellow
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE

Write-Host "`n🌐 Acceso a servicios:" -ForegroundColor Yellow
Write-Host "  • Eureka Dashboard: " -NoNewline
Write-Host "http://localhost:30761" -ForegroundColor Green
Write-Host "  • RabbitMQ Management: " -NoNewline
Write-Host "http://localhost:31672" -ForegroundColor Green -NoNewline
Write-Host " (admin/admin123)"
Write-Host "  • Elasticsearch: " -NoNewline
Write-Host "http://localhost:30920" -ForegroundColor Green

Write-Host "`n📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Desplegar microservicios:"
Write-Host "     cd ..\helm\fuel-system" -ForegroundColor Blue
Write-Host "     helm install fuel-system . \" -ForegroundColor Blue
Write-Host "       --namespace fuel-system \" -ForegroundColor Blue
Write-Host "       --values .\values.yaml \" -ForegroundColor Blue
Write-Host "       --values ..\..\local\values-local.yaml" -ForegroundColor Blue
Write-Host "`n  2. Verificar estado:"
Write-Host "     kubectl get pods -n fuel-system" -ForegroundColor Blue
Write-Host "     kubectl get svc -n fuel-system" -ForegroundColor Blue
Write-Host "`n  3. Ver logs:"
Write-Host "     kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system" -ForegroundColor Blue
Write-Host "`n  NOTA: Las imágenes de GHCR son públicas, no necesitas crear secret." -ForegroundColor Cyan

Write-Host "`n¡Todo listo! 🎉`n" -ForegroundColor Green
exit 0