# ⚡ Inicio Rápido - Fuel System en Azure

Esta guía te llevará de **0 a producción en Azure** en menos de 30 minutos.

## 🎯 Arquitectura que Vamos a Crear

```
Azure Cloud
├── Azure Database for PostgreSQL Flexible Server (Administrado)
│   ├── auth_db
│   ├── driver_db
│   ├── users_db
│   ├── vehicles_db
│   └── vehicles_shadow_db
│
└── Azure Kubernetes Service (AKS)
    ├── API Gateway (HTTP) → LoadBalancer público
    ├── Microservicios (gRPC) → ClusterIP interno
    │   ├── auth-svc
    │   ├── driver-ms
    │   ├── users-srv
    │   ├── vehicles-svc
    │   └── otros...
    ├── RabbitMQ (mensajería)
    ├── Elasticsearch (logs)
    └── Eureka Server (discovery)
```

**Nota**: Los microservicios en AKS se conectan a PostgreSQL vía connection string seguro con SSL.

---

## 📋 Prerrequisitos

```bash
# Verificar instalaciones
az --version          # Azure CLI 2.50+
kubectl version       # kubectl 1.28+
helm version          # Helm 3.13+
docker --version      # Docker 20.10+
```

Si falta algo:
- Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
- kubectl: `az aks install-cli`
- Helm: https://helm.sh/docs/intro/install/

---

## 🚀 Paso 1: Crear Infraestructura de Azure

### Opción A: Script Automático (Recomendado)

```bash
# Clonar repositorio
git clone https://github.com/tu-org/fuel-system-distributed.git
cd fuel-system-distributed

# Dar permisos al script (en Linux/Mac)
chmod +x deploy/scripts/setup-azure.sh

# Ejecutar setup
./deploy/scripts/setup-azure.sh
```

Este script crea:
- ✅ Resource Group
- ✅ Azure Container Registry (ACR)
- ✅ Azure Kubernetes Service (AKS) con 3 nodos
- ✅ PostgreSQL Flexible Server con 5 bases de datos
- ✅ Application Insights para monitoreo

**Tiempo estimado**: 15-20 minutos

### Opción B: Manual

Ver documentación completa en [`AZURE_SETUP.md`](./AZURE_SETUP.md)

---

## 🔐 Paso 2: Guardar Credenciales

El script creará un archivo `azure-credentials.txt` con todas las credenciales. **¡Guárdalo en un lugar seguro!**

```bash
# Ver credenciales
cat azure-credentials.txt
```

Configura estos valores como **GitHub Secrets** (para CI/CD):

```
ACR_LOGIN_SERVER=fuelsystemacr.azurecr.io
ACR_USERNAME=fuelsystemacr
ACR_PASSWORD=******************
AKS_CLUSTER_NAME=fuel-system-aks
AKS_RESOURCE_GROUP=fuel-system-rg
POSTGRES_HOST=fuel-system-postgres.postgres.database.azure.com
POSTGRES_USERNAME=pgadmin
POSTGRES_PASSWORD=******************
RABBITMQ_PASSWORD=admin123
JWT_SECRET=tu-jwt-secret-seguro
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
DOMAIN_NAME=fuel-system.tudominio.com
```

---

## 🐳 Paso 3: Construir y Subir Imágenes Docker

```bash
# Login en ACR
az acr login --name fuelsystemacr

# Exportar variable
export ACR_LOGIN_SERVER="fuelsystemacr.azurecr.io"

# Construir y subir todas las imágenes
chmod +x deploy/scripts/build-and-push-images.sh
./deploy/scripts/build-and-push-images.sh
```

**Tiempo estimado**: 10-15 minutos (dependiendo de tu conexión)

O con Make:
```bash
make azure-acr-login
make azure-build-push
```

---

## ☸️ Paso 4: Desplegar en AKS con Helm

