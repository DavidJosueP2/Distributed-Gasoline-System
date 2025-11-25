az group delete --name fuel-system-rg --yes --no-wait
```

---

## 📝 Checklist de Configuración

### GitHub Secrets
- [ ] `GHCR_PAT` - Personal Access Token
- [ ] `AZURE_CREDENTIALS` - Service Principal
- [ ] `AKS_CLUSTER_NAME` - Nombre del cluster
- [ ] `AKS_RESOURCE_GROUP` - Resource group
- [ ] `POSTGRES_HOST` - FQDN de Azure PostgreSQL
- [ ] `POSTGRES_USERNAME` - Usuario de PostgreSQL
- [ ] `POSTGRES_PASSWORD` - Contraseña de PostgreSQL
- [ ] `RABBITMQ_PASSWORD` - Contraseña RabbitMQ
- [ ] `JWT_SECRET` - Secret para JWT
- [ ] `SMTP_USER` - Email
- [ ] `SMTP_PASSWORD` - App Password de Gmail

### Azure Resources
- [ ] Resource Group creado
- [ ] **PostgreSQL Flexible Server creado** (servicio externo)
- [ ] 5 bases de datos creadas en PostgreSQL
- [ ] Firewall de PostgreSQL configurado
- [ ] AKS Cluster creado
- [ ] kubectl conectado al cluster

### Verificación
- [ ] Imágenes en GHCR: https://github.com/davidjosuep2?tab=packages
- [ ] Pods corriendo: `kubectl get pods -n fuel-system`
- [ ] Servicios activos: `kubectl get services -n fuel-system`
- [ ] PostgreSQL conectado desde pods

---

## 💰 Estimación de Costos (East US)

| Componente | Especificación | Costo Mensual |
|------------|----------------|---------------|
| **AKS** | 3 nodos D2s_v3 | ~$220 |
| **PostgreSQL Flexible** | B2s | ~$30-50 |
| **Storage (Premium SSD)** | 100 GB | ~$15 |
| **Load Balancer** | Standard | ~$20 |
| **Total Estimado** | | **~$285-305/mes** |

**Para producción:** PostgreSQL D4s_v3 con HA = ~$350/mes adicionales
2. [Requisitos Previos](#requisitos-previos)
3. [Configuración de Secrets en GitHub](#configuración-de-secrets-en-github)
4. [Configuración de Azure](#configuración-de-azure)
5. [Despliegue Automático con GitHub Actions](#despliegue-automático-con-github-actions)
6. [Despliegue Manual con Helm](#despliegue-manual-con-helm)
- **Arquitectura completa**: [deploy/ARCHITECTURE.md](./deploy/ARCHITECTURE.md)
- **Migraciones de BD**: [deploy/MIGRATIONS_GUIDE.md](./deploy/MIGRATIONS_GUIDE.md)
- **Estrategia de Seeding**: [deploy/SEEDING_STRATEGY.md](./deploy/SEEDING_STRATEGY.md)
- **Documentación de Azure AKS**: https://docs.microsoft.com/en-us/azure/aks/
- **Azure PostgreSQL Flexible**: https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/
## 🏗️ Arquitectura del Sistema

**⚠️ IMPORTANTE:** Este proyecto usa una arquitectura híbrida donde:
## 🎯 Resumen Rápido

```bash
# 1. Configurar secrets en GitHub (ver arriba)
- **En AKS**: API Gateway, Microservicios, RabbitMQ, Elasticsearch, Eureka
# 2. Crear recursos en Azure
az group create --name fuel-system-rg --location eastus
az postgres flexible-server create --name fuel-system-postgres ...
# ... crear bases de datos
az aks create --name fuel-system-aks-cluster ...

# 3. Push a main
git push origin main
│  │ API Gateway │  │Microserviços│  │  RabbitMQ   │        │
# 4. GitHub Actions despliega automáticamente

