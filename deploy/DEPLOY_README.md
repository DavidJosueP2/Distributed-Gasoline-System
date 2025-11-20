# 🚀 Guía de Despliegue - Fuel System

## 📋 Resumen Ejecutivo

Sistema completamente automatizado con **GitHub Actions** para build, push a GHCR y deploy a AKS.

## 🎯 Flujo Completo

```
Developer                GitHub Actions           Azure
   │                          │                     │
   │  git push origin main    │                     │
   ├─────────────────────────►│                     │
   │                          │                     │
   │                          │ Build 9 imágenes    │
   │                          │ Push a GHCR         │
   │                          │                     │
   │                          │ Deploy con Helm     │
   │                          ├────────────────────►│
   │                          │                     │
   │                          │ ✅ Pods running     │
   │◄─────────────────────────┤◄────────────────────┤
   │  Deploy completado       │                     │
```

## 🔧 Configuración Inicial (Una sola vez)

### 1. Crear Recursos en Azure

```bash
# Variables
RESOURCE_GROUP="fuel-system-rg"
LOCATION="northcentralus"
AKS_NAME="fuel-system-aks"
POSTGRES_SERVER="fuel-system-postgres"

# 1. Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. AKS Cluster
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-managed-identity \
  --generate-ssh-keys

# 3. PostgreSQL Flexible Server con HA
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --location $LOCATION \
  --admin-user pgadmin \
  --admin-password FuelSystem2024@Secure \
  --version 17 \
  --tier GeneralPurpose \
  --sku-name Standard_D4ads_v5 \
  --high-availability SameZone \
  --storage-size 128 \
  --backup-retention 7 \
  --geo-redundant-backup Disabled \
  --public-access 0.0.0.0-255.255.255.255

# 4. Réplica de Lectura
az postgres flexible-server replica create \
  --replica-name fuel-system-postgres-read \
  --resource-group $RESOURCE_GROUP \
  --source-server $POSTGRES_SERVER \
  --location $LOCATION \
  --tier GeneralPurpose \
  --sku-name Standard_D4ads_v5

# 5. Firewall para Azure Services
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 6. Crear bases de datos
for DB in auth_db driver_db users_db vehicles_db vehicles_shadow_db routes_db; do
  az postgres flexible-server db create \
    --resource-group $RESOURCE_GROUP \
    --server-name $POSTGRES_SERVER \
    --database-name $DB
done
```

### 2. Obtener Credenciales

```bash
# Service Principal para GitHub Actions
az ad sp create-for-rbac \
  --name "fuel-system-github-actions" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
# Guarda TODO el JSON
```

### 3. Configurar GitHub Secrets

Ve a: **GitHub Repo → Settings → Secrets → Actions → New repository secret**

```
AZURE_CREDENTIALS       # JSON completo del service principal
AKS_CLUSTER_NAME        # fuel-system-aks
AKS_RESOURCE_GROUP      # fuel-system-rg
POSTGRES_HOST           # fuel-system-postgres.postgres.database.azure.com
POSTGRES_READ_HOST      # fuel-system-postgres-read.postgres.database.azure.com
POSTGRES_USERNAME       # pgadmin
POSTGRES_PASSWORD       # FuelSystem2024@Secure
JWT_SECRET              # openssl rand -base64 32
SMTP_USER               # tu-email@gmail.com
SMTP_PASSWORD           # App password de Gmail
RABBITMQ_PASSWORD       # Password seguro para RabbitMQ
DOMAIN_NAME (opcional)  # Para ingress
```

## 🚀 Despliegue

### Opción 1: Automático (Solo Build a GHCR - Actual)

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

**Resultado:**
- ✅ Build de 9 imágenes Docker
- ✅ Push a GHCR con tags `latest` y `main-{sha}`
- ❌ Deploy a AKS (deshabilitado temporalmente)

### Opción 2: Completo con Deploy (Futuro)

Descomentar en `.github/workflows/deploy-to-azure.yml`:

```yaml
on:
  workflow_run:
    workflows: ["Build and Push Docker Images"]
    types:
      - completed
    branches:
      - main
```

Luego:
```bash
git push origin main
```

**Resultado:**
- ✅ Build de 9 imágenes
- ✅ Push a GHCR
- ✅ Deploy automático a AKS
- ✅ Migraciones de DB
- ✅ Verificación de pods