```bash
# Obtener credenciales de AKS
az aks get-credentials \
  --resource-group fuel-system-rg \
  --name fuel-system-aks \
  --overwrite-existing

# Verificar conexión
kubectl get nodes

# Crear namespace
kubectl create namespace fuel-system

# Crear secret para ACR
kubectl create secret docker-registry acr-secret \
  --docker-server=fuelsystemacr.azurecr.io \
  --docker-username=$(az acr credential show --name fuelsystemacr --query username -o tsv) \
  --docker-password=$(az acr credential show --name fuelsystemacr --query passwords[0].value -o tsv) \
  --namespace=fuel-system

# Agregar repo de Bitnami (para dependencias)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Desplegar con Helm
helm upgrade --install fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --create-namespace \
  --set imageRegistry.url=fuelsystemacr.azurecr.io \
  --set global.imagePullSecrets[0]=acr-secret \
  --set postgresql.external.enabled=true \
  --set postgresql.external.host=fuel-system-postgres.postgres.database.azure.com \
  --set postgresql.external.username=pgadmin \
  --set postgresql.external.password='TU_PASSWORD_AQUI' \
  --set postgresql.external.sslMode=require \
  --set secrets.jwt.secret='tu-jwt-secret-seguro' \
  --set secrets.smtp.user='tu-email@gmail.com' \
  --set secrets.smtp.password='tu-app-password' \
  --timeout 10m \
  --wait
```

**Tiempo estimado**: 5-10 minutos

---

## 🔄 Paso 5: Ejecutar Migraciones de Base de Datos

```bash
# Esperar a que los pods estén listos
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/component=users-service \
  -n fuel-system --timeout=300s

kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/component=vehicles-service \
  -n fuel-system --timeout=300s

# Ejecutar migraciones de Prisma
kubectl exec -n fuel-system \
  deployment/fuel-system-users-service \
  -- npx prisma migrate deploy

kubectl exec -n fuel-system \
  deployment/fuel-system-vehicles-service \
  -- npx prisma migrate deploy

# Ejecutar migraciones de TypeORM
kubectl exec -n fuel-system \
  deployment/fuel-system-driver-service \
  -- npm run typeorm:migrate
```

---

## ✅ Paso 6: Verificar Despliegue

```bash
# Ver todos los pods
kubectl get pods -n fuel-system

# Ver servicios
kubectl get services -n fuel-system

# Ver HPA (autoscaling)
kubectl get hpa -n fuel-system

# Obtener IP del LoadBalancer
kubectl get service fuel-system-api-gateway -n fuel-system

# Ver logs del API Gateway
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system
```

**Resultado esperado**:
```
NAME                                    READY   STATUS    RESTARTS   AGE
fuel-system-api-gateway-xxx-xxx         1/1     Running   0          2m
fuel-system-auth-service-xxx-xxx        1/1     Running   0          2m
fuel-system-driver-service-xxx-xxx      1/1     Running   0          2m
fuel-system-users-service-xxx-xxx       1/1     Running   0          2m
fuel-system-vehicles-service-xxx-xxx    1/1     Running   0          2m
fuel-system-eureka-server-xxx-xxx       1/1     Running   0          2m
fuel-system-rabbitmq-0                  1/1     Running   0          2m
fuel-system-elasticsearch-master-0      1/1     Running   0          2m
```

---

## 🌐 Paso 7: Acceder a la Aplicación

```bash
# Obtener IP pública
export EXTERNAL_IP=$(kubectl get service fuel-system-api-gateway \
  -n fuel-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Tu API está disponible en: http://$EXTERNAL_IP:8080"

# Probar API
curl http://$EXTERNAL_IP:8080/health
```

### Acceder a Dashboards

```bash
# Eureka Dashboard (Service Discovery)
kubectl port-forward service/fuel-system-eureka-server 8761:8761 -n fuel-system
# Abre: http://localhost:8761

# RabbitMQ Management
kubectl port-forward service/fuel-system-rabbitmq 15672:15672 -n fuel-system
# Abre: http://localhost:15672 (admin/admin123)

# Kibana (Logs)
kubectl port-forward service/fuel-system-kibana 5601:5601 -n fuel-system
# Abre: http://localhost:5601
```

---

## 🔄 Configurar CI/CD con GitHub Actions

### 1. Agregar Secrets en GitHub

