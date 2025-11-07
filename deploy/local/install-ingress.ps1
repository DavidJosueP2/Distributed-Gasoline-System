# =========================================
# SCRIPT: Instalación de NGINX Ingress Controller en Kind
# =========================================
# Este script instala y configura NGINX Ingress Controller para Kind local

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  INSTALACIÓN DE NGINX INGRESS CONTROLLER PARA KIND        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# 1. Verificar que Kind cluster existe
Write-Host "`n[1/5] Verificando cluster de Kind..." -ForegroundColor Yellow
$clusterInfo = kubectl cluster-info 2>&1 | Out-String
if ($clusterInfo -match "kind-fuel-local") {
    Write-Host "✅ Cluster 'kind-fuel-local' encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Cluster 'kind-fuel-local' no encontrado" -ForegroundColor Red
    Write-Host "   Crea el cluster primero con: kind create cluster --name fuel-local --config ./kind-config.yaml" -ForegroundColor Yellow
    exit 1
}

# 2. Instalar NGINX Ingress Controller
Write-Host "`n[2/5] Instalando NGINX Ingress Controller..." -ForegroundColor Yellow
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

Write-Host "   Esperando a que NGINX Ingress Controller esté listo..." -ForegroundColor Gray
kubectl wait --namespace ingress-nginx `
    --for=condition=ready pod `
    --selector=app.kubernetes.io/component=controller `
    --timeout=90s

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ NGINX Ingress Controller instalado correctamente" -ForegroundColor Green
} else {
    Write-Host "⚠️  NGINX Ingress Controller instalado pero aún no está listo" -ForegroundColor Yellow
    Write-Host "   Verifica el estado con: kubectl get pods -n ingress-nginx" -ForegroundColor Gray
}

# 3. Verificar que el Ingress Controller está funcionando
Write-Host "`n[3/5] Verificando estado del Ingress Controller..." -ForegroundColor Yellow
$ingressPods = kubectl get pods -n ingress-nginx -o json | ConvertFrom-Json

$controllerPod = $ingressPods.items | Where-Object { $_.metadata.name -match "controller" }
if ($controllerPod -and $controllerPod.status.phase -eq "Running") {
    Write-Host "✅ Ingress Controller está Running" -ForegroundColor Green
    Write-Host "   Pod: $($controllerPod.metadata.name)" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Ingress Controller aún no está Running" -ForegroundColor Yellow
}

# 4. Obtener la IP del Ingress
Write-Host "`n[4/5] Obteniendo IP del Ingress..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$ingressService = kubectl get svc -n ingress-nginx ingress-nginx-controller -o json 2>$null | ConvertFrom-Json
if ($ingressService) {
    # En Kind, el Ingress expone puertos en localhost
    Write-Host "✅ NGINX Ingress Controller expuesto en:" -ForegroundColor Green
    Write-Host "   HTTP:  localhost:80" -ForegroundColor Gray
    Write-Host "   HTTPS: localhost:443" -ForegroundColor Gray
} else {
    Write-Host "⚠️  No se pudo obtener el servicio del Ingress" -ForegroundColor Yellow
}

# 5. Mostrar información de configuración
Write-Host "`n[5/5] Configuración completada" -ForegroundColor Yellow
Write-Host @"

╔════════════════════════════════════════════════════════════╗
║  NGINX INGRESS CONTROLLER INSTALADO                        ║
╚════════════════════════════════════════════════════════════╝

📋 PRÓXIMOS PASOS:

1. Aplica el Ingress de Fuel System:
   kubectl apply -f deploy/local/ingress-local.yaml

2. Accede a los servicios en:
   • API Gateway:        http://localhost/
   • Eureka Dashboard:   http://localhost/eureka
   • RabbitMQ Management: http://localhost/rabbitmq

3. Verifica el Ingress:
   kubectl get ingress -n fuel-system
   kubectl describe ingress fuel-system -n fuel-system

4. Ver logs del Ingress Controller:
   kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

╔════════════════════════════════════════════════════════════╗
║  NOTAS IMPORTANTES                                         ║
╚════════════════════════════════════════════════════════════╝

⚠️  En Kind, el Ingress funciona en localhost sin necesidad de
   configurar /etc/hosts o dominios.

⚠️  Si los puertos 80/443 están ocupados, Kind usará puertos
   aleatorios. Verifica con:
   docker ps | findstr "kind-fuel-local"

⚠️  Para Azure AKS, el Ingress se configurará con la IP pública
   del Load Balancer (sin dominio).

"@ -ForegroundColor Cyan

Write-Host "✅ Instalación completada exitosamente`n" -ForegroundColor Green

