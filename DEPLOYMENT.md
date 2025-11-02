# 🚀 Guía de Despliegue - Fuel System

Esta guía te ayudará a desplegar el sistema distribuido de gestión de combustible en diferentes entornos.

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración Inicial](#configuración-inicial)
3. [Despliegue Local con Docker Compose](#despliegue-local-con-docker-compose)
4. [Despliegue en Azure Kubernetes Service (AKS)](#despliegue-en-azure-aks)
5. [Configuración de CI/CD con GitHub Actions](#configuración-de-cicd)
6. [Monitoreo y Troubleshooting](#monitoreo-y-troubleshooting)

---

## 🔧 Requisitos Previos

### Para Desarrollo Local
- Docker Desktop 20.10+
- Docker Compose 2.0+
- Node.js 20+
- Git

### Para Despliegue en Azure
- Azure CLI 2.50+
- kubectl 1.28+
- Helm 3.13+
- Cuenta de Azure con suscripción activa
- Permisos para crear recursos en Azure

---

## ⚙️ Configuración Inicial

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-organizacion/fuel-system-distributed.git
cd fuel-system-distributed
```

### 2. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus variables:

```bash
cp env.example .env
```

Edita el archivo `.env` con tus configuraciones:

```bash
# Bases de datos
POSTGRES_PASSWORD=tu-password-seguro

# JWT
JWT_SECRET=tu-jwt-secret-super-seguro

# Email (Gmail)
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password

# Azure (para producción)
ACR_LOGIN_SERVER=tu-registro.azurecr.io
ACR_USERNAME=tu-username
ACR_PASSWORD=tu-password
```

---

## 🐳 Despliegue Local con Docker Compose

### 1. Construir las Imágenes

```bash
# Construir todos los servicios
docker-compose build

# O construir un servicio específico
docker-compose build api-gateway
```

### 2. Iniciar los Servicios

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver los logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f api-gateway
```

### 3. Verificar el Estado

```bash
# Ver servicios en ejecución
docker-compose ps

# Verificar salud de los servicios
docker-compose ps --services --filter "status=running"
```

### 4. Acceder a los Servicios

- **API Gateway**: http://localhost:8080
- **Eureka Dashboard**: http://localhost:8761
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **Kibana (Logs)**: http://localhost:5601

### 5. Ejecutar Migraciones de Base de Datos

```bash
# Para servicios con Prisma (users-srv, vehicles-svc)
docker-compose exec users-srv npx prisma migrate deploy
docker-compose exec vehicles-svc npx prisma migrate deploy

# Para servicios con TypeORM (driver-ms)
docker-compose exec driver-ms npm run typeorm:migrate
```

### 6. Detener los Servicios

```bash
# Detener servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

---

## ☁️ Despliegue en Azure Kubernetes Service (AKS)

### Paso 1: Crear Recursos de Azure

#### 1.1 Login en Azure

```bash
az login
az account set --subscription "tu-subscription-id"
```

#### 1.2 Crear Resource Group

```bash
az group create \
  --name fuel-system-rg \
  --location eastus
```

#### 1.3 Crear Azure Container Registry (ACR)

```bash
az acr create \
  --resource-group fuel-system-rg \
  --name fuelsystemacr \
  --sku Standard \
  --location eastus

# Login en ACR
az acr login --name fuelsystemacr
```

#### 1.4 Crear Azure Kubernetes Service (AKS)

```bash
az aks create \
  --resource-group fuel-system-rg \
  --name fuel-system-aks \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-managed-identity \
  --network-plugin azure \
  --attach-acr fuelsystemacr \
  --enable-addons monitoring \
  --location eastus

# Obtener credenciales de AKS
az aks get-credentials \
  --resource-group fuel-system-rg \
  --name fuel-system-aks
```

#### 1.5 Crear Azure Database for PostgreSQL

```bash
az postgres flexible-server create \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --location eastus \
  --admin-user pgadmin \
  --admin-password "TuPasswordSeguro123!" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --public-access 0.0.0.0 \
  --storage-size 128 \
  --version 16

# Crear bases de datos
az postgres flexible-server db create \
  --resource-group fuel-system-rg \
  --server-name fuel-system-postgres \
  --database-name auth_db

az postgres flexible-server db create \
  --resource-group fuel-system-rg \
  --server-name fuel-system-postgres \
  --database-name driver_db

az postgres flexible-server db create \
  --resource-group fuel-system-rg \
  --server-name fuel-system-postgres \
  --database-name users_db

az postgres flexible-server db create \
  --resource-group fuel-system-rg \
  --server-name fuel-system-postgres \
  --database-name vehicles_db
```

### Paso 2: Construir y Subir Imágenes Docker

```bash
# Login en ACR
az acr login --name fuelsystemacr

# Construir y subir cada servicio
export ACR_LOGIN_SERVER=$(az acr show --name fuelsystemacr --query loginServer -o tsv)

# API Gateway
docker build -t $ACR_LOGIN_SERVER/fuel-system/api-gateway:latest ./services/api-gateway
docker push $ACR_LOGIN_SERVER/fuel-system/api-gateway:latest

# Auth Service
docker build -t $ACR_LOGIN_SERVER/fuel-system/auth-svc:latest ./services/auth-svc
docker push $ACR_LOGIN_SERVER/fuel-system/auth-svc:latest

# Driver Microservice
docker build -t $ACR_LOGIN_SERVER/fuel-system/driver-ms:latest ./services/driver-ms
docker push $ACR_LOGIN_SERVER/fuel-system/driver-ms:latest

# Users Service
docker build -t $ACR_LOGIN_SERVER/fuel-system/users-srv:latest ./services/users-srv
docker push $ACR_LOGIN_SERVER/fuel-system/users-srv:latest

# Vehicles Service
docker build -t $ACR_LOGIN_SERVER/fuel-system/vehicles-svc:latest ./services/vehicles-svc
docker push $ACR_LOGIN_SERVER/fuel-system/vehicles-svc:latest

# Email Service
docker build -t $ACR_LOGIN_SERVER/fuel-system/email-svc:latest ./services/email-svc
docker push $ACR_LOGIN_SERVER/fuel-system/email-svc:latest

# Hello Service
docker build -t $ACR_LOGIN_SERVER/fuel-system/hello-svc:latest ./services/hello-svc
docker push $ACR_LOGIN_SERVER/fuel-system/hello-svc:latest

# Logger Service
docker build -t $ACR_LOGIN_SERVER/fuel-system/logger-svc:latest ./services/logger-svc
docker push $ACR_LOGIN_SERVER/fuel-system/logger-svc:latest

# Publisher Service
docker build -t $ACR_LOGIN_SERVER/fuel-system/publisher-rabbit-srv:latest ./services/publisher-rabbit-srv
docker push $ACR_LOGIN_SERVER/fuel-system/publisher-rabbit-srv:latest
```

### Paso 3: Configurar Secrets de Kubernetes

```bash
# Crear namespace
kubectl create namespace fuel-system

# Crear secret para ACR
kubectl create secret docker-registry acr-secret \
  --docker-server=$ACR_LOGIN_SERVER \
  --docker-username=$(az acr credential show --name fuelsystemacr --query username -o tsv) \
  --docker-password=$(az acr credential show --name fuelsystemacr --query passwords[0].value -o tsv) \
  --namespace=fuel-system
```

### Paso 4: Desplegar con Helm

```bash
# Agregar repositorio de Bitnami
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Desplegar
helm upgrade --install fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --create-namespace \
  --set imageRegistry.url=$ACR_LOGIN_SERVER \
  --set global.imagePullSecrets[0]=acr-secret \
  --set secrets.postgresql.password="TuPasswordSeguro123!" \
  --set secrets.rabbitmq.password="RabbitMQPassword123!" \
  --set secrets.jwt.secret="tu-jwt-secret-super-seguro" \
  --set secrets.smtp.user="tu-email@gmail.com" \
  --set secrets.smtp.password="tu-app-password" \
  --timeout 10m \
  --wait

# Verificar despliegue
kubectl get pods -n fuel-system
kubectl get services -n fuel-system
```

### Paso 5: Ejecutar Migraciones

```bash
# Esperar a que los pods estén listos
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=users-service -n fuel-system --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=vehicles-service -n fuel-system --timeout=300s

# Ejecutar migraciones
kubectl exec -n fuel-system deployment/fuel-system-users-service -- npx prisma migrate deploy
kubectl exec -n fuel-system deployment/fuel-system-vehicles-service -- npx prisma migrate deploy
kubectl exec -n fuel-system deployment/fuel-system-driver-service -- npm run typeorm:migrate
```

### Paso 6: Configurar Ingress (Opcional)

```bash
# Instalar NGINX Ingress Controller
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Esperar a que el LoadBalancer obtenga una IP
kubectl get service ingress-nginx-controller -n ingress-nginx -w
```

---

## 🔄 Configuración de CI/CD

### Configurar Secrets en GitHub

Ve a tu repositorio en GitHub → Settings → Secrets and variables → Actions

Agrega los siguientes secrets:

```
ACR_LOGIN_SERVER=fuelsystemacr.azurecr.io
ACR_USERNAME=tu-username
ACR_PASSWORD=tu-password
AKS_CLUSTER_NAME=fuel-system-aks
AKS_RESOURCE_GROUP=fuel-system-rg
POSTGRES_PASSWORD=tu-password-seguro
RABBITMQ_PASSWORD=tu-password-seguro
JWT_SECRET=tu-jwt-secret
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
DOMAIN_NAME=fuel-system.tudominio.com
```

### Configurar Azure Service Principal

```bash
# Crear service principal
az ad sp create-for-rbac \
  --name "fuel-system-github-actions" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/fuel-system-rg \
  --sdk-auth

# El output JSON debe agregarse como secret AZURE_CREDENTIALS en GitHub
```

### Flujo de CI/CD

1. **Push a main/develop**: Se ejecuta el build y push de imágenes
2. **Build exitoso**: Se despliega automáticamente a AKS
3. **Pull Request**: Solo se ejecutan tests

---

## 📊 Monitoreo y Troubleshooting

### Ver Logs

```bash
# Logs de un pod específico
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Logs de todos los pods de un servicio
kubectl logs -f -l app.kubernetes.io/component=api-gateway -n fuel-system

# Logs con Docker Compose
docker-compose logs -f api-gateway
```

### Ver Estado de los Pods

```bash
# Estado general
kubectl get pods -n fuel-system

# Detalles de un pod
kubectl describe pod <pod-name> -n fuel-system

# Eventos del cluster
kubectl get events -n fuel-system --sort-by='.lastTimestamp'
```

### Escalar Servicios

```bash
# Escalar manualmente
kubectl scale deployment fuel-system-api-gateway --replicas=5 -n fuel-system

# Ver HPA (Horizontal Pod Autoscaler)
kubectl get hpa -n fuel-system
```

### Acceder a un Pod

```bash
kubectl exec -it deployment/fuel-system-api-gateway -n fuel-system -- sh
```

### Problemas Comunes

#### 1. Pods en CrashLoopBackOff

```bash
# Ver logs del pod
kubectl logs <pod-name> -n fuel-system --previous

# Verificar configuración
kubectl describe pod <pod-name> -n fuel-system
```

#### 2. ImagePullBackOff

```bash
# Verificar secret de ACR
kubectl get secret acr-secret -n fuel-system -o yaml

# Recrear secret si es necesario
kubectl delete secret acr-secret -n fuel-system
kubectl create secret docker-registry acr-secret \
  --docker-server=$ACR_LOGIN_SERVER \
  --docker-username=... \
  --docker-password=... \
  --namespace=fuel-system
```

#### 3. Base de Datos no Conecta

```bash
# Verificar secrets
kubectl get secrets -n fuel-system
kubectl describe secret fuel-system-postgresql -n fuel-system

# Verificar conectividad desde un pod
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -n fuel-system -- psql -h <db-host> -U postgres
```

---

## 🔐 Seguridad

### Mejores Prácticas

1. **No commitear secrets** en el repositorio
2. **Usar Azure Key Vault** para secrets en producción
3. **Habilitar Network Policies** en AKS
4. **Configurar SSL/TLS** para todos los servicios públicos
5. **Implementar RBAC** en Kubernetes
6. **Mantener imágenes actualizadas** y escanear vulnerabilidades

### Rotar Secrets

```bash
# Actualizar secrets en Kubernetes
kubectl create secret generic fuel-system-postgresql \
  --from-literal=password=nuevo-password \
  --namespace=fuel-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Reiniciar pods para aplicar cambios
kubectl rollout restart deployment -n fuel-system
```

---

## 📚 Recursos Adicionales

- [Documentación de Docker](https://docs.docker.com/)
- [Documentación de Kubernetes](https://kubernetes.io/docs/)
- [Documentación de Helm](https://helm.sh/docs/)
- [Documentación de Azure AKS](https://docs.microsoft.com/en-us/azure/aks/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## 🆘 Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs de los pods
2. Verifica que todos los secrets estén configurados correctamente
3. Consulta la documentación oficial
4. Abre un issue en el repositorio

---

**¡Éxito con tu despliegue! 🎉**
