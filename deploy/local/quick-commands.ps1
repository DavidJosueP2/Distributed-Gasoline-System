# ============================================
# FUEL SYSTEM - Comandos Rápidos para Local
# ============================================
# Este script contiene comandos útiles para gestionar el despliegue local

# -------------------------------------------
# 1. CONFIGURACIÓN INICIAL
# -------------------------------------------

# Crear namespace
function Create-Namespace {
    Write-Host "Creando namespace fuel-system..." -ForegroundColor Green
    kubectl create namespace fuel-system
    kubectl config set-context --current --namespace=fuel-system
}

# Agregar repositorios de Helm
function Add-HelmRepos {
    Write-Host "Agregando repositorios de Helm..." -ForegroundColor Green
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add elastic https://helm.elastic.co
    helm repo update
}

# -------------------------------------------
# 2. DESPLEGAR INFRAESTRUCTURA
# -------------------------------------------

# Desplegar todas las bases de datos PostgreSQL
function Deploy-Databases {
    Write-Host "Desplegando bases de datos PostgreSQL..." -ForegroundColor Green

    # Auth DB
    helm install auth-db bitnami/postgresql `
        --namespace fuel-system `
        --set auth.username=postgres `
        --set auth.password=root `
        --set auth.database=auth_db `
        --set primary.persistence.size=2Gi `
        --set primary.resources.requests.memory=256Mi `
        --set primary.resources.requests.cpu=100m

    # Driver DB
    helm install driver-db bitnami/postgresql `
        --namespace fuel-system `
        --set auth.username=postgres `
        --set auth.password=root `
        --set auth.database=driver_db `
        --set primary.persistence.size=2Gi `
        --set primary.resources.requests.memory=256Mi `
        --set primary.resources.requests.cpu=100m

    # Users DB
    helm install users-db bitnami/postgresql `
        --namespace fuel-system `
        --set auth.username=postgres `
        --set auth.password=root `
        --set auth.database=users_db `
        --set primary.persistence.size=2Gi `
        --set primary.resources.requests.memory=256Mi `
        --set primary.resources.requests.cpu=100m

    # Vehicles DB
    helm install vehicles-db bitnami/postgresql `
        --namespace fuel-system `
        --set auth.username=postgres `
        --set auth.password=root `
        --set auth.database=vehicles_db `
        --set primary.persistence.size=2Gi `
        --set primary.resources.requests.memory=256Mi `
        --set primary.resources.requests.cpu=100m

    # Vehicles Shadow DB
    helm install vehicles-shadow-db bitnami/postgresql `
        --namespace fuel-system `
        --set auth.username=postgres `
        --set auth.password=root `
        --set auth.database=vehicles_shadow_db `
        --set primary.persistence.size=2Gi `
        --set primary.resources.requests.memory=256Mi `
        --set primary.resources.requests.cpu=100m

    # Routes DB
    helm install routes-db bitnami/postgresql `
        --namespace fuel-system `
        --set auth.username=postgres `
        --set auth.password=root `
        --set auth.database=routes_db `
        --set primary.persistence.size=2Gi `
        --set primary.resources.requests.memory=256Mi `
        --set primary.resources.requests.cpu=100m
}

# Desplegar RabbitMQ
function Deploy-RabbitMQ {
    Write-Host "Desplegando RabbitMQ..." -ForegroundColor Green
    helm upgrade --install rabbitmq bitnami/rabbitmq `
        -n fuel-system --create-namespace `
        --set auth.username=admin `
        --set auth.password=admin123 `
        --set replicaCount=1 `
        --set service.type=NodePort `
        --set service.nodePorts.amqp=30672 `
        --set service.nodePorts.manager=31672 `
        --set image.registry=docker.io `
        --set image.repository=bitnamilegacy/rabbitmq `
        --set image.tag=3.13.7-debian-12-r4 `
        --set persistence.enabled=true `
        --set persistence.size=8Gi `
        --set volumePermissions.enabled=true `
        --set volumePermissions.image.registry=docker.io `
        --set volumePermissions.image.repository=bitnamilegacy/os-shell `
        --set volumePermissions.image.tag=12-debian-12-r50 `
        --set global.security.allowInsecureImages=true `
        --wait --debug
}

# Desplegar Elasticsearch
function Deploy-Elasticsearch {
    Write-Host "Desplegando Elasticsearch..." -ForegroundColor Green
    helm upgrade --install elasticsearch elastic/elasticsearch `
        --namespace fuel-system --create-namespace `
        --version 7.17.3 `
        --set replicas=1 `
        --set resources.requests.memory=1Gi `
        --set resources.requests.cpu=500m `
        --set resources.limits.memory=2Gi `
        --set resources.limits.cpu=1000m `
        --set persistence.enabled=true `
        --set volumeClaimTemplate.resources.requests.storage=5Gi `
        --set service.type=NodePort `
        --set service.nodePort=30920 `
        --set image=docker.elastic.co/elasticsearch/elasticsearch `
        --set imageTag=7.17.3 `
        --set readinessProbe.initialDelaySeconds=45 `
        --set readinessProbe.periodSeconds=10 `
        --set readinessProbe.failureThreshold=12 `
        --timeout 10m `
        --wait --debug
}