# 5. Verificar
kubectl get pods -n fuel-system
```
│  └─────────────┘  └─────────────┘  └─────────────┘        │
**⚠️ RECUERDA:** PostgreSQL está FUERA de AKS como servicio administrado de Azure.
└────────────────────────────┬────────────────────────────────┘
¡Listo! 🎉
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│      AZURE DATABASE FOR POSTGRESQL FLEXIBLE SERVER          │
│              (Servicio Administrado - Fuera de AKS)         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │auth_db   │  │driver_db │  │users_db  │  │vehicles_db│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  ✅ Backups automáticos      ✅ Alta disponibilidad        │
│  ✅ Point-in-time restore    ✅ SSL/TLS obligatorio        │
└─────────────────────────────────────────────────────────────┘
```

**📚 Documentación completa:** Ver [deploy/ARCHITECTURE.md](./deploy/ARCHITECTURE.md)

---

## 🔧 Requisitos Previos

### Herramientas Necesarias
- ✅ Azure CLI 2.50+
- ✅ kubectl 1.28+
- ✅ Helm 3.13+
- ✅ Cuenta de Azure con suscripción activa
- ✅ Cuenta de GitHub con acceso al repositorio

### Permisos Necesarios
- Crear recursos en Azure (Resource Groups, AKS, PostgreSQL)
- Configurar secrets en GitHub
- Push a la rama `main` del repositorio

---

## 🔑 Configuración de Secrets en GitHub

Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 1. GHCR (GitHub Container Registry)

| Secret | Descripción | Cómo obtener |
|--------|-------------|--------------|
| `GHCR_PAT` | Personal Access Token | GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)<br/>Permisos: `write:packages`, `read:packages` |

### 2. Azure Credentials

| Secret | Descripción | Valor |
|--------|-------------|-------|
| `AZURE_CREDENTIALS` | Service Principal para GitHub Actions | Ver comando abajo |
| `AKS_CLUSTER_NAME` | Nombre del cluster AKS | Ejemplo: `fuel-system-aks-cluster` |
| `AKS_RESOURCE_GROUP` | Resource Group de Azure | Ejemplo: `fuel-system-rg` |

**Crear Service Principal:**
```bash
az ad sp create-for-rbac \
  --name "fuel-system-github-actions" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/fuel-system-rg \
  --sdk-auth
```
El JSON resultante va en `AZURE_CREDENTIALS`.

### 3. PostgreSQL (Azure Database - Servicio Externo)

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `POSTGRES_HOST` | FQDN del servidor PostgreSQL | `fuel-system-postgres.postgres.database.azure.com` |
| `POSTGRES_USERNAME` | Usuario admin | `pgadmin` |
| `POSTGRES_PASSWORD` | Contraseña segura | Min 8 caracteres, mayúsculas, minúsculas, números |

### 4. Servicios

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `RABBITMQ_PASSWORD` | Contraseña RabbitMQ | Cualquier contraseña segura |
| `JWT_SECRET` | Secret para JWT | `openssl rand -base64 32` |
| `SMTP_USER` | Email de Gmail | `tu-email@gmail.com` |
| `SMTP_PASSWORD` | App Password de Gmail | Contraseña de aplicación (no la normal) |
| `DOMAIN_NAME` | Dominio (opcional) | `fuel-system.tudominio.com` |

---

## ☁️ Configuración de Azure

### Paso 1: Crear Resource Group

```bash
az group create \
  --name fuel-system-rg \
  --location eastus
```

### Paso 2: Crear Azure PostgreSQL Flexible Server

**⚠️ Este es un SERVICIO ADMINISTRADO, NO un contenedor en Kubernetes**

```bash
# 4. PostgreSQL Flexible Server con HA
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
```

**Para producción:** Cambiar `--sku-name Standard_D4s_v3` y `--high-availability ZoneRedundant`

### Paso 3: Crear Bases de Datos

```bash
# Crear las 5 bases de datos necesarias
for db in auth_db driver_db users_db vehicles_db vehicles_shadow_db; do
  echo "Creando base de datos: $db"
  az postgres flexible-server db create \
    --resource-group fuel-system-rg \
    --server-name fuel-system-postgres \
    --database-name $db
done
```

### Paso 4: Configurar Firewall de PostgreSQL

```bash
# Permitir servicios de Azure
az postgres flexible-server firewall-rule create \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --rule-name allow-azure-services \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Paso 5: Crear AKS Cluster

```bash
az aks create \
  --resource-group fuel-system-rg \
  --name fuel-system-aks-cluster \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-managed-identity \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 5 \
  --network-plugin azure \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --zones 1 2 3
