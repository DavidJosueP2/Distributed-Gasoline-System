# 🔧 Configuración de Azure para Fuel System

Esta guía te ayudará a configurar todos los recursos necesarios en Azure para desplegar el sistema.

## 📋 Recursos a Crear

1. Resource Group
2. Azure Container Registry (ACR)
3. Azure Kubernetes Service (AKS)
4. Azure Database for PostgreSQL Flexible Server
5. Azure Service Bus (opcional, alternativa a RabbitMQ)
6. Application Insights (monitoreo)

---

## 🚀 Script de Configuración Completo

Guarda este script como `setup-azure.sh`:

```bash
#!/bin/bash

# ==============================================
# Script de Configuración de Azure - Fuel System
# ==============================================

set -e

# Variables de configuración
SUBSCRIPTION_ID="tu-subscription-id"
LOCATION="eastus"
RESOURCE_GROUP="fuel-system-rg"
ACR_NAME="fuelsystemacr"
AKS_NAME="fuel-system-aks"
POSTGRES_NAME="fuel-system-postgres"
POSTGRES_ADMIN="pgadmin"
POSTGRES_PASSWORD="ChangeMe123!"
NODE_COUNT=3
NODE_SIZE="Standard_D2s_v3"

echo "🔐 Iniciando sesión en Azure..."
az login

echo "📝 Configurando suscripción..."
az account set --subscription "$SUBSCRIPTION_ID"

echo "📦 Creando Resource Group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

echo "🐳 Creando Azure Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Standard \
  --location "$LOCATION" \
  --admin-enabled true

echo "☸️ Creando Azure Kubernetes Service..."
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
  --generate-ssh-keys

echo "📊 Obteniendo credenciales de AKS..."
az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --overwrite-existing

echo "🗄️ Creando Azure Database for PostgreSQL..."
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
  --public-access 0.0.0.0

echo "📚 Creando bases de datos..."
for DB in auth_db driver_db users_db vehicles_db vehicles_shadow_db; do
  echo "  Creando base de datos: $DB"
  az postgres flexible-server db create \
    --resource-group "$RESOURCE_GROUP" \
    --server-name "$POSTGRES_NAME" \
    --database-name "$DB"
done

echo "🔐 Configurando firewall de PostgreSQL para AKS..."
AKS_OUTBOUND_IP=$(az aks show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_NAME" \
  --query "networkProfile.loadBalancerProfile.effectiveOutboundIps[0].id" \
  -o tsv | cut -d'/' -f9)

az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$POSTGRES_NAME" \
  --rule-name "AllowAKS" \
  --start-ip-address "$AKS_OUTBOUND_IP" \
  --end-ip-address "$AKS_OUTBOUND_IP"

echo "📈 Creando Application Insights..."
az monitor app-insights component create \
  --app fuel-system-insights \
  --location "$LOCATION" \
  --resource-group "$RESOURCE_GROUP" \
  --application-type web

echo "🔑 Obteniendo credenciales de ACR..."
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query passwords[0].value -o tsv)

echo ""
echo "✅ ¡Configuración de Azure completada!"
echo ""
echo "================================================"
echo "📝 INFORMACIÓN IMPORTANTE - GUARDA ESTOS VALORES"
echo "================================================"
echo ""
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo ""
echo "Azure Container Registry:"
echo "  Server: $ACR_LOGIN_SERVER"
echo "  Username: $ACR_USERNAME"
echo "  Password: $ACR_PASSWORD"
echo ""
echo "Azure Kubernetes Service:"
echo "  Name: $AKS_NAME"
echo "  Nodes: $NODE_COUNT"
echo ""
echo "PostgreSQL Server:"
echo "  Host: $POSTGRES_NAME.postgres.database.azure.com"
echo "  Admin User: $POSTGRES_ADMIN"
echo "  Admin Password: $POSTGRES_PASSWORD"
echo "  Port: 5432"
echo ""
echo "================================================"
echo ""
echo "🔄 Próximos pasos:"
echo "1. Configura estos valores como secrets en GitHub Actions"
echo "2. Actualiza el archivo .env con estos valores"
echo "3. Ejecuta: kubectl get nodes"
echo "4. Construye y sube las imágenes Docker"
echo ""
```

---

## ⚙️ Usar el Script

```bash
# Dar permisos de ejecución
chmod +x setup-azure.sh

# Ejecutar
./setup-azure.sh
```

---

## 🔐 Configurar GitHub Secrets

Después de ejecutar el script, configura estos secrets en GitHub:

```bash
# Navega a tu repositorio en GitHub
# Settings → Secrets and variables → Actions → New repository secret

# Agrega cada uno de estos:
ACR_LOGIN_SERVER=<ACR_LOGIN_SERVER del script>
ACR_USERNAME=<ACR_USERNAME del script>
ACR_PASSWORD=<ACR_PASSWORD del script>
AKS_CLUSTER_NAME=fuel-system-aks
AKS_RESOURCE_GROUP=fuel-system-rg
POSTGRES_HOST=fuel-system-postgres.postgres.database.azure.com
POSTGRES_PASSWORD=<POSTGRES_PASSWORD del script>
RABBITMQ_PASSWORD=admin123
JWT_SECRET=tu-jwt-secret-seguro
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
DOMAIN_NAME=fuel-system.tudominio.com
```