# Desplegar Eureka Server
function Deploy-Eureka {
    Write-Host "Desplegando Eureka Server..." -ForegroundColor Green
    kubectl apply -f ./eureka-deployment.yaml -n fuel-system
}

# Desplegar toda la infraestructura
function Deploy-Infrastructure {
    Write-Host "Desplegando toda la infraestructura..." -ForegroundColor Cyan
    Deploy-Databases
    Write-Host "Esperando 30 segundos antes de desplegar RabbitMQ..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    Deploy-RabbitMQ
    Deploy-Elasticsearch
    Deploy-Eureka
}

# -------------------------------------------
# 3. DESPLEGAR MICROSERVICIOS
# -------------------------------------------

# Desplegar el chart de Fuel System
function Deploy-FuelSystem {
    Write-Host "Desplegando microservicios de Fuel System..." -ForegroundColor Green
    Set-Location "D:\Sixth Semester\Aplicaciones Distribuidas\Proyecto Combustible\fuel-system-distributed\deploy\helm\fuel-system"

    helm install fuel-system . `
        --namespace fuel-system `
        --values ./values.yaml `
        --values ../../local/values-local.yaml
}

# -------------------------------------------
# 4. VERIFICACIÓN
# -------------------------------------------

# Ver el estado de todos los pods
function Get-AllPods {
    Write-Host "Estado de todos los pods:" -ForegroundColor Cyan
    kubectl get pods -n fuel-system
}

# Ver todos los servicios
function Get-AllServices {
    Write-Host "Lista de servicios:" -ForegroundColor Cyan
    kubectl get svc -n fuel-system
}

# Ver todos los releases de Helm
function Get-HelmReleases {
    Write-Host "Releases de Helm instalados:" -ForegroundColor Cyan
    helm list -n fuel-system
}

# Verificar que las imágenes se están generando correctamente
function Test-ImageURLs {
    Write-Host "Verificando URLs de las imágenes:" -ForegroundColor Cyan
    Set-Location "D:\Sixth Semester\Aplicaciones Distribuidas\Proyecto Combustible\fuel-system-distributed\deploy\helm\fuel-system"
    helm template test-release . -n fuel-system --values values.yaml --values ../../local/values-local.yaml | Select-String "image:" | Select-Object -First 15
}

# -------------------------------------------
# 5. LIMPIEZA
# -------------------------------------------

# Desinstalar el chart de microservicios
function Remove-FuelSystem {
    Write-Host "Desinstalando microservicios..." -ForegroundColor Red
    helm uninstall fuel-system -n fuel-system
}

# Desinstalar toda la infraestructura
function Remove-Infrastructure {
    Write-Host "Desinstalando infraestructura..." -ForegroundColor Red
    helm uninstall auth-db -n fuel-system
    helm uninstall driver-db -n fuel-system
    helm uninstall users-db -n fuel-system
    helm uninstall vehicles-db -n fuel-system
    helm uninstall vehicles-shadow-db -n fuel-system
    helm uninstall routes-db -n fuel-system
    helm uninstall rabbitmq -n fuel-system
    helm uninstall elasticsearch -n fuel-system
    kubectl delete -f ./eureka-deployment.yaml -n fuel-system
}

# Limpiar todo el namespace (⚠️ CUIDADO)
function Remove-Everything {
    Write-Host "⚠️  ADVERTENCIA: Esto eliminará TODO el namespace fuel-system" -ForegroundColor Red
    $confirm = Read-Host "¿Estás seguro? (escribe 'SI' para confirmar)"
    if ($confirm -eq "SI") {
        kubectl delete namespace fuel-system
        Write-Host "Namespace eliminado" -ForegroundColor Green
    } else {
        Write-Host "Operación cancelada" -ForegroundColor Yellow
    }
}

# -------------------------------------------
# 6. COMANDOS DE DESPLIEGUE COMPLETO
# -------------------------------------------

# Desplegar todo desde cero
function Deploy-All {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "DESPLIEGUE COMPLETO DE FUEL SYSTEM" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan

    Write-Host "`n[1/5] Creando namespace..." -ForegroundColor Yellow
    Create-Namespace

    Write-Host "`n[2/5] Agregando repositorios de Helm..." -ForegroundColor Yellow
    Add-HelmRepos

    Write-Host "`n[3/5] Desplegando infraestructura..." -ForegroundColor Yellow
    Deploy-Infrastructure

    Write-Host "`n[4/5] Esperando 60 segundos para que la infraestructura esté lista..." -ForegroundColor Yellow
    Start-Sleep -Seconds 60

    Write-Host "`n[5/5] Desplegando microservicios..." -ForegroundColor Yellow
    Deploy-FuelSystem

    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host "✅ DESPLIEGUE COMPLETADO" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "`nVerifica el estado con: Get-AllPods" -ForegroundColor Cyan
}

