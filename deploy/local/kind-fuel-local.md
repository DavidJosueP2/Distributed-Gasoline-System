# Kind Fuel Local - Guía Completa de Despliegue Local con Kubernetes

> **✅ ACTUALIZADO**: Esta guía ha sido revisada y corregida para funcionar correctamente con las imágenes públicas de GHCR y la configuración local de Kubernetes.

## ⚡ Cambios Importantes (Última Actualización)

1. **Imágenes Públicas**: Las imágenes de GHCR ahora son públicas, no necesitas crear secrets
2. **URL del Registry Corregida**: `ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system`
3. **RabbitMQ Legacy**: Se usa la imagen legacy gratuita `bitnami/rabbitmq:3.13.7-debian-12-r4`
4. **Hosts de BD Específicos**: Cada microservicio se conecta a su propia base de datos PostgreSQL
5. **SSL Mode**: En local se usa `sslmode=disable` para las conexiones a PostgreSQL
6. **Recursos Optimizados**: Configuración ajustada para entornos locales con recursos limitados
7. **🔥 IMPORTANTE - Arquitectura de Despliegue**: El chart de Helm `fuel-system` **SOLO despliega microservicios**. La infraestructura (PostgreSQL, RabbitMQ, Elasticsearch, Eureka) se instala como **releases separados** de Helm.

## 🏗️ Arquitectura de Despliegue

Esta guía sigue una estrategia de **despliegue separado** de infraestructura y aplicación:

### 📦 Releases de Helm Separados

**Infraestructura (instalada primero):**
- `auth-db` → PostgreSQL para Auth Service
- `driver-db` → PostgreSQL para Driver Service
- `users-db` → PostgreSQL para Users Service
- `vehicles-db` → PostgreSQL para Vehicles Service
- `vehicles-shadow-db` → PostgreSQL para migraciones de Vehicles
- `rabbitmq` → RabbitMQ para mensajería
- `elasticsearch` → Elasticsearch para logs centralizados

**Aplicación (instalada después):**

`fuel-system` → Chart de Helm que despliega:
- Eureka Server (service discovery)
- API Gateway
- Auth Service
- Driver Service
- Users Service
- Vehicles Service
- Email Service
- Logger Service
- Publisher Service

## 📋 Tabla de Contenidos