Ve a: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Agrega todos los secrets del archivo `azure-credentials.txt`

### 2. Crear Service Principal

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az ad sp create-for-rbac \
  --name "fuel-system-github-actions" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/fuel-system-rg \
  --sdk-auth

# Copia el JSON output como secret AZURE_CREDENTIALS en GitHub
```

### 3. Push para Disparar Deploy

```bash
git add .
git commit -m "Configure Azure deployment"
git push origin main
```

Los workflows automáticamente:
1. Construyen las imágenes Docker
2. Las suben a ACR
3. Las despliegan en AKS

---

## 📊 Monitoreo

### Ver Métricas en Azure Portal

1. Ve a [portal.azure.com](https://portal.azure.com)
2. Navega a tu AKS cluster
3. Click en "Insights" para ver:
   - Uso de CPU/Memoria
   - Estado de pods
   - Logs de contenedores

### Ver Logs

```bash
# Logs de un servicio específico
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Logs de todos los pods con un label
kubectl logs -f -l app.kubernetes.io/component=api-gateway -n fuel-system

# Eventos del cluster
kubectl get events -n fuel-system --sort-by='.lastTimestamp'
```

---

## 🎛️ Comandos Útiles

### Escalar Manualmente

```bash
# Escalar API Gateway a 5 réplicas
kubectl scale deployment fuel-system-api-gateway \
  --replicas=5 -n fuel-system

# Ver estado del autoscaling
kubectl get hpa -n fuel-system -w
```

### Actualizar una Imagen

```bash
# Actualizar imagen del API Gateway
kubectl set image deployment/fuel-system-api-gateway \
  api-gateway=fuelsystemacr.azurecr.io/fuel-system/api-gateway:v2 \
  -n fuel-system

# Ver el rollout
kubectl rollout status deployment/fuel-system-api-gateway -n fuel-system
```

### Rollback

```bash
# Ver historial de despliegues
kubectl rollout history deployment/fuel-system-api-gateway -n fuel-system

# Rollback al anterior
kubectl rollout undo deployment/fuel-system-api-gateway -n fuel-system
```

---

## 🧹 Limpieza (Eliminar Todo)

```bash
# CUIDADO: Esto elimina todos los recursos

# Eliminar release de Helm
helm uninstall fuel-system -n fuel-system

# Eliminar namespace
kubectl delete namespace fuel-system

# Eliminar Resource Group completo (¡PELIGRO!)
az group delete --name fuel-system-rg --yes --no-wait
```

---

## 🆘 Troubleshooting

### Pods en CrashLoopBackOff

```bash
# Ver logs
kubectl logs <pod-name> -n fuel-system --previous

# Describir pod
kubectl describe pod <pod-name> -n fuel-system
```

### No puede conectar a PostgreSQL

```bash
# Verificar firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres

# Verificar connectivity desde un pod
kubectl run -it --rm debug \
  --image=postgres:16-alpine \
  --restart=Never \
  -n fuel-system \
  -- psql -h fuel-system-postgres.postgres.database.azure.com \
         -U pgadmin -d auth_db
```

### ImagePullBackOff

```bash
# Verificar secret de ACR
kubectl get secret acr-secret -n fuel-system -o yaml

# Recrear secret
kubectl delete secret acr-secret -n fuel-system
# Luego ejecutar el comando create secret del Paso 4
```

---

## 📚 Próximos Pasos

- ✅ **Configurar dominio personalizado**: Ver [DEPLOYMENT.md](../DEPLOYMENT.md#configurar-ingress)
- ✅ **Habilitar HTTPS**: Instalar cert-manager
- ✅ **Configurar Azure Key Vault**: Para gestión segura de secrets
- ✅ **Configurar alertas**: En Azure Monitor
- ✅ **Implementar backups**: Configurar Azure Backup

---

**¡Felicidades! Tu sistema está en producción en Azure** 🎉

Para más detalles, consulta:
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Guía completa
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura detallada
- [AZURE_SETUP.md](./AZURE_SETUP.md) - Configuración avanzada de Azure

