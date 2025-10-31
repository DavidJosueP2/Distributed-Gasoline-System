# ☁️ Configuración de Variables de Entorno - AZURE AKS

Este archivo documenta la configuración completa de variables de entorno para **producción en Azure**.

## 📋 Entorno: AZURE AKS

- **Microservicios**: Pods en Azure Kubernetes Service
- **Bases de datos**: Azure PostgreSQL Flexible Server (administrado)
- **Infraestructura**: RabbitMQ, Elasticsearch, Eureka en AKS
- **Despliegue**: GitHub Actions + SSH + Helm

---

## 🎯 Arquitectura en Azure

```
GitHub Actions (CI/CD)
  ↓ build & push
Azure Container Registry (ACR)
  ↓ deploy via SSH
Azure AKS
  ├─ Pods (microservicios)
  └─ Variables: ConfigMap + Secrets
       ↓ conectan a
Azure PostgreSQL Flexible Server
  ├─ auth_db
  ├─ users_db
  ├─ vehicles_db
  ├─ vehicles_shadow_db
  └─ drivers_db
```

---

## 🔐 GitHub Secrets Necesarios

Configura estos secrets en tu repositorio GitHub:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 1. Azure Container Registry (ACR)

```bash
ACR_LOGIN_SERVER=your-acr.azurecr.io
ACR_USERNAME=your-acr-username
ACR_PASSWORD=your-acr-password
```

### 2. Azure PostgreSQL Flexible Server

```bash
# Host completo del servidor
AZURE_POSTGRES_HOST=fuel-system-postgres.postgres.database.azure.com
AZURE_POSTGRES_PORT=5432
AZURE_POSTGRES_USER=pgadmin
AZURE_POSTGRES_PASSWORD=your-super-secure-password

# Nombres de las bases de datos
AZURE_POSTGRES_DB_AUTH=auth_db
AZURE_POSTGRES_DB_USERS=users_db
AZURE_POSTGRES_DB_VEHICLES=vehicles_db
AZURE_POSTGRES_DB_VEHICLES_SHADOW=vehicles_shadow_db
AZURE_POSTGRES_DB_DRIVERS=drivers_db
```

### 3. Azure Kubernetes Service (AKS)

```bash
AKS_CLUSTER_NAME=fuel-system-aks
AKS_RESOURCE_GROUP=fuel-system-rg

# Credenciales de Azure (Service Principal)
AZURE_CREDENTIALS={"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}
```

### 4. SSH para Deployment

```bash
# VM o Bastion host para ejecutar kubectl
SSH_HOST=your-deployment-vm.azurewebsites.net
SSH_USER=azureuser
SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...-----END OPENSSH PRIVATE KEY-----
SSH_KNOWN_HOSTS=your-vm-host-key
```

### 5. Aplicación (Secrets)

```bash
# JWT
JWT_SECRET=your-super-secure-jwt-secret-production-min-64-chars

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-production-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password

# RabbitMQ
RABBITMQ_USERNAME=admin
RABBITMQ_PASSWORD=super-secure-rabbitmq-password

# Frontend URL
FRONTEND_URL=https://your-app.azurewebsites.net
```

---

## 📦 Cómo se configuran las variables en AKS

### 1. ConfigMap (datos no sensibles)

```yaml
# Helm genera esto automáticamente
apiVersion: v1
kind: ConfigMap
metadata:
  name: fuel-system-config
data:
  EUREKA_HOST: fuel-system-eureka-server
  EUREKA_PORT: "8761"
  POSTGRESQL_HOST: fuel-system-postgres.postgres.database.azure.com
  POSTGRESQL_PORT: "5432"
  NODE_ENV: production
```

### 2. Secrets (datos sensibles)

```yaml
# Helm genera esto a partir de values
apiVersion: v1
kind: Secret
metadata:
  name: fuel-system-postgresql
type: Opaque
data:
  username: <base64>
  password: <base64>
```

### 3. Variables dinámicas en Pods

```yaml
# El template de Helm construye URLs dinámicamente
env:
  - name: DB_HOST
    valueFrom:
      configMapKeyRef:
        name: fuel-system-config
        key: POSTGRESQL_HOST
  - name: DB_USERNAME
    valueFrom:
      secretKeyRef:
        name: fuel-system-postgresql
        key: username
  - name: USERS_DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/users_db?sslmode=require"
```

---

## 🛠️ Build Time vs Runtime

### BUILD TIME (Docker build en GitHub Actions)

El Dockerfile necesita un `DATABASE_URL` temporal para `prisma generate`:

```dockerfile
# Dockerfile usa build args
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/temp?schema=public
RUN npx prisma generate
```

**Importante**: Este URL es solo para generar el cliente Prisma, no se usa en runtime.

