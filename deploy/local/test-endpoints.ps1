# ==============================================
# Tests de Endpoints - Fuel System Local
# ==============================================
# Ejecuta estos comandos para probar los endpoints del API Gateway

$BASE_URL = "http://localhost:3000"

Write-Host "🧪 Testing Fuel System API" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Health Check
Write-Host "1️⃣  Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    Write-Host "✅ Health Check: OK" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Health Check: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n================================`n"

# Register User
Write-Host "2️⃣  Registrando usuario de prueba..." -ForegroundColor Yellow
$registerBody = @{
    username = "testuser"
    email = "test@fuel-system.com"
    password = "Test123!"
    fullName = "Test User"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Usuario registrado correctamente" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "⚠️  Usuario ya existe o error en registro" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Write-Host "`n================================`n"

# Login
Write-Host "3️⃣  Login de usuario..." -ForegroundColor Yellow
$loginBody = @{
    username = "testuser"
    password = "Test123!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    $token = $response.access_token
    Write-Host "Token: $token" -ForegroundColor Cyan
    $response | ConvertTo-Json

    # Guardar token para siguientes requests
    $global:AUTH_TOKEN = $token
} catch {
    Write-Host "❌ Login fallido" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n================================`n"

# Get User Profile (con autenticación)
if ($global:AUTH_TOKEN) {
    Write-Host "4️⃣  Obteniendo perfil de usuario..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $global:AUTH_TOKEN"
    }

    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/users/profile" -Method Get -Headers $headers
        Write-Host "✅ Perfil obtenido" -ForegroundColor Green
        $response | ConvertTo-Json
    } catch {
        Write-Host "❌ Error obteniendo perfil" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host "`n================================`n"

# Test Driver Endpoint
if ($global:AUTH_TOKEN) {
    Write-Host "5️⃣  Listando conductores..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $global:AUTH_TOKEN"
    }

    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/drivers" -Method Get -Headers $headers
        Write-Host "✅ Conductores obtenidos" -ForegroundColor Green
        $response | ConvertTo-Json
    } catch {
        Write-Host "⚠️  Endpoint de conductores no disponible o sin datos" -ForegroundColor Yellow
        Write-Host $_.Exception.Message -ForegroundColor Yellow
    }
}

Write-Host "`n================================`n"

# Test Vehicles Endpoint
if ($global:AUTH_TOKEN) {
    Write-Host "6️⃣  Listando vehículos..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $global:AUTH_TOKEN"
    }

    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/vehicles" -Method Get -Headers $headers
        Write-Host "✅ Vehículos obtenidos" -ForegroundColor Green
        $response | ConvertTo-Json
    } catch {
        Write-Host "⚠️  Endpoint de vehículos no disponible o sin datos" -ForegroundColor Yellow
        Write-Host $_.Exception.Message -ForegroundColor Yellow
    }
}

Write-Host "`n================================"
Write-Host "✅ Tests completados" -ForegroundColor Green
Write-Host "================================`n"

# Mostrar información de servicios
Write-Host "📊 Servicios disponibles:" -ForegroundColor Cyan
Write-Host "  • API Gateway: http://localhost:3000" -ForegroundColor White
Write-Host "  • Eureka Dashboard: http://localhost:30761" -ForegroundColor White
Write-Host "  • RabbitMQ Management: http://localhost:31672 (admin/admin123)" -ForegroundColor White
Write-Host "  • Elasticsearch: http://localhost:30920" -ForegroundColor White

