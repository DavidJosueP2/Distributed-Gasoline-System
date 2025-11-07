# Script para diagnosticar y solucionar el problema de Eureka

Write-Host "=== DIAGNÓSTICO DE EUREKA ===" -ForegroundColor Cyan

# 1. Verificar si el servicio de Eureka existe
Write-Host "`n1. Verificando servicio de Eureka..." -ForegroundColor Yellow
$eurekaService = kubectl get svc eureka-server -n fuel-system --ignore-not-found=true -o json 2>$null | ConvertFrom-Json

if ($eurekaService) {
    Write-Host "✅ Servicio eureka-server encontrado" -ForegroundColor Green
    Write-Host "   Cluster IP: $($eurekaService.spec.clusterIP)" -ForegroundColor Gray
    Write-Host "   Puerto: $($eurekaService.spec.ports[0].port)" -ForegroundColor Gray
} else {
    Write-Host "❌ Servicio eureka-server NO encontrado" -ForegroundColor Red
    Write-Host "   Creando servicio de Eureka..." -ForegroundColor Yellow

    # Crear el servicio de Eureka
    kubectl apply -f "D:\Sixth Semester\Aplicaciones Distribuidas\Proyecto Combustible\fuel-system-distributed\deploy\local\eureka-deployment.yaml" -n fuel-system

    Start-Sleep -Seconds 5

    $eurekaService = kubectl get svc eureka-server -n fuel-system --ignore-not-found=true -o json 2>$null | ConvertFrom-Json
    if ($eurekaService) {
        Write-Host "✅ Servicio eureka-server creado exitosamente" -ForegroundColor Green
    }
}

# 2. Verificar el deployment de Eureka
Write-Host "`n2. Verificando deployment de Eureka..." -ForegroundColor Yellow
$eurekaDeployment = kubectl get deployment eureka-server -n fuel-system -o json 2>$null | ConvertFrom-Json

if ($eurekaDeployment) {
    $ready = $eurekaDeployment.status.readyReplicas
    $desired = $eurekaDeployment.status.replicas

    if ($ready -eq $desired) {
        Write-Host "✅ Eureka Server está Running ($ready/$desired)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Eureka Server NO está completamente listo ($ready/$desired)" -ForegroundColor Yellow
    }
}

# 3. Verificar que Users Service se pueda registrar en Eureka
Write-Host "`n3. Verificando registro de servicios en Eureka..." -ForegroundColor Yellow

# Hacer port-forward temporal a Eureka para consultar el registro
Write-Host "   Iniciando port-forward a Eureka..." -ForegroundColor Gray
$job = Start-Job -ScriptBlock {
    kubectl port-forward -n fuel-system deployment/eureka-server 8761:8761
}

Start-Sleep -Seconds 3

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8761/eureka/apps" -Method Get -ContentType "application/json" -ErrorAction SilentlyContinue

    if ($response) {
        Write-Host "✅ Eureka Server está accesible" -ForegroundColor Green

        # Contar servicios registrados
        $apps = $response.applications.application
        if ($apps) {
            $count = if ($apps -is [Array]) { $apps.Count } else { 1 }
            Write-Host "   Servicios registrados: $count" -ForegroundColor Gray

            foreach ($app in $apps) {
                $name = if ($app.name) { $app.name } else { "UNKNOWN" }
                Write-Host "   - $name" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ⚠️  No hay servicios registrados todavía" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ No se pudo acceder a Eureka Server" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Stop-Job -Job $job
    Remove-Job -Job $job
}

# 4. Verificar logs de Users Service para ver si intenta registrarse
Write-Host "`n4. Verificando logs de Users Service..." -ForegroundColor Yellow
$usersLogs = kubectl logs -n fuel-system deployment/fuel-system-users-service --tail=20 2>$null

if ($usersLogs -match "Eureka") {
    Write-Host "✅ Users Service tiene logs de Eureka" -ForegroundColor Green
    $usersLogs | Select-String "Eureka" | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Users Service no tiene logs de Eureka" -ForegroundColor Yellow
}

# 5. Verificar logs de Driver Service
Write-Host "`n5. Verificando logs de Driver Service..." -ForegroundColor Yellow
$driverLogs = kubectl logs -n fuel-system deployment/fuel-system-driver-service --tail=30 2>$null

if ($driverLogs -match "Unable to retrieve instances") {
    Write-Host "❌ Driver Service NO puede encontrar Users Service en Eureka" -ForegroundColor Red
    $driverLogs | Select-String "Unable to retrieve|No instances" | Select-Object -First 5 | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Red
    }
}

# 6. Recomendaciones
Write-Host "`n=== RECOMENDACIONES ===" -ForegroundColor Cyan

if (-not $eurekaService) {
    Write-Host "❌ PROBLEMA: El servicio de Eureka no existe" -ForegroundColor Red
    Write-Host "   SOLUCIÓN: Ejecuta el comando:" -ForegroundColor Yellow
    Write-Host "   kubectl apply -f deploy/local/eureka-deployment.yaml -n fuel-system" -ForegroundColor White
}

Write-Host "`n✅ Para reiniciar los servicios y forzar re-registro en Eureka:" -ForegroundColor Green
Write-Host "   kubectl rollout restart deployment/fuel-system-users-service -n fuel-system" -ForegroundColor White
Write-Host "   kubectl rollout restart deployment/fuel-system-driver-service -n fuel-system" -ForegroundColor White
Write-Host "   kubectl rollout restart deployment/fuel-system-vehicles-service -n fuel-system" -ForegroundColor White

Write-Host "`n✅ Para ver el dashboard de Eureka:" -ForegroundColor Green
Write-Host "   kubectl port-forward -n fuel-system deployment/eureka-server 8761:8761" -ForegroundColor White
Write-Host "   Luego accede a: http://localhost:8761" -ForegroundColor White

Write-Host "`n=== FIN DEL DIAGNÓSTICO ===" -ForegroundColor Cyan