```

### Paso 6: Conectar kubectl

```bash
az aks get-credentials \
  --resource-group fuel-system-rg \
  --name fuel-system-aks-cluster \
  --overwrite-existing
```

**Verificar:**
```bash
kubectl cluster-info
kubectl get nodes
```

---

## 🚀 Despliegue Automático con GitHub Actions

### Flujo Automático

1. **Push a main**: Se activa el workflow `build-and-push.yml`
   - Construye todas las imágenes Docker
   - Las sube a GHCR: `ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system/`
   - Tags: `latest`, `main`, SHA corto, timestamp

2. **Build exitoso**: Se ejecuta automáticamente `deploy-to-azure.yml`
   - Conecta a AKS
   - Crea namespace `fuel-system`
   - Despliega con Helm
   - Ejecuta migraciones de Prisma/TypeORM

### Trigger Manual

1. Ve a GitHub → **Actions**
2. Selecciona **"Build and Push Docker Images"**
3. Click **"Run workflow"** → Selecciona `main`
4. Espera a que termine (construye las 9 imágenes)
5. El deploy se ejecuta automáticamente después

### Monitorear el Deployment

1. GitHub → **Actions** → Ver workflow en ejecución
2. Verás logs de:
   - Build de cada servicio
   - Push a GHCR
   - Conexión a AKS
   - Helm install
   - Migraciones de BD

---

## 🛠️ Despliegue Manual con Helm

Si prefieres desplegar manualmente desde tu máquina local:

### 1. Conectar a AKS

```bash
az aks get-credentials \
  --resource-group fuel-system-rg \
  --name fuel-system-aks-cluster
```

### 2. Crear Namespace

```bash
kubectl create namespace fuel-system
```

### 3. Crear Secret para GHCR

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=davidjosuep2 \
  --docker-password=$GITHUB_PAT \
  --namespace=fuel-system
```

### 4. Deploy con Helm

```bash
helm upgrade --install fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --set imageRegistry.url=ghcr.io/davidjosuep2/fuel-system-distributed/fuel-system \
  --set global.imagePullSecrets[0]=ghcr-secret \
  --set global.imageTag=latest \
  --set postgresql.external.enabled=true \
  --set postgresql.external.host=fuel-system-postgres.postgres.database.azure.com \
  --set postgresql.external.port=5432 \
  --set postgresql.external.sslMode=require \
  --set postgresql.external.username=pgadmin \
  --set postgresql.external.password="TuPasswordSeguro123!" \
  --set secrets.postgresql.username=pgadmin \
  --set secrets.postgresql.password="TuPasswordSeguro123!" \
  --set secrets.rabbitmq.password="RabbitMQ_Pass123!" \
  --set secrets.jwt.secret="super-secret-jwt-key" \
  --set secrets.smtp.user="tu-email@gmail.com" \
  --set secrets.smtp.password="abcd efgh ijkl mnop" \
  --timeout 10m \
  --wait
```

### 5. Ejecutar Migraciones

```bash
# Esperar a que los pods estén listos
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=users-service -n fuel-system --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=vehicles-service -n fuel-system --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=driver-service -n fuel-system --timeout=300s

# Ejecutar migraciones Prisma
kubectl exec -n fuel-system deployment/fuel-system-users-service -- npx prisma migrate deploy
kubectl exec -n fuel-system deployment/fuel-system-vehicles-service -- npx prisma migrate deploy

# Ejecutar migraciones TypeORM
kubectl exec -n fuel-system deployment/fuel-system-driver-service -- npm run typeorm:migrate
```

---

## 🔍 Verificación y Monitoreo

### Ver Pods (NO verás PostgreSQL porque es externo)

```bash
kubectl get pods -n fuel-system

# Deberías ver:
# fuel-system-api-gateway-xxx               1/1     Running
# fuel-system-auth-service-xxx              1/1     Running
# fuel-system-driver-service-xxx            1/1     Running
# fuel-system-users-service-xxx             1/1     Running
# fuel-system-vehicles-service-xxx          1/1     Running
# fuel-system-rabbitmq-0                    1/1     Running
# fuel-system-elasticsearch-master-0        1/1     Running
# (NO HAY postgresql porque es un servicio externo de Azure)
```

