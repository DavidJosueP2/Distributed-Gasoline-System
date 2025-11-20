# 📦 Fase 1: Configuración Base de Azure

> **Tiempo estimado**: 20 minutos  
> **Prerequisitos**: Cuenta de Azure activa

---

## 📋 Objetivos de esta Fase

Al finalizar esta fase, tendrás:

- ✅ Azure CLI instalado y configurado
- ✅ Resource Group creado
- ✅ Service Principal para automatización
- ✅ GitHub Secrets configurados para CI/CD
- ❌ **NO se requiere ACR** (usarás GHCR - GitHub Container Registry público)

> **💡 NOTA IMPORTANTE**: Esta guía **NO incluye Azure Container Registry (ACR)** porque usarás imágenes públicas desde **GitHub Container Registry (GHCR)**. Esto simplifica el setup y elimina costos adicionales (~$20-200/mes).

**✅ Ventajas de usar GHCR en lugar de ACR:**
- 💰 **Sin costo**: Imágenes públicas son 100% gratis
- 🚀 **Sin configuración**: No necesitas crear registry ni configurar permisos
- 🔓 **Sin secrets**: No necesitas imagePullSecrets en Kubernetes
- 📦 **Integración nativa**: Ya funciona con GitHub Actions
- ∞ **Bandwidth ilimitado**: Sin límites para imágenes públicas

---

## 1. Instalación de Azure CLI

### Windows (PowerShell)

```powershell
# Opción 1: Instalador MSI (Recomendado)
# Descarga desde: https://aka.ms/installazurecliwindows

# Opción 2: Con Chocolatey
choco install azure-cli -y

# Verificar instalación
az --version
```

### macOS

```bash
# Con Homebrew
brew update && brew install azure-cli

# Verificar instalación
az --version
```

### Linux (Ubuntu/Debian)

```bash
# Instalación con script oficial
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verificar instalación
az --version
```

### Verificar versión

```bash
az --version
# Debe mostrar versión 2.50.0 o superior
```

---

## 2. Login a Azure

```bash
# Login interactivo (abre el navegador)
az login

# Si tienes múltiples suscripciones, lista y selecciona una
az account list --output table

# Establecer la suscripción activa
az account set --subscription "NOMBRE_O_ID_DE_TU_SUSCRIPCION"

# Verificar la suscripción activa
az account show --output table
```

**Guarda estos datos:**
```bash
# Obtener ID de suscripción (lo necesitarás después)
az account show --query id -o tsv

# Ejemplo de output: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 3. Definir Variables de Entorno

### Windows PowerShell

```powershell
# Variables principales
$RESOURCE_GROUP = "fuel-system-rg"
$LOCATION = "eastus"
$SUBSCRIPTION_ID = (az account show --query id -o tsv)

# Verificar variables
Write-Host "Resource Group: $RESOURCE_GROUP"
Write-Host "Location: $LOCATION"
Write-Host "Subscription ID: $SUBSCRIPTION_ID"
```

### Linux/macOS (Bash)

```bash
# Variables principales
export RESOURCE_GROUP="fuel-system-rg"
export LOCATION="eastus"
export SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Verificar variables
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Subscription ID: $SUBSCRIPTION_ID"
```

---

## 4. Crear Resource Group

```bash
# Crear el Resource Group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Verificar creación
az group show --name $RESOURCE_GROUP --output table
```

**Output esperado:**
```
Name              Location    Status
----------------  ----------  ---------
fuel-system-rg    eastus      Succeeded
```

---

## 5. Crear Service Principal para GitHub Actions

El Service Principal permitirá que GitHub Actions despliegue recursos automáticamente.

### Crear Service Principal

```bash
# Crear Service Principal con rol Contributor
az ad sp create-for-rbac \
  --name "fuel-system-github-actions" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth

# Output (JSON completo - GUARDA TODO):
# {
#   "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "clientSecret": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
#   "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   ...
# }
```

**⚠️ IMPORTANTE**: Guarda TODO el JSON output. Lo necesitarás para configurar GitHub Secrets.

### Dar permisos adicionales al Service Principal (Opcional)

Si necesitas que GitHub Actions cree recursos fuera del Resource Group:

```bash
# Dar permisos a nivel de suscripción (opcional)
az ad sp create-for-rbac \
  --name "fuel-system-github-actions-full" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID \
  --sdk-auth
