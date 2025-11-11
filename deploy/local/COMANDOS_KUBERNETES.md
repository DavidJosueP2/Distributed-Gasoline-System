# Comandos Esenciales de Kubernetes - Fuel System

> **Guía rápida para gestionar el cluster local de Kubernetes con Kind**
>
> **Namespace**: `fuel-system`  
> **Cluster**: `fuel-local`

---

## Tabla de Contenidos

1. [Ver Estado del Sistema](#1-ver-estado-del-sistema)
2. [Reiniciar Microservicios](#2-reiniciar-microservicios)
3. [Eliminar Microservicios](#3-eliminar-microservicios)
4. [Desplegar/Actualizar con Helm](#4-desplegaractualizar-con-helm)
5. [Apagar/Reiniciar Todo](#5-apagarreiniciar-todo)
6. [Troubleshooting](#6-troubleshooting)
7. [Comandos de Emergencia](#7-comandos-de-emergencia)

---

## 1. Ver Estado del Sistema

### Ver todos los pods
```powershell
kubectl get pods -n fuel-system
```

### Ver pods con más detalles
```powershell
kubectl get pods -n fuel-system -o wide
```

### Ver servicios
```powershell
kubectl get services -n fuel-system
# O abreviado:
kubectl get svc -n fuel-system
```

### Ver deployments
```powershell
kubectl get deployments -n fuel-system
# O abreviado:
kubectl get deploy -n fuel-system
```

### Ver todo a la vez
```powershell
kubectl get all -n fuel-system
```

### Ver logs de un microservicio
```powershell
# Por nombre del pod
kubectl logs -n fuel-system <nombre-del-pod>

# Ejemplos específicos:
kubectl logs -n fuel-system fuel-system-api-gateway-xxx-xxx
kubectl logs -n fuel-system fuel-system-auth-service-xxx-xxx

# Seguir logs en tiempo real (-f = follow)
kubectl logs -n fuel-system <nombre-del-pod> -f

# Ver logs de todos los pods de un servicio
kubectl logs -n fuel-system -l app.kubernetes.io/component=api-gateway -f
kubectl logs -n fuel-system -l app.kubernetes.io/component=auth-service -f
```

### Ver los releases de Helm
```powershell
helm list -n fuel-system
```

### Ver ConfigMaps y Secrets
```powershell
kubectl get configmap -n fuel-system
kubectl get secrets -n fuel-system
```

---

## 2. Reiniciar Microservicios

### Reiniciar UN microservicio específico

```powershell
# API Gateway
kubectl rollout restart deployment/fuel-system-api-gateway -n fuel-system

# Auth Service
kubectl rollout restart deployment/fuel-system-auth-service -n fuel-system

# Driver Service
kubectl rollout restart deployment/fuel-system-driver-service -n fuel-system

# Users Service
kubectl rollout restart deployment/fuel-system-users-service -n fuel-system

# Vehicles Service
kubectl rollout restart deployment/fuel-system-vehicles-service -n fuel-system

# Email Service
kubectl rollout restart deployment/fuel-system-email-service -n fuel-system

# Logger Service
kubectl rollout restart deployment/fuel-system-logger-service -n fuel-system

# Publisher Service
kubectl rollout restart deployment/fuel-system-publisher-service -n fuel-system
```

### Reiniciar TODOS los microservicios a la vez
```powershell
kubectl rollout restart deployment -n fuel-system -l app.kubernetes.io/instance=fuel-system
```

### Ver el estado del reinicio
```powershell
kubectl rollout status deployment/fuel-system-api-gateway -n fuel-system
```

### Esperar a que un pod esté listo
```powershell
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=api-gateway -n fuel-system --timeout=60s
```

---

## 3. Eliminar Microservicios

### Eliminar UN microservicio específico

```powershell
# Eliminar solo el deployment (el pod se elimina automáticamente)
kubectl delete deployment fuel-system-api-gateway -n fuel-system
kubectl delete deployment fuel-system-auth-service -n fuel-system
kubectl delete deployment fuel-system-driver-service -n fuel-system
```

### Eliminar TODO el chart de microservicios (fuel-system)
```powershell
# Esto elimina SOLO los microservicios, NO la infraestructura (PostgreSQL, RabbitMQ, etc.)
helm uninstall fuel-system -n fuel-system
```

### Eliminar TODA la infraestructura

```powershell
# PostgreSQL
helm uninstall auth-db -n fuel-system
helm uninstall driver-db -n fuel-system
helm uninstall users-db -n fuel-system
helm uninstall vehicles-db -n fuel-system
helm uninstall vehicles-shadow-db -n fuel-system

# RabbitMQ
helm uninstall rabbitmq -n fuel-system

# Elasticsearch
helm uninstall elasticsearch -n fuel-system

# Eureka (no es un release de Helm, es un deployment manual)
kubectl delete -f deploy/local/eureka-deployment.yaml -n fuel-system
```

### Eliminar TODO de una vez (PELIGROSO ⚠️)
```powershell
# Opción 1: Eliminar todo el namespace (incluye TODA la data)
kubectl delete namespace fuel-system

# Opción 2: Eliminar todos los releases de Helm
helm uninstall fuel-system -n fuel-system
helm uninstall auth-db -n fuel-system
helm uninstall driver-db -n fuel-system
helm uninstall users-db -n fuel-system
helm uninstall vehicles-db -n fuel-system
helm uninstall vehicles-shadow-db -n fuel-system
helm uninstall rabbitmq -n fuel-system
helm uninstall elasticsearch -n fuel-system
kubectl delete -f deploy/local/eureka-deployment.yaml -n fuel-system
```

---

## 4. Desplegar/Actualizar con Helm

### Desplegar por primera vez (install)

#### Infraestructura
```powershell
# PostgreSQL
helm install auth-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=auth_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

helm install driver-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=driver_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

helm install users-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=users_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

helm install vehicles-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=vehicles_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

helm install vehicles-shadow-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=vehicles_shadow_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

# RabbitMQ
helm install rabbitmq bitnami/rabbitmq -n fuel-system --set auth.username=admin --set auth.password=admin123 --set replicaCount=1 --set service.type=NodePort --set service.nodePorts.amqp=30672 --set service.nodePorts.manager=31672 --set image.registry=docker.io --set image.repository=bitnamilegacy/rabbitmq --set image.tag=3.13.7-debian-12-r4 --set persistence.enabled=true --set persistence.size=8Gi --set volumePermissions.enabled=true --set volumePermissions.image.registry=docker.io --set volumePermissions.image.repository=bitnamilegacy/os-shell --set volumePermissions.image.tag=12-debian-12-r50 --set global.security.allowInsecureImages=true

# Elasticsearch
helm install elasticsearch elastic/elasticsearch -n fuel-system --version 7.17.3 --set replicas=1 --set resources.requests.memory=1Gi --set resources.requests.cpu=500m --set resources.limits.memory=2Gi --set resources.limits.cpu=1000m --set persistence.enabled=true --set volumeClaimTemplate.resources.requests.storage=5Gi --set service.type=NodePort --set service.nodePort=30920

# Eureka
kubectl apply -f deploy/local/eureka-deployment.yaml -n fuel-system
```

#### Microservicios
```powershell
helm install fuel-system deploy/helm/fuel-system --namespace fuel-system --values deploy/local/values-local.yaml
```

---

### Actualizar cuando ya existe (upgrade)

#### COMANDO MÁGICO: upgrade --install

Este comando es **inteligente**: si no existe el release lo instala, si existe lo actualiza.

```powershell
# Microservicios (RECOMENDADO)
helm upgrade --install fuel-system deploy/helm/fuel-system --namespace fuel-system --values deploy/local/values-local.yaml

# PostgreSQL
helm upgrade --install auth-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=auth_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

helm upgrade --install driver-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=driver_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

helm upgrade --install users-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=users_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

helm upgrade --install vehicles-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=vehicles_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

helm upgrade --install vehicles-shadow-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=vehicles_shadow_db --set primary.persistence.size=2Gi --set primary.resources.requests.memory=256Mi --set primary.resources.requests.cpu=100m

# RabbitMQ
helm upgrade --install rabbitmq bitnami/rabbitmq -n fuel-system --set auth.username=admin --set auth.password=admin123 --set replicaCount=1 --set service.type=NodePort --set service.nodePorts.amqp=30672 --set service.nodePorts.manager=31672 --set image.registry=docker.io --set image.repository=bitnamilegacy/rabbitmq --set image.tag=3.13.7-debian-12-r4 --set persistence.enabled=true --set persistence.size=8Gi --set volumePermissions.enabled=true --set volumePermissions.image.registry=docker.io --set volumePermissions.image.repository=bitnamilegacy/os-shell --set volumePermissions.image.tag=12-debian-12-r50 --set global.security.allowInsecureImages=true

# Elasticsearch
helm upgrade --install elasticsearch elastic/elasticsearch -n fuel-system --version 7.17.3 --set replicas=1 --set resources.requests.memory=1Gi --set resources.requests.cpu=500m --set resources.limits.memory=2Gi --set resources.limits.cpu=1000m --set persistence.enabled=true --set volumeClaimTemplate.resources.requests.storage=5Gi --set service.type=NodePort --set service.nodePort=30920

# Eureka (re-aplicar configuración)
kubectl apply -f deploy/local/eureka-deployment.yaml -n fuel-system
```

---

### Actualizar TODO con un solo script

#### Opción 1: Usar el script de PowerShell
```powershell
.\deploy\local\deploy-infra.ps1
```

#### Opción 2: Comandos manuales en secuencia
```powershell
# 1. Actualizar infraestructura
helm upgrade --install auth-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=auth_db --set primary.persistence.size=2Gi
helm upgrade --install driver-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=driver_db --set primary.persistence.size=2Gi
helm upgrade --install users-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=users_db --set primary.persistence.size=2Gi
helm upgrade --install vehicles-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=vehicles_db --set primary.persistence.size=2Gi
helm upgrade --install vehicles-shadow-db bitnami/postgresql -n fuel-system --set auth.username=postgres --set auth.password=root --set auth.database=vehicles_shadow_db --set primary.persistence.size=2Gi
helm upgrade --install rabbitmq bitnami/rabbitmq -n fuel-system --set auth.username=admin --set auth.password=admin123 --set replicaCount=1 --set service.type=NodePort --set service.nodePorts.manager=31672
helm upgrade --install elasticsearch elastic/elasticsearch -n fuel-system --version 7.17.3 --set replicas=1 --set service.type=NodePort --set service.nodePort=30920
kubectl apply -f deploy/local/eureka-deployment.yaml -n fuel-system

# 2. Actualizar microservicios
helm upgrade --install fuel-system deploy/helm/fuel-system --namespace fuel-system --values deploy/local/values-local.yaml
```

---

## 5. ⚡ Apagar/Reiniciar Todo

### Apagar TODO el cluster (⚠️ elimina todo)
```powershell
# Detener el cluster de Kind (apaga pero mantiene el estado)
kind delete cluster --name fuel-local
```

### Reiniciar TODO desde cero

#### Paso 1: Eliminar el cluster existente
```powershell
kind delete cluster --name fuel-local
```

#### Paso 2: Crear el cluster de nuevo
```powershell
kind create cluster --name fuel-local --config deploy/local/kind-config.yaml
```

#### Paso 3: Instalar NGINX Ingress
```powershell
.\deploy\local\install-ingress.ps1
```

#### Paso 4: Crear namespace
```powershell
kubectl create namespace fuel-system
```

#### Paso 5: Agregar repos de Helm
```powershell
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add elastic https://helm.elastic.co
helm repo update
```

#### Paso 6: Desplegar infraestructura
```powershell
.\deploy\local\deploy-infra.ps1
```

#### Paso 7: Desplegar Eureka
```powershell
kubectl apply -f deploy/local/eureka-deployment.yaml -n fuel-system
```

#### Paso 8: Desplegar microservicios
```powershell
helm install fuel-system deploy/helm/fuel-system --namespace fuel-system --values deploy/local/values-local.yaml
```

---

### Pausar/Escalar a 0 réplicas (sin eliminar)

```powershell
# Pausar un servicio específico (0 réplicas)
kubectl scale deployment fuel-system-api-gateway --replicas=0 -n fuel-system

# Reactivar (volver a 1 réplica)
kubectl scale deployment fuel-system-api-gateway --replicas=1 -n fuel-system

# Pausar TODOS los microservicios
kubectl scale deployment --all --replicas=0 -n fuel-system

# Reactivar TODOS los microservicios
kubectl scale deployment --all --replicas=1 -n fuel-system
```

---

## 6. 🔧 Troubleshooting

### Ver por qué un pod falla
```powershell
# Ver descripción completa del pod
kubectl describe pod <nombre-del-pod> -n fuel-system

# Ver eventos del namespace
kubectl get events -n fuel-system --sort-by='.lastTimestamp'

# Ver logs con errores
kubectl logs -n fuel-system <nombre-del-pod> --previous
```

### Entrar a un pod para debugging
```powershell
kubectl exec -it <nombre-del-pod> -n fuel-system -- /bin/sh

# Ejemplo: entrar al API Gateway
kubectl exec -it fuel-system-api-gateway-xxx-xxx -n fuel-system -- /bin/sh

# Una vez dentro, puedes hacer:
printenv | grep JWT
ls -la
cat /app/protos/auth.proto
```

### Port-forward para acceso directo
```powershell
# API Gateway
kubectl port-forward -n fuel-system svc/fuel-system-api-gateway 8080:8080

# PostgreSQL (auth-db)
kubectl port-forward -n fuel-system svc/auth-db-postgresql 5432:5432

# RabbitMQ Management
kubectl port-forward -n fuel-system svc/rabbitmq 15672:15672

# Eureka
kubectl port-forward -n fuel-system svc/eureka-server 8761:8761
```

### Verificar conectividad de red
```powershell
# Desde un pod a otro servicio
kubectl exec -it <nombre-del-pod> -n fuel-system -- curl http://eureka-server:8761

# Probar conexión a PostgreSQL
kubectl run -it --rm debug --image=postgres:16 --restart=Never -n fuel-system -- psql -h auth-db-postgresql -U postgres -d auth_db
```

### Forzar recreación de un pod (delete)
```powershell
# Eliminar el pod (el deployment creará uno nuevo automáticamente)
kubectl delete pod <nombre-del-pod> -n fuel-system

# Eliminar todos los pods de un deployment
kubectl delete pods -n fuel-system -l app.kubernetes.io/component=api-gateway
```

---

## 7. 🚨 Comandos de Emergencia

### Limpiar pods en estado Error/CrashLoopBackOff
```powershell
kubectl delete pods -n fuel-system --field-selector status.phase=Failed
kubectl delete pods -n fuel-system --field-selector status.phase=Unknown
```

### Reiniciar NGINX Ingress Controller
```powershell
kubectl rollout restart deployment -n ingress-nginx
```

### Ver uso de recursos
```powershell
kubectl top nodes
kubectl top pods -n fuel-system
```

### Backup de ConfigMaps y Secrets (antes de eliminar)
```powershell
kubectl get configmap fuel-system-config -n fuel-system -o yaml > backup-configmap.yaml
kubectl get secret fuel-system-jwt -n fuel-system -o yaml > backup-jwt-secret.yaml
kubectl get secret fuel-system-postgresql -n fuel-system -o yaml > backup-db-secret.yaml
```

### Restaurar desde backup
```powershell
kubectl apply -f backup-configmap.yaml
kubectl apply -f backup-jwt-secret.yaml
kubectl apply -f backup-db-secret.yaml
```

---

## 📝 Scripts Útiles Personalizados

### Script para reiniciar todo rápidamente
```powershell
# Crear archivo: restart-all.ps1
Write-Host "🔄 Reiniciando todos los microservicios..." -ForegroundColor Cyan
kubectl rollout restart deployment -n fuel-system -l app.kubernetes.io/instance=fuel-system
Write-Host "⏳ Esperando a que los pods estén listos..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -n fuel-system -l app.kubernetes.io/instance=fuel-system --timeout=120s
Write-Host "✅ Todos los servicios reiniciados!" -ForegroundColor Green
kubectl get pods -n fuel-system
```

### Script para ver el estado completo
```powershell
# Crear archivo: status.ps1
Write-Host "`n📊 Estado del Sistema - Fuel System" -ForegroundColor Blue
Write-Host "========================================`n" -ForegroundColor Blue

Write-Host "🎯 Cluster Context:" -ForegroundColor Green
kubectl config current-context

Write-Host "`n📦 Pods:" -ForegroundColor Green
kubectl get pods -n fuel-system

Write-Host "`n🌐 Services:" -ForegroundColor Green
kubectl get svc -n fuel-system

Write-Host "`n🚀 Deployments:" -ForegroundColor Green
kubectl get deploy -n fuel-system

Write-Host "`n📜 Helm Releases:" -ForegroundColor Green
helm list -n fuel-system

Write-Host "`n🔧 Ingress:" -ForegroundColor Green
kubectl get ingress -n fuel-system
```

---

## 🎯 Flujos de Trabajo Comunes

### Cambié código y quiero redeploy
```powershell
# 1. Build y push de la nueva imagen (si usas GitHub Actions, se hace automático)
# Si estás en local y cambiaste código, necesitas rebuildar la imagen:
docker build -t ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest ./services/api-gateway

# 2. Actualizar con Helm (forzar pull de nueva imagen)
helm upgrade fuel-system deploy/helm/fuel-system --namespace fuel-system --values deploy/local/values-local.yaml --set apiGateway.image.pullPolicy=Always

# 3. Reiniciar el deployment para forzar re-pull
kubectl rollout restart deployment/fuel-system-api-gateway -n fuel-system
```

### Cambié configuración (values-local.yaml o templates)
```powershell
# Solo hacer upgrade con Helm
helm upgrade fuel-system deploy/helm/fuel-system --namespace fuel-system --values deploy/local/values-local.yaml

# Si no reinicia automáticamente, forzar restart
kubectl rollout restart deployment -n fuel-system -l app.kubernetes.io/instance=fuel-system
```

### Cambié un ConfigMap o Secret manualmente
```powershell
# Editar el ConfigMap
kubectl edit configmap fuel-system-config -n fuel-system

# O editar un Secret
kubectl edit secret fuel-system-jwt -n fuel-system

# IMPORTANTE: Reiniciar los pods para que lean los nuevos valores
kubectl rollout restart deployment -n fuel-system -l app.kubernetes.io/instance=fuel-system
```

---

## 🌟 Tips Pro

1. **Alias útiles** (agregar a tu perfil de PowerShell):
```powershell
Set-Alias k kubectl
function kgp { kubectl get pods -n fuel-system }
function kgs { kubectl get services -n fuel-system }
function kgd { kubectl get deployments -n fuel-system }
function klogs { param($pod) kubectl logs -n fuel-system -l app.kubernetes.io/component=$pod -f }
```

2. **Ver contexto actual**:
```powershell
kubectl config current-context
kubectl config use-context kind-fuel-local
```

3. **Watch en PowerShell** (ver cambios en tiempo real):
```powershell
# Instalar watch si no lo tienes
Install-Module -Name PSWatchdog

# Usar
while($true) { cls; kubectl get pods -n fuel-system; Start-Sleep -Seconds 2 }
```

4. **Completado automático en PowerShell**:
```powershell
# Agregar a tu $PROFILE
kubectl completion powershell | Out-String | Invoke-Expression
helm completion powershell | Out-String | Invoke-Expression
```

---

## 📚 Referencias

- **Documentación completa**: `deploy/CONFIGURATION_REFERENCE.md`
- **Arquitectura**: `deploy/ARCHITECTURE.md`
- **Despliegue**: `deploy/DEPLOY_README.md`
- **Comandos rápidos**: `deploy/local/quick-commands.ps1`
- **Accesos rápidos**: `deploy/local/ACCESOS_RAPIDOS.md`

---

**¡Ahora eres un maestro de Kubernetes!** 🎓🚀

**Última actualización**: Noviembre 11, 2025