### RUNTIME (Pod en AKS)

Kubernetes inyecta las variables reales:

```yaml
- name: USERS_DATABASE_URL
  value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/users_db?sslmode=require"
```

---

## 🚀 Proceso de Deployment

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/deploy-azure.yml
name: Deploy to Azure AKS

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      # 1. Build images con ACR_LOGIN_SERVER
      # 2. Push a Azure Container Registry
      # 3. SSH al deployment VM
      # 4. kubectl apply con nuevas imágenes
      # 5. Ejecutar migraciones Prisma
```

### 2. Helm Install/Upgrade

```bash
helm upgrade --install fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --create-namespace \
  --set imageRegistry.url=$ACR_LOGIN_SERVER \
  --set postgresql.external.host=$AZURE_POSTGRES_HOST \
  --set postgresql.external.username=$AZURE_POSTGRES_USER \
  --set postgresql.external.password=$AZURE_POSTGRES_PASSWORD \
  --set secrets.jwt.secret=$JWT_SECRET \
  --set secrets.smtp.user=$SMTP_USER \
  --set secrets.smtp.password=$SMTP_PASSWORD \
  --timeout 10m \
  --wait
```

### 3. Ejecutar Migraciones

```bash
# Desde el deployment VM via SSH
kubectl exec -n fuel-system deployment/fuel-system-users-service \
  -- npx prisma migrate deploy

kubectl exec -n fuel-system deployment/fuel-system-vehicles-service \
  -- npx prisma migrate deploy
```

---

## 🔍 Variables por Servicio en AKS

### Users Service (Prisma)

```yaml
env:
  - name: USERS_DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/users_db?sslmode=require"
  - name: DB_HOST
    value: fuel-system-postgres.postgres.database.azure.com
  - name: DB_PORT
    value: "5432"
  - name: DB_USERNAME
    valueFrom: { secretKeyRef: { name: fuel-system-postgresql, key: username } }
  - name: DB_PASSWORD
    valueFrom: { secretKeyRef: { name: fuel-system-postgresql, key: password } }
```

### Vehicles Service (Prisma)

```yaml
env:
  - name: DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/vehicles_db?sslmode=require"
  - name: SHADOW_DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/vehicles_shadow_db?sslmode=require"
  - name: DB_HOST
    value: fuel-system-postgres.postgres.database.azure.com
  # ... mismo patrón
```

### Driver Service (TypeORM)

```yaml
env:
  - name: DRIVER_DATABASE_URL
    value: "postgresql://$(DB_USERNAME):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/drivers_db?sslmode=require"
  # ... mismo patrón
```

---

## ✅ Checklist de Deployment

- [ ] Crear recursos en Azure (ACR, AKS, PostgreSQL)
- [ ] Configurar todos los GitHub Secrets
- [ ] Configurar SSH keys para deployment
- [ ] Crear bases de datos en PostgreSQL Flexible Server
- [ ] Actualizar `values.yaml` con valores de producción
- [ ] Crear GitHub Actions workflow
- [ ] Primer deploy manual para verificar
- [ ] Configurar CI/CD automático
- [ ] Ejecutar migraciones Prisma
- [ ] Verificar logs y health checks
- [ ] Configurar monitoreo y alertas

---

## 📊 Monitoreo en Producción

```bash
# Ver pods
kubectl get pods -n fuel-system

# Ver logs
kubectl logs -f deployment/fuel-system-users-service -n fuel-system

# Ver eventos
kubectl get events -n fuel-system --sort-by='.lastTimestamp'

# Ejecutar comando en pod
kubectl exec -it deployment/fuel-system-users-service -n fuel-system -- sh
```

---

## 🆘 Troubleshooting

### Pods no pueden conectar a PostgreSQL

1. Verificar firewall rules en Azure PostgreSQL
2. Verificar que `sslmode=require` esté en el connection string
3. Verificar secrets en Kubernetes

### Prisma migrations fallan

```bash
# Verificar DATABASE_URL en el pod
kubectl exec -n fuel-system deployment/fuel-system-users-service \
  -- env | grep DATABASE_URL

# Ejecutar migrate con verbose
kubectl exec -n fuel-system deployment/fuel-system-users-service \
  -- npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### ImagePullBackOff

```bash
# Verificar secret de ACR
kubectl get secret acr-secret -n fuel-system -o yaml

# Recrear secret si es necesario
kubectl create secret docker-registry acr-secret \
  --docker-server=$ACR_LOGIN_SERVER \
  --docker-username=$ACR_USERNAME \
  --docker-password=$ACR_PASSWORD \
  --namespace=fuel-system
```

---

**¡Tu sistema está listo para producción en Azure! 🚀**