```

---

## 6. Configurar GitHub Secrets

Ve a tu repositorio en GitHub: **Settings → Secrets and variables → Actions → New repository secret**

Configura los siguientes secrets:

### Secrets Obligatorios para Azure

| Secret Name | Valor | Descripción |
|-------------|-------|-------------|
| `AZURE_CREDENTIALS` | Todo el JSON del Service Principal | Credenciales para Azure login |
| `AKS_RESOURCE_GROUP` | `fuel-system-rg` | Nombre del Resource Group |
| `AKS_CLUSTER_NAME` | `fuel-system-aks` | Nombre del cluster AKS (se crea en Fase 3) |

### Secrets para PostgreSQL (Fase 2)

| Secret Name | Valor | Descripción |
|-------------|-------|-------------|
| `POSTGRES_HOST` | Se configura en Fase 2 | Host del servidor PostgreSQL |
| `POSTGRES_READ_HOST` | Se configura en Fase 2 | Host de la réplica de lectura |
| `POSTGRES_USERNAME` | `pgadmin` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | `PASSWORD_SEGURO` | Password de PostgreSQL |

### Secrets para Microservicios (Fase 6)

| Secret Name | Valor | Descripción |
|-------------|-------|-------------|
| `JWT_SECRET` | `openssl rand -base64 32` | Secret para JWT tokens |
| `RABBITMQ_PASSWORD` | `PASSWORD_SEGURO` | Password de RabbitMQ |
| `SMTP_USER` | `tu-email@gmail.com` | Email para SMTP |
| `SMTP_PASSWORD` | `app-password` | App password de Gmail |

### Generar JWT Secret

```bash
# En Linux/macOS/Git Bash
openssl rand -base64 32

# En PowerShell
$bytes = New-Object byte[] 32
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

### Verificar Secrets en GitHub

Después de configurar, deberías ver algo así:

```
✅ AZURE_CREDENTIALS
✅ AKS_RESOURCE_GROUP
✅ AKS_CLUSTER_NAME
✅ JWT_SECRET
✅ RABBITMQ_PASSWORD
```

---

## 7. Verificación de GHCR (GitHub Container Registry)

### Verificar que tus imágenes están publicadas

Tus imágenes ya están disponibles en GHCR como paquetes públicos:

```
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/auth-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/driver-ms
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/users-srv
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/vehicles-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/routes-srv
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/fuel-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/email-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/logger-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/publisher-rabbit-srv
```

### Probar acceso a GHCR desde tu máquina local

```bash
# No necesitas login porque las imágenes son públicas
# Intenta hacer pull de una imagen para verificar acceso
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest

# Si funciona, verás:
# latest: Pulling from davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway
# ...
# Status: Downloaded newer image for ghcr.io/...

# Verificar imagen
docker images | grep ghcr.io
```

### Ventajas de Usar GHCR

✅ **Sin costo adicional**: Las imágenes públicas son gratis  
✅ **Sin configuración compleja**: No necesitas ACR ni imagePullSecrets  
✅ **Integración nativa**: Ya está integrado con tu GitHub Actions  
✅ **Ya está funcionando**: Tus imágenes ya están publicadas (7-45 descargas)  
✅ **Bandwidth ilimitado**: Para imágenes públicas  

---

## 8. Verificación de la Fase 1

### Checklist de Verificación

Ejecuta estos comandos para verificar que todo está correcto:

```bash
# 1. Verificar Azure CLI
az --version

# 2. Verificar login
az account show --output table

# 3. Verificar Resource Group
az group show --name $RESOURCE_GROUP --output table

# 4. Verificar acceso a GHCR (opcional)
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
```

### Test de Service Principal

```bash
# Test del Service Principal (usa el clientId y clientSecret del JSON)
az login --service-principal \
  --username <clientId> \
  --password <clientSecret> \
  --tenant <tenantId>

# Verificar acceso
az group show --name $RESOURCE_GROUP --output table

# Volver a tu usuario normal
az login
```

---

## 9. Estructura de Comandos Resumen

### PowerShell Script Completo

Guarda este script como `setup-azure-base.ps1`:

```powershell
# Variables
$RESOURCE_GROUP = "fuel-system-rg"
$LOCATION = "eastus"
$SUBSCRIPTION_ID = (az account show --query id -o tsv)

Write-Host "🚀 Configurando Azure para Fuel System..." -ForegroundColor Cyan
Write-Host "⚠️  NOTA: No se configurará ACR (usaremos GHCR)" -ForegroundColor Yellow

# Login
Write-Host "`n🔐 Login a Azure..."
az login

