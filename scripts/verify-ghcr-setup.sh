#!/bin/bash

# Script de verificación de configuración GHCR + Azure
# Este script verifica que todos los secrets y configuraciones necesarias estén presentes

echo "🔍 Verificando configuración de GHCR + Azure AKS..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar si una variable está configurada
check_secret() {
    local secret_name=$1
    local is_optional=$2

    if [ "$is_optional" = "optional" ]; then
        echo -e "${YELLOW}⚠️  $secret_name (OPCIONAL)${NC}"
    else
        echo -e "🔑 $secret_name"
    fi
}

echo "📋 Secrets que debes configurar en GitHub:"
echo "   Settings → Secrets and variables → Actions → Repository secrets"
echo ""

echo "=== GHCR (GitHub Container Registry) ==="
check_secret "GHCR_PAT" "required"
echo "   Cómo obtener: GitHub → Settings → Developer settings → Personal access tokens"
echo "   Permisos: write:packages, read:packages"
echo ""

echo "=== Azure AKS ==="
check_secret "AZURE_CREDENTIALS" "required"
echo "   Comando: az ad sp create-for-rbac --name fuel-system-github-actions --role contributor --sdk-auth"
check_secret "AKS_CLUSTER_NAME" "required"
echo "   Ejemplo: fuel-system-aks-cluster"
check_secret "AKS_RESOURCE_GROUP" "required"
echo "   Ejemplo: fuel-system-rg"
echo ""

echo "=== Azure PostgreSQL ==="
check_secret "POSTGRES_HOST" "required"
echo "   Ejemplo: fuel-system-postgres.postgres.database.azure.com"
check_secret "POSTGRES_USERNAME" "required"
echo "   Ejemplo: pgadmin"
check_secret "POSTGRES_PASSWORD" "required"
echo ""

echo "=== Servicios ==="
check_secret "RABBITMQ_PASSWORD" "required"
check_secret "JWT_SECRET" "required"
echo "   Generar: openssl rand -base64 32"
check_secret "SMTP_USER" "required"
echo "   Tu email de Gmail"
check_secret "SMTP_PASSWORD" "required"
echo "   Contraseña de aplicación de Gmail (no tu contraseña normal)"
check_secret "DOMAIN_NAME" "optional"
echo "   Ejemplo: fuel-system.tudominio.com"
echo ""

echo "=== Recursos de Azure que debes crear ==="
echo "✓ Resource Group"
echo "  az group create --name fuel-system-rg --location eastus"
echo ""
echo "✓ Azure Database for PostgreSQL Flexible Server"
echo "  az postgres flexible-server create --name fuel-system-postgres --resource-group fuel-system-rg ..."
echo ""
echo "✓ Bases de datos PostgreSQL"
echo "  - auth_db"
echo "  - driver_db"
echo "  - users_db"
echo "  - vehicles_db"
echo "  - vehicles_shadow_db"
echo ""
echo "✓ AKS Cluster"
echo "  az aks create --resource-group fuel-system-rg --name fuel-system-aks-cluster ..."
echo ""

echo "=== Verificación de imágenes en GHCR ==="
echo "Las imágenes estarán en:"
echo "  ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/api-gateway:latest"
echo "  ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/auth-svc:latest"
echo "  ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/driver-ms:latest"
echo "  ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/email-svc:latest"
echo "  ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/hello-svc:latest"
echo "  ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/logger-svc:latest"
echo "  ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/publisher-rabbit-srv:latest"
echo "  ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/users-srv:latest"
echo "  ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/vehicles-svc:latest"
echo ""

echo "=== Comandos útiles ==="
echo "Ver packages en GitHub:"
echo "  https://github.com/davidjosuep2?tab=packages"
echo ""
echo "Conectar kubectl a AKS:"
echo "  az aks get-credentials --resource-group fuel-system-rg --name fuel-system-aks-cluster"
echo ""
echo "Ver pods en AKS:"
echo "  kubectl get pods -n fuel-system"
echo ""
echo "Ver logs de un servicio:"
echo "  kubectl logs -f -n fuel-system deployment/fuel-system-api-gateway"
echo ""

echo -e "${GREEN}✅ Revisa que todos los secrets estén configurados en GitHub${NC}"
echo -e "${GREEN}✅ Revisa AZURE_GHCR_SETUP.md para la guía completa paso a paso${NC}"
echo ""