- [Prerrequisitos](#prerrequisitos)
- [Instalación de Herramientas](#instalación-de-herramientas)
- [Configuración del Cluster Local](#configuración-del-cluster-local)
- [Despliegue de Infraestructura](#despliegue-de-infraestructura)
- [Despliegue de Microservicios](#despliegue-de-microservicios)
- [Verificación y Pruebas](#verificación-y-pruebas)
- [Comandos Útiles](#comandos-útiles)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Prerrequisitos

### Software Necesario

1. **Docker Desktop** (con Kubernetes habilitado) o **Rancher Desktop**
2. **kubectl** - CLI de Kubernetes
3. **Helm** - Package manager para Kubernetes
4. **Kind** (Opcional pero recomendado) - Kubernetes in Docker
5. **Git** - Control de versiones

### Recursos del Sistema

- **RAM**: Mínimo 8GB (recomendado 16GB)
- **CPU**: Mínimo 4 cores
- **Disco**: Mínimo 20GB libres
- **SO**: Windows 10/11, macOS, o Linux

---

## 🛠️ Instalación de Herramientas

### Windows (PowerShell)

```powershell
# Instalar Chocolatey (si no lo tienes)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar herramientas
choco install kubernetes-cli -y
choco install kubernetes-helm -y
choco install kind -y

# Verificar instalación
kubectl version --client
helm version
kind version
```

### macOS (Homebrew)

```bash
# Instalar herramientas
brew install kubectl
brew install helm
brew install kind

# Verificar instalación
kubectl version --client
helm version
kind version
```

### Linux (Ubuntu/Debian)

```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Verificar instalación
kubectl version --client
helm version
kind version
```

---

## 🚀 Configuración del Cluster Local

### Opción 1: Usar Kind (Recomendado)

Kind permite crear clusters de Kubernetes locales usando contenedores Docker.

```bash
# Crear cluster con configuración personalizada
kind create cluster --name fuel-local --config ./deploy/local/kind-config.yaml

# Verificar que el cluster esté corriendo
kubectl cluster-info --context kind-fuel-local

# Ver nodos
kubectl get nodes
```

### Opción 2: Docker Desktop

1. Abre **Docker Desktop**
2. Ve a **Settings** → **Kubernetes**
3. Marca la opción **Enable Kubernetes**
4. Haz clic en **Apply & Restart**
5. Espera a que el estado sea "Running"

```bash
# Configurar contexto
kubectl config use-context docker-desktop

# Verificar
kubectl cluster-info
```

### Opción 3: Rancher Desktop

1. Instala Rancher Desktop desde https://rancherdesktop.io/
2. Selecciona **dockerd (moby)** como container runtime
3. Habilita Kubernetes
4. Espera a que inicie

```bash
# Configurar contexto
kubectl config use-context rancher-desktop

# Verificar
kubectl cluster-info
```

---

## 🏗️ Despliegue de Infraestructura

### 0. Instalar NGINX Ingress Controller

**⚠️ IMPORTANTE**: Este paso debe hacerse **ANTES** de desplegar la infraestructura para exponer los servicios correctamente.

**Windows (PowerShell):**
```powershell
# Ejecutar el script automatizado
.\install-ingress.ps1
```

**Manualmente:**
```bash
# Instalar NGINX Ingress Controller para Kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Esperar a que esté listo (toma ~60 segundos)
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s

# Verificar instalación
kubectl get pods -n ingress-nginx
```

**Qué hace el Ingress Controller:**
- Permite exponer múltiples servicios en **localhost** sin necesidad de NodePort
- Unifica el acceso a través del puerto **80** (HTTP) y **443** (HTTPS)
- Enruta las peticiones a los servicios correctos según la ruta URL
- Simplifica el acceso: `http://localhost/` en lugar de `http://localhost:30000`

**Acceso a los servicios después de instalar Ingress:**
- **API Gateway**: http://localhost/
- **Eureka Dashboard**: http://localhost/eureka
- **RabbitMQ Management**: http://localhost/rabbitmq

### 1. Crear Namespace

```bash
# Crear namespace para el proyecto
kubectl create namespace fuel-system

# Configurar como namespace por defecto (opcional)
kubectl config set-context --current --namespace=fuel-system
```

### 2. Agregar Repositorios de Helm

```bash
# Bitnami (para PostgreSQL, RabbitMQ, etc.)
helm repo add bitnami https://charts.bitnami.com/bitnami

# Elastic
helm repo add elastic https://helm.elastic.co

# Actualizar repos
helm repo update
```

### 3. Desplegar PostgreSQL

Necesitamos múltiples bases de datos para los diferentes microservicios.

```bash
# Auth DB
helm install auth-db bitnami/postgresql `
  --namespace fuel-system `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=auth_db `
  --set image.registry=docker.io `
  --set image.repository=bitnamisecure/postgresql `
  --set image.tag=latest `
  --set global.security.allowInsecureImages=true `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m

# Driver DB
helm install driver-db bitnami/postgresql `
  --namespace fuel-system `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=driver_db `
  --set image.registry=docker.io `
  --set image.repository=bitnamisecure/postgresql `
  --set image.tag=latest `
  --set global.security.allowInsecureImages=true `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m

# Users DB
helm install users-db bitnami/postgresql `
  --namespace fuel-system `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=users_db `
  --set image.registry=docker.io `
  --set image.repository=bitnamisecure/postgresql `
  --set image.tag=latest `
  --set global.security.allowInsecureImages=true `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m

# Vehicles DB
helm install vehicles-db bitnami/postgresql `
  --namespace fuel-system `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=vehicles_db `
  --set image.registry=docker.io `
  --set image.repository=bitnamisecure/postgresql `
  --set image.tag=latest `
  --set global.security.allowInsecureImages=true `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m

# Vehicles Shadow DB (para migraciones)
helm install vehicles-shadow-db bitnami/postgresql `
  --namespace fuel-system `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=vehicles_shadow_db `
  --set image.registry=docker.io `
  --set image.repository=bitnamisecure/postgresql `
  --set image.tag=latest `
  --set global.security.allowInsecureImages=true `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m

# Routes DB
helm install routes-db bitnami/postgresql `
  --namespace fuel-system `
  --set auth.username=postgres `
  --set auth.password=root `
  --set auth.database=routes_db `
  --set image.registry=docker.io `
  --set image.repository=bitnamisecure/postgresql `
  --set image.tag=latest `
  --set global.security.allowInsecureImages=true `
  --set primary.persistence.size=2Gi `
  --set primary.resources.requests.memory=256Mi `
  --set primary.resources.requests.cpu=100m

# Verificar
kubectl get pods -l app.kubernetes.io/name=postgresql
```

### 4. Desplegar RabbitMQ

**NOTA**: Usamos una imagen legacy gratuita de RabbitMQ porque las nuevas requieren suscripción.

```bash
helm upgrade --install rabbitmq bitnami/rabbitmq \
  -n fuel-system --create-namespace \
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
  --wait --debug

# Verificar
kubectl get pods -l app.kubernetes.io/name=rabbitmq
kubectl get svc rabbitmq
```

**Acceso a RabbitMQ Management:**
- URL: http://localhost:31672
- Usuario: admin
- Password: admin123

### 5. Desplegar Elasticsearch

```bash
helm upgrade --install elasticsearch elastic/elasticsearch \
  --namespace fuel-system --create-namespace \
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

# Verificar
kubectl get pods -n fuel-system -l app=elasticsearch-master
kubectl get svc  -n fuel-system elasticsearch-master
```

### 6. Desplegar Eureka Server

```bash
# Crear deployment para Eureka
kubectl apply -f ./deploy/local/eureka-deployment.yaml

# Verificar
kubectl get pods -l app=eureka-server
kubectl get svc eureka-server
```

**Acceso a Eureka Dashboard:**
- URL: http://localhost:30761

---

## 🎯 Despliegue de Microservicios

### Instalar Chart de Fuel System

**NOTA**: Las imágenes de GHCR son públicas, no necesitamos crear un secret para pull.

```bash
# Desde la raíz del proyecto
cd deploy/helm/fuel-system

# Instalar con valores locales
helm install fuel-system . \
  --namespace fuel-system \
  --values ./values.yaml \
  --values ../../local/values-local.yaml

# Verificar despliegue
kubectl get pods -n fuel-system
kubectl get svc -n fuel-system

# Ver logs de un servicio específico
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system
```

**Si las imágenes fueran privadas** (solo para referencia futura):
```bash
# Crear secret para pull de imágenes desde GitHub Container Registry
kubectl create secret docker-registry ghcr-secret \
  --namespace fuel-system \
  --docker-server=ghcr.io \
  --docker-username=TU_GITHUB_USERNAME \
  --docker-password=TU_GITHUB_TOKEN
```

### Ver logs de un microservicio

```bash
# Listar pods
kubectl get pods

# Ver logs
kubectl logs -f <pod-name>

# Ejemplo: Ver logs del API Gateway
kubectl logs -f $(kubectl get pod -l app=api-gateway -o jsonpath="{.items[0].metadata.name}")
```

---

## ✅ Verificación y Pruebas

### 1. Verificar Estado del Cluster

```bash
# Ver todos los pods
kubectl get pods -n fuel-system

# Ver servicios
kubectl get svc -n fuel-system

# Ver deployments
kubectl get deployments -n fuel-system

# Ver PVCs (almacenamiento)
kubectl get pvc -n fuel-system
```

### 2. Verificar Conectividad

```bash
# Port-forward al API Gateway
kubectl port-forward svc/api-gateway 3000:3000 -n fuel-system

# En otra terminal, hacer un request
curl http://localhost:3000/health
```

### 3. Acceder a los Servicios

**API Gateway:**
```bash
kubectl port-forward svc/api-gateway 3000:3000 -n fuel-system
# Acceder en: http://localhost:3000
```

**Eureka Server:**
```bash
# Ya expuesto en NodePort
# Acceder en: http://localhost:30761
```

**RabbitMQ Management:**
```bash
# Ya expuesto en NodePort
# Acceder en: http://localhost:31672
```

**Elasticsearch:**
```bash
# Ya expuesto en NodePort
# Acceder en: http://localhost:30920
```

### 4. Probar Endpoints

**Con Ingress:**

```bash
# Health check del API Gateway
curl http://localhost/health

# Login de usuario
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Registrar usuario
curl -X POST http://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!"}'

# Listar drivers (requiere autenticación)
curl http://localhost/drivers
```

**Sin Ingress (NodePort):**

```bash
# Health check
curl http://localhost:30000/health

# Auth endpoints
curl -X POST http://localhost:30000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Registrar usuario
curl -X POST http://localhost:30000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!"}'
```
---

## 📝 Comandos Útiles

### Gestión del Cluster

```bash
# Ver información del cluster
kubectl cluster-info

# Ver contextos disponibles
kubectl config get-contexts

# Cambiar de contexto
kubectl config use-context <context-name>

# Ver recursos en todos los namespaces
kubectl get all --all-namespaces

# Eliminar el cluster (Kind)
kind delete cluster --name fuel-local
```

### Debugging

```bash
# Describir un pod (ver eventos y errores)
kubectl describe pod <pod-name> -n fuel-system

# Ejecutar comando dentro de un pod
kubectl exec -it <pod-name> -n fuel-system -- /bin/sh

# Ver logs de un contenedor específico
kubectl logs <pod-name> -c <container-name> -n fuel-system

# Ver logs anteriores (si el pod se reinició)
kubectl logs <pod-name> --previous -n fuel-system

# Port-forward a cualquier servicio
kubectl port-forward svc/<service-name> <local-port>:<service-port> -n fuel-system
```

### Helm

```bash
# Listar releases instalados
helm list -n fuel-system

# Ver valores de un release
helm get values <release-name> -n fuel-system

# Actualizar un release
helm upgrade <release-name> <chart> -n fuel-system

# Rollback a versión anterior
helm rollback <release-name> <revision> -n fuel-system

# Desinstalar un release
helm uninstall <release-name> -n fuel-system

# Ver historial de releases
helm history <release-name> -n fuel-system
```

### Limpieza

```bash
# Eliminar todo el namespace (⚠️ CUIDADO)
kubectl delete namespace fuel-system

# Eliminar un deployment específico
kubectl delete deployment <deployment-name> -n fuel-system

# Eliminar un servicio específico
kubectl delete svc <service-name> -n fuel-system

# Limpiar pods completados/fallidos
kubectl delete pods --field-selector status.phase=Succeeded -n fuel-system
kubectl delete pods --field-selector status.phase=Failed -n fuel-system
```

---

## 🔧 Troubleshooting

### Problema: Pods en estado "Pending"

```bash
# Ver eventos
kubectl get events -n fuel-system --sort-by='.lastTimestamp'

# Describir el pod
kubectl describe pod <pod-name> -n fuel-system
```

**Soluciones comunes:**
- Insuficiente memoria/CPU: Reduce los recursos en values-local.yaml
- PVC no puede ser montado: Verifica el storage class
- Imagen no puede ser descargada: Verifica el secret de GHCR

### Problema: ImagePullBackOff

```bash
# Ver detalles del error
kubectl describe pod <pod-name> -n fuel-system
```

**Soluciones:**
- **NOTA**: Las imágenes de GHCR son públicas, este error no debería ocurrir por autenticación
- Verifica que el nombre de la imagen sea correcto:
  - URL base: `ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system`
  - Ejemplo completo: `ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest`
- Verifica la conectividad a GHCR: `docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest`
- Si aún falla, verifica que las imágenes existan en: https://github.com/davidjosuep2?tab=packages

### Problema: CrashLoopBackOff

```bash
# Ver logs del contenedor
kubectl logs <pod-name> -n fuel-system

# Ver logs anteriores
kubectl logs <pod-name> --previous -n fuel-system
```

**Soluciones:**
- Revisa los logs para ver el error específico
- Verifica las variables de entorno
- Verifica que las bases de datos estén accesibles

### Problema: No puedo acceder a los servicios

```bash
# Verificar que el servicio existe
kubectl get svc -n fuel-system

# Verificar endpoints
kubectl get endpoints <service-name> -n fuel-system

# Port-forward para debugging
kubectl port-forward svc/<service-name> <local-port>:<service-port> -n fuel-system
```

### Problema: Base de datos no conecta

```bash
# Verificar que el pod de PostgreSQL esté running
kubectl get pods -l app.kubernetes.io/name=postgresql -n fuel-system

# Probar conexión desde un pod temporal
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -n fuel-system -- \
  psql -h auth-db-postgresql -U postgres -d auth_db
```

**Soluciones comunes:**
- Verifica que todas las bases de datos estén desplegadas:
  ```bash
  helm list -n fuel-system | grep db
  ```
- Los nombres de host de las bases de datos en local son:
  - Auth: `auth-db-postgresql`
  - Driver: `driver-db-postgresql`
  - Users: `users-db-postgresql`
  - Vehicles: `vehicles-db-postgresql`
  - Vehicles Shadow: `vehicles-shadow-db-postgresql`
- Verifica los logs de la base de datos:
  ```bash
  kubectl logs -l app.kubernetes.io/name=postgresql,app.kubernetes.io/instance=auth-db -n fuel-system
  ```
- Verifica que el servicio esté funcionando:
  ```bash
  kubectl get svc -l app.kubernetes.io/name=postgresql -n fuel-system
  ```

---

## 🎓 Recursos Adicionales

### Documentación Oficial

- [Kubernetes Docs](https://kubernetes.io/docs/)
- [Helm Docs](https://helm.sh/docs/)
- [Kind Docs](https://kind.sigs.k8s.io/)

### Tutoriales

- [Kubernetes Basics](https://kubernetes.io/docs/tutorials/kubernetes-basics/)
- [Helm Tutorial](https://helm.sh/docs/intro/quickstart/)

### Herramientas Útiles

- **k9s**: Terminal UI para Kubernetes
- **Lens**: IDE para Kubernetes
- **kubectl-tree**: Ver recursos en árbol
- **kubectx/kubens**: Cambiar contextos/namespaces rápidamente

---

## 📊 Monitoreo (Opcional)

### Instalar Prometheus + Grafana

```bash
# Agregar repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Instalar
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Port-forward a Grafana
kubectl port-forward svc/prometheus-grafana 3001:80 -n monitoring
# Usuario: admin, Password: prom-operator
```

---

## 🎉 ¡Todo Listo!

Tu cluster local de Kubernetes está configurado y corriendo con:

✅ **NGINX Ingress Controller** - Acceso unificado por localhost  
✅ **PostgreSQL** (5 bases de datos independientes)  
✅ **RabbitMQ** (mensajería)  
✅ **Elasticsearch** (logs centralizados)  
✅ **Eureka Server** (service discovery)  
✅ **Todos los microservicios** del sistema Fuel

## 🌐 Accesos Rápidos

### Con Ingress (Recomendado):
- **API Gateway**: http://localhost/
- **Eureka Dashboard**: http://localhost/eureka
- **RabbitMQ Management**: http://localhost/rabbitmq (admin/admin123)

### Sin Ingress (NodePort):
- **API Gateway**: http://localhost:3000
- **Eureka Dashboard**: http://localhost:8761
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **Elasticsearch**: http://localhost:9200

## ✅ Checklist de Verificación

- [ ] Cluster Kind creado con `kind-config.yaml`
- [ ] NGINX Ingress Controller instalado y funcionando
- [ ] Namespace `fuel-system` creado
- [ ] 5 bases de datos PostgreSQL desplegadas
- [ ] RabbitMQ desplegado y accesible en http://localhost:15672
- [ ] Elasticsearch desplegado y accesible en http://localhost:9200
- [ ] Eureka Server desplegado y con servicio creado
- [ ] Chart `fuel-system` instalado
- [ ] Ingress configurado y funcionando
- [ ] Todos los pods en estado `Running`
- [ ] Microservicios registrados en Eureka (verificar en http://localhost:8761)
- [ ] API Gateway responde en http://localhost/ o http://localhost:3000

## 📋 Arquitectura de Despliegue

```
┌─────────────────────────────────────────────────────────────┐
│              NGINX Ingress Controller (Opcional)            │
│                    localhost:80 / 443                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────┐              ┌──────────────────┐
│ API Gateway  │◄─────────────┤  Eureka Server   │
│  (gRPC/HTTP) │              │ (Service Disc.)  │
└──────┬───────┘              └─────────┬────────┘
       │                                │
       │  ┌─────────────────────────────┘
       │  │
       ▼  ▼
┌────────────────────────────────────────────────┐
│         Microservicios (gRPC)                  │
│  • Auth Service     • Driver Service           │
│  • Users Service    • Vehicles Service         │
│  • Email Service    • Logger Service           │
│  • Publisher Service                           │
└───────────────────┬────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│              Infraestructura                   │
│  • PostgreSQL (5 DBs separadas)                │
│  • RabbitMQ (Mensajería)                       │
│  • Elasticsearch (Logs)                        │
└────────────────────────────────────────────────┘
```

## 📚 Próximos pasos

1. **Ejecutar migraciones**: Ver `MIGRATIONS_GUIDE.md`
2. **Ejecutar seeding**: Ver `SEEDING_STRATEGY.md`
3. **Monitorear servicios**: Accede a Eureka Dashboard
4. **Probar endpoints**: Usa los ejemplos de curl anteriores
5. **Ver logs**: `kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system`

## 🎯 Scripts Útiles

```powershell
# Cargar funciones de comandos rápidos
. .\quick-commands.ps1

# Ver ayuda
Show-Help

# Desplegar todo desde cero
Deploy-All

# Ver estado de todos los pods
Get-AllPods

# Verificar URLs de imágenes
Test-ImageURLs

# Diagnóstico de Eureka
.\diagnose-eureka.ps1
```

---

**¿Problemas?** Consulta la sección de [Troubleshooting](#troubleshooting) o revisa los logs con `kubectl logs`.

**¡Happy Coding! 🚀**
