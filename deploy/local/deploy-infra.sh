#!/bin/bash
# ==============================================
# Script de Despliegue Local - Fuel System
# ==============================================
# Este script automatiza el despliegue completo en Kubernetes local

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🚀 Fuel System - Despliegue Local con Kubernetes${NC}"
echo -e "${BLUE}================================================${NC}"

# Variables
NAMESPACE="fuel-system"
CLUSTER_NAME="fuel-local"

# Función para imprimir mensajes
print_step() {
    echo -e "\n${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "\n${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Verificar que kubectl esté instalado
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl no está instalado. Por favor, instálalo primero."
    exit 1
fi

# Verificar que helm esté instalado
if ! command -v helm &> /dev/null; then
    print_error "helm no está instalado. Por favor, instálalo primero."
    exit 1
fi

print_step "Herramientas verificadas (kubectl, helm)"

# Crear namespace
print_info "Creando namespace $NAMESPACE..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
print_step "Namespace $NAMESPACE creado/verificado"

# Agregar repos de Helm
print_info "Agregando repositorios de Helm..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add elastic https://helm.elastic.co
helm repo update
print_step "Repositorios de Helm actualizados"

# Desplegar PostgreSQL - Auth DB
print_info "Desplegando Auth DB (PostgreSQL)..."
helm upgrade --install auth-db bitnami/postgresql \
  --namespace $NAMESPACE \
  --set auth.username=postgres \
  --set auth.password=root \
  --set auth.database=auth_db \
  --set primary.persistence.size=2Gi \
  --set primary.resources.requests.memory=256Mi \
  --set primary.resources.requests.cpu=100m \
  --wait --timeout 5m
print_step "Auth DB desplegada"

# Desplegar PostgreSQL - Driver DB
print_info "Desplegando Driver DB (PostgreSQL)..."
helm upgrade --install driver-db bitnami/postgresql \
  --namespace $NAMESPACE \
  --set auth.username=postgres \
  --set auth.password=root \
  --set auth.database=driver_db \
  --set primary.persistence.size=2Gi \
  --set primary.resources.requests.memory=256Mi \
  --set primary.resources.requests.cpu=100m \
  --wait --timeout 5m
print_step "Driver DB desplegada"

# Desplegar PostgreSQL - Users DB
print_info "Desplegando Users DB (PostgreSQL)..."
helm upgrade --install users-db bitnami/postgresql \
  --namespace $NAMESPACE \
  --set auth.username=postgres \
  --set auth.password=root \
  --set auth.database=users_db \
  --set primary.persistence.size=2Gi \
  --set primary.resources.requests.memory=256Mi \
  --set primary.resources.requests.cpu=100m \
  --wait --timeout 5m
print_step "Users DB desplegada"

# Desplegar PostgreSQL - Vehicles DB
print_info "Desplegando Vehicles DB (PostgreSQL)..."
helm upgrade --install vehicles-db bitnami/postgresql \
  --namespace $NAMESPACE \
  --set auth.username=postgres \
  --set auth.password=root \
  --set auth.database=vehicles_db \
  --set primary.persistence.size=2Gi \
  --set primary.resources.requests.memory=256Mi \
  --set primary.resources.requests.cpu=100m \
  --wait --timeout 5m
print_step "Vehicles DB desplegada"

# Desplegar PostgreSQL - Vehicles Shadow DB
print_info "Desplegando Vehicles Shadow DB (PostgreSQL)..."
helm upgrade --install vehicles-shadow-db bitnami/postgresql \
  --namespace $NAMESPACE \
  --set auth.username=postgres \
  --set auth.password=root \
  --set auth.database=vehicles_shadow_db \
  --set primary.persistence.size=2Gi \
  --set primary.resources.requests.memory=256Mi \
  --set primary.resources.requests.cpu=100m \
  --wait --timeout 5m
print_step "Vehicles Shadow DB desplegada"

# Desplegar PostgreSQL - Routes DB
print_info "Desplegando Routes DB (PostgreSQL)..."
helm upgrade --install routes-db bitnami/postgresql \
  --namespace $NAMESPACE \
  --set auth.username=postgres \
  --set auth.password=root \
  --set auth.database=routes_db \
  --set primary.persistence.size=2Gi \
  --set primary.resources.requests.memory=256Mi \
  --set primary.resources.requests.cpu=100m \
  --wait --timeout 5m
print_step "Routes DB desplegada"

# Desplegar RabbitMQ (usando imagen legacy gratuita)
print_info "Desplegando RabbitMQ..."
helm upgrade --install rabbitmq bitnami/rabbitmq \
  -n $NAMESPACE --create-namespace \
  --set auth.username=admin \
  --set auth.password=admin123 \
  --set replicaCount=1 \
  --set service.type=NodePort \
  --set service.nodePorts.amqp=30672 \
  --set service.nodePorts.manager=31672 \
  --set image.registry=docker.io \
  --set image.repository=bitnamilegacy/rabbitmq \
  --set image.tag=3.13.7-debian-12-r4 \
  --set persistence.enabled=true \
  --set persistence.size=8Gi \
  --set volumePermissions.enabled=true \
  --set volumePermissions.image.registry=docker.io \
  --set volumePermissions.image.repository=bitnamilegacy/os-shell \
  --set volumePermissions.image.tag=12-debian-12-r50 \
  --set global.security.allowInsecureImages=true \
  --wait --debug --timeout 10m
print_step "RabbitMQ desplegado"

# Desplegar Elasticsearch
print_info "Desplegando Elasticsearch..."
helm upgrade --install elasticsearch elastic/elasticsearch \
  --namespace $NAMESPACE --create-namespace \
  --version 7.17.3 \
  --set replicas=1 \
  --set resources.requests.memory=1Gi \
  --set resources.requests.cpu=500m \
  --set resources.limits.memory=2Gi \
  --set resources.limits.cpu=1000m \
  --set persistence.enabled=true \
  --set volumeClaimTemplate.resources.requests.storage=5Gi \
  --set service.type=NodePort \
  --set service.nodePort=30920 \
  --set image=docker.elastic.co/elasticsearch/elasticsearch \
  --set imageTag=7.17.3 \
  --set readinessProbe.initialDelaySeconds=45 \
  --set readinessProbe.periodSeconds=10 \
  --set readinessProbe.failureThreshold=12 \
  --timeout 10m \
  --wait --debug
print_step "Elasticsearch desplegado"

# Desplegar Eureka Server
print_info "Desplegando Eureka Server..."
kubectl apply -f ./eureka-deployment.yaml
kubectl wait --for=condition=available --timeout=300s deployment/eureka-server -n $NAMESPACE
print_step "Eureka Server desplegado"

# Mostrar estado
print_step "Infraestructura desplegada exitosamente"

echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}✓ Despliegue completado${NC}"
echo -e "${BLUE}================================================${NC}"

echo -e "\n${YELLOW}📊 Estado de los recursos:${NC}"
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE

echo -e "\n${YELLOW}🌐 Acceso a servicios:${NC}"
echo -e "  • Eureka Dashboard: ${GREEN}http://localhost:30761${NC}"
echo -e "  • RabbitMQ Management: ${GREEN}http://localhost:31672${NC} (admin/admin123)"
echo -e "  • Elasticsearch: ${GREEN}http://localhost:30920${NC}"

echo -e "\n${YELLOW}📝 Próximos pasos:${NC}"
echo -e "  1. Desplegar microservicios:"
echo -e "     ${BLUE}cd ../helm/fuel-system${NC}"
echo -e "     ${BLUE}helm install fuel-system . \\${NC}"
echo -e "     ${BLUE}  --namespace fuel-system \\${NC}"
echo -e "     ${BLUE}  --values ./values.yaml \\${NC}"
echo -e "     ${BLUE}  --values ../../local/values-local.yaml${NC}"
echo -e "\n  2. Verificar estado:"
echo -e "     ${BLUE}kubectl get pods -n fuel-system${NC}"
echo -e "     ${BLUE}kubectl get svc -n fuel-system${NC}"
echo -e "\n  3. Ver logs:"
echo -e "     ${BLUE}kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system${NC}"
echo -e "\n  ${BLUE}NOTA: Las imágenes de GHCR son públicas, no necesitas crear secret.${NC}"

echo -e "\n${GREEN}¡Todo listo! 🎉${NC}\n"
