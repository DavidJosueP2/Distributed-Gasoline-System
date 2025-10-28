#!/bin/bash

# ==============================================
# Script de Configuración de Azure - Fuel System
# ==============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"
LOCATION="${AZURE_LOCATION:-eastus}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-fuel-system-rg}"
ACR_NAME="${ACR_NAME:-fuelsystemacr}"
AKS_NAME="${AKS_CLUSTER_NAME:-fuel-system-aks}"
POSTGRES_NAME="${POSTGRES_NAME:-fuel-system-postgres}"
POSTGRES_ADMIN="${POSTGRES_ADMIN:-pgadmin}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-ChangeMe123!}"
NODE_COUNT="${NODE_COUNT:-3}"
NODE_SIZE="${NODE_SIZE:-Standard_D2s_v3}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Fuel System - Azure Setup${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Verificar si Azure CLI está instalado
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI no está instalado${NC}"
    echo "Instálalo desde: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Solicitar Subscription ID si no está configurado
if [ -z "$SUBSCRIPTION_ID" ]; then
    echo -e "${YELLOW}Selecciona tu suscripción de Azure:${NC}"
    az account list --output table
    echo ""
    read -p "Ingresa el Subscription ID: " SUBSCRIPTION_ID
fi

echo -e "${GREEN}🔐 Iniciando sesión en Azure...${NC}"
az login --output none || {
    echo -e "${RED}Error: No se pudo iniciar sesión en Azure${NC}"
    exit 1
}

echo -e "${GREEN}📝 Configurando suscripción: $SUBSCRIPTION_ID${NC}"
az account set --subscription "$SUBSCRIPTION_ID"

echo -e "${GREEN}📦 Creando Resource Group: $RESOURCE_GROUP${NC}"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

echo -e "${GREEN}🐳 Creando Azure Container Registry: $ACR_NAME${NC}"
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Standard \
  --location "$LOCATION" \
  --admin-enabled true \
  --output none

echo -e "${GREEN}☸️  Creando Azure Kubernetes Service: $AKS_NAME${NC}"
echo -e "${YELLOW}   Esto puede tomar varios minutos...${NC}"
az aks create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --node-count "$NODE_COUNT" \
  --node-vm-size "$NODE_SIZE" \
  --enable-managed-identity \
  --network-plugin azure \
  --network-policy azure \
  --attach-acr "$ACR_NAME" \
  --enable-addons monitoring,azure-keyvault-secrets-provider \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 10 \
  --location "$LOCATION" \
  --generate-ssh-keys \
  --output none

echo -e "${GREEN}📊 Obteniendo credenciales de AKS...${NC}"
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --overwrite-existing \
  --output none

echo -e "${GREEN}🗄️  Creando Azure Database for PostgreSQL: $POSTGRES_NAME${NC}"
echo -e "${YELLOW}   Esto puede tomar varios minutos...${NC}"
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$POSTGRES_NAME" \
  --location "$LOCATION" \
  --admin-user "$POSTGRES_ADMIN" \
  --admin-password "$POSTGRES_PASSWORD" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 16 \
  --high-availability Disabled \
  --public-access 0.0.0.0 \
  --output none

echo -e "${GREEN}📚 Creando bases de datos...${NC}"
for DB in auth_db driver_db users_db vehicles_db vehicles_shadow_db; do
  echo -e "   ${BLUE}→${NC} Creando base de datos: $DB"
  az postgres flexible-server db create \
    --resource-group "$RESOURCE_GROUP" \
    --server-name "$POSTGRES_NAME" \
    --database-name "$DB" \
    --output none
done

echo -e "${GREEN}🔐 Configurando firewall de PostgreSQL...${NC}"
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$POSTGRES_NAME" \
  --rule-name "AllowAll" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255 \
  --output none

echo -e "${GREEN}📈 Creando Application Insights...${NC}"
az monitor app-insights component create \
  --app fuel-system-insights \
  --location "$LOCATION" \
  --resource-group "$RESOURCE_GROUP" \
  --application-type web \
  --output none

echo -e "${GREEN}🔑 Obteniendo credenciales...${NC}"
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query passwords[0].value -o tsv)
POSTGRES_HOST="$POSTGRES_NAME.postgres.database.azure.com"

# Guardar credenciales en archivo
CREDS_FILE="azure-credentials.txt"
cat > "$CREDS_FILE" << EOF
================================================
FUEL SYSTEM - Azure Credentials
================================================
Creado: $(date)

Resource Group: $RESOURCE_GROUP
Location: $LOCATION

Azure Container Registry:
  Server: $ACR_LOGIN_SERVER
  Username: $ACR_USERNAME
  Password: $ACR_PASSWORD

Azure Kubernetes Service:
  Name: $AKS_NAME
  Nodes: $NODE_COUNT
  
PostgreSQL Server:
  Host: $POSTGRES_HOST
  Admin User: $POSTGRES_ADMIN
  Admin Password: $POSTGRES_PASSWORD
  Port: 5432
  
Bases de datos:
  - auth_db
  - driver_db
  - users_db
  - vehicles_db
  - vehicles_shadow_db

================================================
GitHub Secrets (copia estos en tu repositorio):
================================================

ACR_LOGIN_SERVER=$ACR_LOGIN_SERVER
ACR_USERNAME=$ACR_USERNAME
ACR_PASSWORD=$ACR_PASSWORD
AKS_CLUSTER_NAME=$AKS_NAME
AKS_RESOURCE_GROUP=$RESOURCE_GROUP
POSTGRES_HOST=$POSTGRES_HOST
POSTGRES_ADMIN=$POSTGRES_ADMIN
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

================================================
EOF

echo ""
echo -e "${GREEN}✅ ¡Configuración de Azure completada!${NC}"
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${YELLOW}📝 INFORMACIÓN IMPORTANTE${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}Las credenciales se han guardado en: $CREDS_FILE${NC}"
echo ""
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo ""
echo "Azure Container Registry:"
echo "  Server: $ACR_LOGIN_SERVER"
echo "  Username: $ACR_USERNAME"
echo ""
echo "Azure Kubernetes Service:"
echo "  Name: $AKS_NAME"
echo "  Nodes: $NODE_COUNT"
echo ""
echo "PostgreSQL Server:"
echo "  Host: $POSTGRES_HOST"
echo "  Admin User: $POSTGRES_ADMIN"
echo "  Port: 5432"
echo ""
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}🔄 Próximos pasos:${NC}"
echo "1. Revisa el archivo $CREDS_FILE"
echo "2. Configura los secrets en GitHub Actions"
echo "3. Ejecuta: kubectl get nodes"
echo "4. Ejecuta: make docker-login-acr"
echo "5. Ejecuta: make azure-build-push"
echo "6. Ejecuta: make helm-install"
echo ""
echo -e "${GREEN}¡Todo listo para desplegar! 🚀${NC}"
echo ""