# -------------------------------------------
# 7. AYUDA
# -------------------------------------------

function Show-Help {
    Write-Host @"
============================================
FUEL SYSTEM - COMANDOS DISPONIBLES
============================================

CONFIGURACIÓN INICIAL:
  Create-Namespace        - Crear namespace fuel-system
  Add-HelmRepos          - Agregar repositorios de Helm

DESPLIEGUE DE INFRAESTRUCTURA:
  Deploy-Databases       - Desplegar todas las bases de datos PostgreSQL
  Deploy-RabbitMQ        - Desplegar RabbitMQ
  Deploy-Elasticsearch   - Desplegar Elasticsearch
  Deploy-Eureka          - Desplegar Eureka Server
  Deploy-Infrastructure  - Desplegar TODA la infraestructura

DESPLIEGUE DE MICROSERVICIOS:
  Deploy-FuelSystem      - Desplegar el chart de microservicios

VERIFICACIÓN:
  Get-AllPods            - Ver estado de todos los pods
  Get-AllServices        - Ver todos los servicios
  Get-HelmReleases       - Ver releases de Helm instalados
  Test-ImageURLs         - Verificar URLs de imágenes
  Show-AccessURLs        - Mostrar URLs de acceso a los servicios

LIMPIEZA:
  Remove-FuelSystem      - Desinstalar microservicios
  Remove-Infrastructure  - Desinstalar infraestructura
  Remove-Everything      - Eliminar TODO (⚠️  CUIDADO)

DESPLIEGUE COMPLETO:
  Deploy-All             - Desplegar TODO desde cero (recomendado)

AYUDA:
  Show-Help              - Mostrar esta ayuda

============================================
ACCESOS A LOS SERVICIOS:

🌐 CON INGRESS (puerto 80):
  • API Gateway:        http://localhost/
  • Eureka Dashboard:   http://localhost/eureka
  • RabbitMQ Mgmt:      http://localhost/rabbitmq (admin/admin123)

🔌 SIN INGRESS (NodePort):
  • API Gateway:        http://localhost:3000
  • Eureka Dashboard:   http://localhost:8761
  • RabbitMQ Mgmt:      http://localhost:15672 (admin/admin123)
  • Elasticsearch:      http://localhost:9200

============================================
EJEMPLO DE USO:
  Deploy-All                    # Desplegar todo desde cero
  Get-AllPods                   # Verificar estado
  Show-AccessURLs               # Ver URLs de acceso
  Start-Process "http://localhost:8761"  # Abrir Eureka en navegador

============================================
"@ -ForegroundColor Cyan
}

# Función para mostrar URLs de acceso
function Show-AccessURLs {
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "🌐 URLS DE ACCESO - FUEL SYSTEM LOCAL" -ForegroundColor Cyan
    Write-Host "============================================`n" -ForegroundColor Cyan

    Write-Host "CON INGRESS (Recomendado - Puerto 80):" -ForegroundColor Green
    Write-Host "  📍 API Gateway:        http://localhost/" -ForegroundColor White
    Write-Host "  📍 Eureka Dashboard:   http://localhost/eureka" -ForegroundColor White
    Write-Host "  📍 RabbitMQ Management: http://localhost/rabbitmq" -ForegroundColor White
    Write-Host "     └─ Usuario: admin | Password: admin123" -ForegroundColor Gray

    Write-Host "`nSIN INGRESS (NodePort - Puertos Específicos):" -ForegroundColor Yellow
    Write-Host "  📍 API Gateway:        http://localhost:3000" -ForegroundColor White
    Write-Host "  📍 Eureka Dashboard:   http://localhost:8761" -ForegroundColor White
    Write-Host "  📍 RabbitMQ Management: http://localhost:15672" -ForegroundColor White
    Write-Host "     └─ Usuario: admin | Password: admin123" -ForegroundColor Gray
    Write-Host "  📍 Elasticsearch:      http://localhost:9200" -ForegroundColor White

    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "💡 TIPS:" -ForegroundColor Cyan
    Write-Host "  • Para abrir Eureka en el navegador:" -ForegroundColor Gray
    Write-Host "    Start-Process 'http://localhost:8761'" -ForegroundColor White
    Write-Host "  • Para abrir RabbitMQ en el navegador:" -ForegroundColor Gray
    Write-Host "    Start-Process 'http://localhost:15672'" -ForegroundColor White
    Write-Host "  • Para verificar que todo funciona:" -ForegroundColor Gray
    Write-Host "    curl http://localhost:3000/health" -ForegroundColor White
    Write-Host "============================================`n" -ForegroundColor Cyan
}

# Mostrar ayuda al cargar el script
Write-Host "`nScript cargado. Ejecuta 'Show-Help' para ver los comandos disponibles." -ForegroundColor Green
Write-Host "Para desplegar todo desde cero, ejecuta: Deploy-All`n" -ForegroundColor Yellow
