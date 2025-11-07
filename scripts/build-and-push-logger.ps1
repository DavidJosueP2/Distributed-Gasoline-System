# Script para construir y subir el logger-svc a GHCR
# Ejecutar desde la raíz del proyecto

Write-Host "🔨 Construyendo y subiendo logger-svc a GHCR..." -ForegroundColor Green
Write-Host ""

# Variables
$REGISTRY = "ghcr.io"
$USERNAME = "davidjosuep2"
$REPO_PATH = "fuel-system-distributed/fuel-system"
$SERVICE_NAME = "logger-svc"
$IMAGE_NAME = "$REGISTRY/$USERNAME/$REPO_PATH/$SERVICE_NAME"

# Verificar que estamos en la raíz del proyecto
if (-not (Test-Path "services\logger-svc")) {
    Write-Host "❌ Error: Debes ejecutar este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Servicio: $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "🏷️  Imagen: $IMAGE_NAME" -ForegroundColor Cyan
Write-Host ""

# 1. Construir la imagen localmente
Write-Host "🔨 Paso 1: Construyendo imagen localmente..." -ForegroundColor Yellow
docker compose build --no-cache logger-svc

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir la imagen" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Imagen construida exitosamente" -ForegroundColor Green
Write-Host ""

# 2. Etiquetar la imagen para GHCR
Write-Host "🏷️  Paso 2: Etiquetando imagen para GHCR..." -ForegroundColor Yellow

# Tag con latest
docker tag fuel-system-distributed-logger-svc:latest "$IMAGE_NAME:latest"

# Tag con timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
docker tag fuel-system-distributed-logger-svc:latest "$IMAGE_NAME:$timestamp"

# Tag con main
docker tag fuel-system-distributed-logger-svc:latest "$IMAGE_NAME:main"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al etiquetar la imagen" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Imagen etiquetada con:" -ForegroundColor Green
Write-Host "   - latest" -ForegroundColor Cyan
Write-Host "   - $timestamp" -ForegroundColor Cyan
Write-Host "   - main" -ForegroundColor Cyan
Write-Host ""

# 3. Login a GHCR
Write-Host "🔐 Paso 3: Login a GitHub Container Registry..." -ForegroundColor Yellow
Write-Host "Por favor, ingresa tu Personal Access Token (PAT) de GitHub:" -ForegroundColor Cyan
Write-Host "Si no lo tienes, créalo en: https://github.com/settings/tokens" -ForegroundColor Gray
Write-Host "Permisos necesarios: write:packages, read:packages" -ForegroundColor Gray
Write-Host ""

$PAT = Read-Host "Token (se ocultará)" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PAT)
$PlainPAT = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

echo $PlainPAT | docker login ghcr.io -u $USERNAME --password-stdin

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al hacer login en GHCR" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Login exitoso" -ForegroundColor Green
Write-Host ""

# 4. Push de las imágenes
Write-Host "📤 Paso 4: Subiendo imágenes a GHCR..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Subiendo $IMAGE_NAME:latest..." -ForegroundColor Cyan
docker push "$IMAGE_NAME:latest"

Write-Host ""
Write-Host "Subiendo $IMAGE_NAME:$timestamp..." -ForegroundColor Cyan
docker push "$IMAGE_NAME:$timestamp"

Write-Host ""
Write-Host "Subiendo $IMAGE_NAME:main..." -ForegroundColor Cyan
docker push "$IMAGE_NAME:main"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al subir las imágenes" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ ¡Todas las imágenes subidas exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 logger-svc está disponible en GHCR:" -ForegroundColor Green
Write-Host "   $IMAGE_NAME:latest" -ForegroundColor Cyan
Write-Host "   $IMAGE_NAME:$timestamp" -ForegroundColor Cyan
Write-Host "   $IMAGE_NAME:main" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Ver en: https://github.com/$USERNAME?tab=packages" -ForegroundColor Cyan
Write-Host ""

# 5. Verificar las imágenes
Write-Host "🔍 Verificando que las imágenes estén disponibles..." -ForegroundColor Yellow
docker pull "$IMAGE_NAME:latest"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Imagen verificada correctamente" -ForegroundColor Green
} else {
    Write-Host "⚠️  Advertencia: No se pudo verificar la imagen, pero puede estar disponible" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Proceso completado" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Verifica que la imagen esté en GitHub Packages" -ForegroundColor White
Write-Host "2. Ejecuta el workflow de deploy en GitHub Actions" -ForegroundColor White
Write-Host "3. O haz push a main para que se ejecute automáticamente" -ForegroundColor White