### Opción 3: Deploy Manual

1. Ve a GitHub → Actions → Deploy to Azure AKS
2. Click "Run workflow"
3. Selecciona environment: production
4. Click "Run workflow"

## 📊 Verificación

### Desde Azure Portal

1. Ve a Azure Portal → Kubernetes services
2. Selecciona `fuel-system-aks`
3. Ve a Workloads → Pods
4. Verifica que todos estén "Running"

### Desde kubectl

```bash
# Conectar a AKS
az aks get-credentials \
  --resource-group fuel-system-rg \
  --name fuel-system-aks

# Ver todos los pods
kubectl get pods -n fuel-system

# Ver servicios
kubectl get services -n fuel-system

# Obtener IP del API Gateway
kubectl get service fuel-system-api-gateway -n fuel-system

# Ver logs de un pod
kubectl logs <pod-name> -n fuel-system

# Verificar conexión a PostgreSQL desde un pod
kubectl exec -it <pod-name> -n fuel-system -- sh
# Dentro del pod:
psql "host=fuel-system-postgres.postgres.database.azure.com port=5432 dbname=auth_db user=pgadmin password=FuelSystem2024@Secure sslmode=require"
```

## 📝 Notas Importantes

### Configuración de PostgreSQL

- **Version**: PostgreSQL 17
- **Tier**: GeneralPurpose
- **SKU**: Standard_D4ads_v5 (4 vCores, 16 GB RAM)
- **Storage**: 128 GB
- **HA**: Same-Zone (failover automático)
- **Réplica**: fuel-system-postgres-read (para queries SELECT)
- **SSL**: Requerido (sslmode=require)
- **Costo**: ~$638/mes (primario + réplica)

### Connection Strings

```bash
# Primario (escritura)
postgresql://pgadmin:FuelSystem2024@Secure@fuel-system-postgres.postgres.database.azure.com:5432/auth_db?sslmode=require

# Réplica (lectura)
postgresql://pgadmin:FuelSystem2024@Secure@fuel-system-postgres-read.postgres.database.azure.com:5432/auth_db?sslmode=require
```

## 🔥 Troubleshooting

### Error: ImagePullBackOff

**Causa:** AKS no puede descargar de ACR

**Solución:**
```bash
az aks update \
  --name fuel-system-aks \
  --resource-group fuel-system-rg \
  --attach-acr fuelsystemacr
```

### Error: CrashLoopBackOff

**Causa:** Problema con variables de entorno o DB

**Solución:**
```bash
# Ver logs
kubectl logs <pod-name> -n fuel-system

# Verificar secrets
kubectl get secrets -n fuel-system
kubectl describe secret postgresql-credentials -n fuel-system

# Verificar conexión a PostgreSQL
kubectl run -it --rm debug --image=postgres:16 --restart=Never -n fuel-system -- \
  psql -h fuel-system-postgres.postgres.database.azure.com -U pgadmin -d auth_db
```

### Migraciones de Prisma fallan

**Causa:** initContainer no puede conectar a PostgreSQL

**Solución:**
```bash
# Verificar firewall de PostgreSQL
az postgres flexible-server firewall-rule list \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres

# Asegurar que Azure Services puede acceder
az postgres flexible-server firewall-rule create \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## 🔄 Rollback

Si algo sale mal:

```bash
# Ver historial
helm history fuel-system -n fuel-system

# Rollback
helm rollback fuel-system <revision> -n fuel-system
```

## 📚 Documentación Relacionada

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura completa del sistema
- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) - Guía de migraciones de DB
- [SEEDING_STRATEGY.md](./SEEDING_STRATEGY.md) - Estrategia de datos iniciales
- [../README.md](../README.md) - README principal del proyecto

## ✅ Checklist de Deploy

- [ ] Recursos de Azure creados
- [ ] Todos los GitHub Secrets configurados
- [ ] Service Principal creado
- [ ] AKS tiene acceso a ACR
- [ ] PostgreSQL acepta conexiones de Azure
- [ ] Bases de datos creadas
- [ ] Push a main ejecutado
- [ ] Imágenes en ACR verificadas
- [ ] (Futuro) Pods running en AKS
- [ ] (Futuro) API Gateway accesible

---

**¡El sistema está listo para despliegue!** 🚀