---

## 🔑 Crear Service Principal para GitHub Actions

```bash
# Crear service principal con permisos de contributor
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az ad sp create-for-rbac \
  --name "fuel-system-github-actions" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/fuel-system-rg \
  --sdk-auth

# Copia todo el output JSON y créalo como secret AZURE_CREDENTIALS en GitHub
```

---

## 💰 Estimación de Costos (Región East US)

| Recurso | Tipo | Costo Mensual (USD) |
|---------|------|---------------------|
| AKS (3 nodos D2s_v3) | Compute | ~$220 |
| PostgreSQL Flexible Server (D2s_v3) | Database | ~$180 |
| Azure Container Registry (Standard) | Storage | ~$20 |
| Application Insights | Monitoring | ~$10 |
| Load Balancer | Networking | ~$20 |
| **Total Estimado** | | **~$450/mes** |

> Nota: Los costos pueden variar según el uso real y la región.

---

## 🎛️ Configuración Avanzada

### Habilitar Azure Key Vault

```bash
# Crear Key Vault
az keyvault create \
  --name fuel-system-kv \
  --resource-group fuel-system-rg \
  --location eastus

# Agregar secrets
az keyvault secret set --vault-name fuel-system-kv --name "postgres-password" --value "tu-password"
az keyvault secret set --vault-name fuel-system-kv --name "jwt-secret" --value "tu-jwt-secret"

# Dar permisos a AKS
AKS_IDENTITY=$(az aks show --resource-group fuel-system-rg --name fuel-system-aks --query identityProfile.kubeletidentity.clientId -o tsv)

az keyvault set-policy \
  --name fuel-system-kv \
  --object-id $AKS_IDENTITY \
  --secret-permissions get list
```

### Configurar Azure Service Bus (alternativa a RabbitMQ)

```bash
# Crear namespace de Service Bus
az servicebus namespace create \
  --resource-group fuel-system-rg \
  --name fuel-system-servicebus \
  --location eastus \
  --sku Standard

# Crear queue
az servicebus queue create \
  --resource-group fuel-system-rg \
  --namespace-name fuel-system-servicebus \
  --name logs-queue

# Obtener connection string
az servicebus namespace authorization-rule keys list \
  --resource-group fuel-system-rg \
  --namespace-name fuel-system-servicebus \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString -o tsv
```

### Configurar Azure Files para Volúmenes Persistentes

```bash
# Crear storage account
az storage account create \
  --resource-group fuel-system-rg \
  --name fuelsystemstorage \
  --location eastus \
  --sku Standard_LRS

# Crear file share
az storage share create \
  --account-name fuelsystemstorage \
  --name fuel-system-data \
  --quota 100
```

---

## 🔒 Seguridad

### Network Security

```bash
# Crear Network Security Group
az network nsg create \
  --resource-group fuel-system-rg \
  --name fuel-system-nsg \
  --location eastus

# Reglas de seguridad
az network nsg rule create \
  --resource-group fuel-system-rg \
  --nsg-name fuel-system-nsg \
  --name AllowHTTPS \
  --priority 100 \
  --destination-port-ranges 443 \
  --protocol Tcp \
  --access Allow
```

### Private Endpoints

```bash
# Crear private endpoint para PostgreSQL
az network private-endpoint create \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres-pe \
  --location eastus \
  --connection-name postgres-connection \
  --private-connection-resource-id $(az postgres flexible-server show --resource-group fuel-system-rg --name fuel-system-postgres --query id -o tsv) \
  --group-id postgresqlServer \
  --vnet-name <tu-vnet> \
  --subnet <tu-subnet>
```

---

## 📊 Monitoreo

### Configurar Alertas

```bash
# Crear action group
az monitor action-group create \
  --resource-group fuel-system-rg \
  --name fuel-system-alerts \
  --short-name fsalerts \
  --email-receiver name=admin email=admin@example.com

# Crear alerta de CPU
az monitor metrics alert create \
  --name high-cpu-alert \
  --resource-group fuel-system-rg \
  --scopes $(az aks show --resource-group fuel-system-rg --name fuel-system-aks --query id -o tsv) \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action fuel-system-alerts
```

---

## 🗑️ Limpieza de Recursos

```bash
# Eliminar todo el resource group (¡cuidado!)
az group delete --name fuel-system-rg --yes --no-wait

# O eliminar recursos individuales
az aks delete --resource-group fuel-system-rg --name fuel-system-aks --yes --no-wait
az acr delete --resource-group fuel-system-rg --name fuelsystemacr --yes
az postgres flexible-server delete --resource-group fuel-system-rg --name fuel-system-postgres --yes
```

---

## 📚 Referencias

- [Azure CLI Documentation](https://docs.microsoft.com/en-us/cli/azure/)
- [AKS Best Practices](https://docs.microsoft.com/en-us/azure/aks/best-practices)
- [Azure PostgreSQL Flexible Server](https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/)
- [Azure Container Registry](https://docs.microsoft.com/en-us/azure/container-registry/)

---

**¡Éxito con tu infraestructura en Azure! 🚀**