### Ver Servicios

```bash
kubectl get services -n fuel-system

# Busca la IP externa del API Gateway
kubectl get service fuel-system-api-gateway -n fuel-system
```

### Ver Logs

```bash
# Logs de un servicio
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Logs de todos los pods de un servicio
kubectl logs -f -l app.kubernetes.io/component=api-gateway -n fuel-system
```

### Verificar Conexión a PostgreSQL

```bash
# Ver variables de entorno
kubectl exec -it -n fuel-system deployment/fuel-system-users-service -- env | grep DB

# Deberías ver:
# DB_HOST=fuel-system-postgres.postgres.database.azure.com
# DB_PORT=5432
# DB_SSL_MODE=require
```

### Probar Conexión a PostgreSQL

```bash
kubectl run postgres-test --rm -it --restart=Never \
  --namespace=fuel-system \
  --image=postgres:14 \
  -- psql -h fuel-system-postgres.postgres.database.azure.com \
         -U pgadmin \
         -d users_db \
         -c "SELECT version();"
```

---

## 🆘 Troubleshooting

### 1. Error: ImagePullBackOff

**Causa:** No puede descargar la imagen de GHCR.

**Solución:**
```bash
# Verificar secret
kubectl get secret ghcr-secret -n fuel-system

# Recrear secret
kubectl delete secret ghcr-secret -n fuel-system
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=davidjosuep2 \
  --docker-password=$GITHUB_PAT \
  --namespace=fuel-system
```

### 2. Error: "connection refused" a PostgreSQL

**Causa:** Firewall de Azure PostgreSQL no permite conexiones.

**Solución:**
```bash
az postgres flexible-server firewall-rule create \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --rule-name allow-azure-services \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 3. Pods en CrashLoopBackOff

**Solución:**
```bash
# Ver logs del pod que falla
kubectl logs <pod-name> -n fuel-system --previous

# Ver detalles del pod
kubectl describe pod <pod-name> -n fuel-system

# Ver eventos
kubectl get events -n fuel-system --sort-by='.lastTimestamp'
```

### 4. Error: "database does not exist"

**Causa:** Olvidaste crear las bases de datos en PostgreSQL.

**Solución:**
```bash
for db in auth_db driver_db users_db vehicles_db vehicles_shadow_db; do
  az postgres flexible-server db create \
    --resource-group fuel-system-rg \
    --server-name fuel-system-postgres \
    --database-name $db
done
```

### 5. Error en build de logger-svc (buildcache not found)

**Causa:** Es normal en el primer build porque el buildcache no existe aún.

**Solución:** Ejecutar el script para subirlo manualmente una vez:
```powershell
.\scripts\build-and-push-logger.ps1
```

Después el workflow funcionará correctamente.

---

## 📊 Monitoreo

### Ver Estado General

```bash
kubectl get all -n fuel-system
```

### Ver Horizontal Pod Autoscalers

```bash
kubectl get hpa -n fuel-system
```

### Ver Uso de Recursos

```bash
kubectl top pods -n fuel-system
kubectl top nodes
```

### Acceder a Dashboards

```bash
# Obtener IP del API Gateway
kubectl get service fuel-system-api-gateway -n fuel-system

# Acceder vía navegador
# http://<EXTERNAL-IP>:8080
```

---

## 🔄 Actualizar el Sistema

### Actualizar una Imagen Específica

```bash
# Hacer push del código
git add .
git commit -m "Update service X"
git push origin main

# O forzar un nuevo deploy
kubectl rollout restart deployment/fuel-system-api-gateway -n fuel-system
```

### Actualizar Toda la Aplicación

```bash
# Con nuevo tag
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --reuse-values \
  --set global.imageTag=nuevo-tag
```

---

## 🧹 Limpieza

### Eliminar Deployment Completo

```bash
helm uninstall fuel-system -n fuel-system
kubectl delete namespace fuel-system
```

### Eliminar Recursos de Azure

```bash
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