# Establecer suscripción
Write-Host "`n📋 Estableciendo suscripción..."
az account set --subscription $SUBSCRIPTION_ID

# Crear Resource Group
Write-Host "`n📦 Creando Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

Write-Host "`n✅ Setup base completo!" -ForegroundColor Green
Write-Host "`nResource Group: $RESOURCE_GROUP"
Write-Host "Location: $LOCATION"

Write-Host "`n🎯 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Crear Service Principal para GitHub Actions:"
Write-Host "   az ad sp create-for-rbac --name 'fuel-system-github-actions' --role contributor --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP --sdk-auth"
Write-Host "`n2. Guardar el JSON output completo"
Write-Host "`n3. Configurar GitHub Secrets con el JSON"
Write-Host "`n4. Verificar acceso a GHCR:"
Write-Host "   docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest"
```

Ejecutar:
```powershell
.\setup-azure-base.ps1
```

---

## 10. Comparación: ACR vs GHCR

Para tu información, aquí está la diferencia entre usar ACR (no incluido) y GHCR (que usarás):

| Aspecto | GHCR (Tu setup actual) ✅ | ACR (No necesario) ❌ |
|---------|---------------------------|----------------------|
| **Costo** | $0 (imágenes públicas) | $20-200/mes |
| **Setup** | Ya está listo | Requiere configuración |
| **Autenticación en K8s** | No necesaria | Requiere imagePullSecret o integración |
| **Integración CI/CD** | Nativa con GitHub Actions | Requiere configuración extra |
| **Bandwidth** | Ilimitado (público) | Limitado según tier |
| **Tiempo de setup** | 0 minutos (ya está) | 15-20 minutos |

**Conclusión**: GHCR es perfecto para tu caso ya que:
- ✅ Tus imágenes ya están publicadas
- ✅ Son públicas (no necesitas autenticación)
- ✅ Ahorras $20-200/mes
- ✅ Menos complejidad de configuración

---

## 11. Troubleshooting

### Error: "The subscription is not registered to use namespace"

```bash
# Si necesitas usar algún servicio de Azure, registra el provider
az provider register --namespace Microsoft.ContainerService  # Para AKS
az provider register --namespace Microsoft.DBforPostgreSQL  # Para PostgreSQL

# Verificar estado
az provider show -n Microsoft.ContainerService --query "registrationState"
```

### Error: "Insufficient permissions"

Tu cuenta necesita permisos de Contributor o Owner:

```bash
# Verificar tus roles
az role assignment list --assignee $(az account show --query user.name -o tsv) --output table

# Si no tienes permisos, contacta al administrador de tu suscripción
```

### No puedo hacer pull de imágenes de GHCR

```bash
# Verificar conectividad
curl -I https://ghcr.io

# Verificar que Docker está corriendo
docker ps

# Verificar que la imagen existe
# Ve a: https://github.com/DavidJosueP2/distributed-gasoline-system/pkgs/container/fuel-system%2Fapi-gateway

# Si la imagen es privada (no debería serlo), necesitarás:
# echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

---

## 12. Limpieza (si necesitas empezar de nuevo)

```bash
# ⚠️ CUIDADO: Esto elimina TODOS los recursos

# Eliminar el Resource Group (elimina todo dentro)
az group delete --name $RESOURCE_GROUP --yes --no-wait

# Verificar eliminación
az group list --output table
```

---

## ✅ Fase 1 Completada

Si llegaste hasta aquí, ¡felicitaciones! Tienes:

- ✅ Azure CLI configurado
- ✅ Resource Group creado
- ✅ Service Principal para GitHub Actions
- ✅ GitHub Secrets configurados
- ✅ Acceso verificado a GHCR
- ✅ **NO necesitas ACR** (ahorro de $20-200/mes)

**Tiempo total**: ~20 minutos (más rápido sin ACR)

---

## 📍 Próximo Paso

Continúa con: **[Fase 2: Configuración de PostgreSQL con HA](./02-AZURE-POSTGRESQL.md)**

En la Fase 2 crearás:
- Azure Database for PostgreSQL Flexible Server con **Alta Disponibilidad**
- **Réplica de lectura** para mejorar rendimiento
- 6 bases de datos para los microservicios
- Configuración de firewall y SSL
- Testing de conexión y failover

---

**¡Excelente trabajo! 🎉**
