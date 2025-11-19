# 🐳 Fase 5: Uso de Imágenes desde GHCR (GitHub Container Registry)

> **Tiempo estimado**: 10 minutos  
> **Prerequisitos**: Fase 1 completada

---

## 📋 Objetivos de esta Fase

Al finalizar esta fase, tendrás:

- ✅ Configuración para usar imágenes públicas de GHCR
- ✅ Verificación de acceso a las imágenes
- ✅ No se requiere ACR (Azure Container Registry)
- ✅ No se requieren imagePullSecrets (imágenes públicas)
- ✅ URL correcta de GHCR configurada

---

## 1. Imágenes Disponibles en GHCR

Tus imágenes ya están publicadas en GitHub Container Registry como **paquetes públicos**:

```
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/auth-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/driver-ms
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/users-srv
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/vehicles-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/routes-srv
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/fuel-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/email-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/logger-svc
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/publisher-rabbit-srv
```

**Según la captura que proporcionaste, las imágenes tienen:**
- ✅ Publicadas hace 2-3 días
- ✅ Entre 7-45 descargas cada una
- ✅ Visibilidad: **Pública** (no requiere autenticación)

---

## 2. Verificar Acceso a Imágenes GHCR

### Verificar desde Docker Local

```bash
# No necesitas login porque las imágenes son públicas
# Intenta hacer pull de una imagen
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest

# Verificar imagen
docker images | grep ghcr.io

# Ver información de la imagen
docker inspect ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
```

### Verificar Tags Disponibles

Puedes ver los tags disponibles en:
```
https://github.com/DavidJosueP2/distributed-gasoline-system/pkgs/container/fuel-system%2Fapi-gateway
```

O usando la API de GitHub:

```bash
# Ver tags disponibles de api-gateway
curl -s https://ghcr.io/v2/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway/tags/list | jq

# Típicamente tendrás:
# - latest
# - main-<commit-sha>
# - v1.0.0 (si usas semantic versioning)
```

---

## 3. Configuración en Kubernetes (AKS)

### ✅ No se Requieren ImagePullSecrets

Como tus imágenes son **públicas**, Kubernetes puede hacer pull sin autenticación:

```yaml
# En tu deployment NO necesitas esto:
# imagePullSecrets:
#   - name: ghcr-secret

# Simplemente usa la imagen directamente:
spec:
  containers:
  - name: api-gateway
    image: ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
    imagePullPolicy: Always  # Siempre pull la última versión
```

### Ventajas de Usar GHCR Público

1. **Sin costo adicional**: No pagas por ACR
2. **Sin configuración compleja**: No necesitas service principals
3. **Integración nativa con GitHub**: CI/CD más simple
4. **Bandwidth ilimitado**: Para imágenes públicas
5. **Versionado automático**: Con GitHub Actions

---

## 4. Test de Pull desde AKS

### Crear Pod de Prueba

```bash
# Crear un pod temporal para probar el pull
kubectl run test-ghcr \
  --image=ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest \
  --namespace=fuel-system \
  --command -- sleep 3600

# Verificar que se creó correctamente
kubectl get pod test-ghcr -n fuel-system

# Ver eventos (debe mostrar "Successfully pulled image")
kubectl describe pod test-ghcr -n fuel-system

# Limpiar
kubectl delete pod test-ghcr -n fuel-system
```

---

## 5. Actualización del values-azure.yaml

Ya en la Fase 6 usaremos esta configuración en `values-azure.yaml`:

```yaml
# Image registry configuration (GHCR)
imageRegistry:
  url: "ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system"

# Global configuration
global:
  imageRegistry: ""
  imagePullSecrets: []  # ⚠️ VACÍO porque las imágenes son públicas
  imageTag: "latest"
  nodeEnv: "production"

# Para cada servicio:
apiGateway:
  enabled: true
  replicaCount: 2
  image:
    repository: "api-gateway"  # Se concatena con imageRegistry.url
    tag: "latest"
    pullPolicy: Always  # Importante para siempre obtener la última
```

---

## 6. Estrategia de Tags Recomendada

### Tags que Deberías Usar

```bash
# 1. Tag 'latest' - Siempre apunta a la última versión estable
ghcr.io/.../api-gateway:latest

# 2. Tag por commit SHA - Para reproducibilidad
ghcr.io/.../api-gateway:main-abc1234

# 3. Tag por versión semántica - Para releases
ghcr.io/.../api-gateway:v1.0.0
ghcr.io/.../api-gateway:v1.0.1
```

### En Desarrollo (Local/Testing)
```yaml
image:
  tag: "latest"
  pullPolicy: Always  # Siempre obtener la última versión
```

### En Producción
```yaml
image:
  tag: "v1.0.0"  # Version específica
  pullPolicy: IfNotPresent  # Solo pull si no existe localmente
```

---

## 7. Verificar Todas las Imágenes

Script para verificar que todas las imágenes están disponibles:

```powershell
# Guarda como verify-ghcr-images.ps1

$BASE_URL = "ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system"
$SERVICES = @(
    "api-gateway",
    "auth-svc",
    "driver-ms",
    "users-srv",
    "vehicles-svc",
    "routes-srv",
    "fuel-svc",
    "email-svc",
    "logger-svc",
    "publisher-rabbit-srv"
)

Write-Host "🔍 Verificando imágenes en GHCR..." -ForegroundColor Cyan

foreach ($service in $SERVICES) {
    $image = "$BASE_URL/${service}:latest"
    Write-Host "`nVerificando: $service" -ForegroundColor Yellow
    
    # Intentar pull
    docker pull $image 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $service disponible" -ForegroundColor Green
        
        # Ver tamaño
        $size = docker images $image --format "{{.Size}}"
        Write-Host "   Tamaño: $size" -ForegroundColor Gray
    } else {
        Write-Host "❌ $service NO disponible o no accesible" -ForegroundColor Red
    }
}

Write-Host "`n✅ Verificación completa!" -ForegroundColor Cyan
```

Ejecutar:
```powershell
.\verify-ghcr-images.ps1
```

---

## 8. Actualizar Imágenes en Producción

### Cuando Necesites Actualizar

```bash
# Opción 1: Actualizar a latest (desarrollo)
helm upgrade fuel-system ./helm/fuel-system \
  --namespace fuel-system \
  --values values.yaml \
  --values ../../azure/values-azure.yaml \
  --set global.imageTag=latest

# Opción 2: Actualizar a versión específica (producción)
helm upgrade fuel-system ./helm/fuel-system \
  --namespace fuel-system \
  --values values.yaml \
  --values ../../azure/values-azure.yaml \
  --set global.imageTag=v1.0.1

# Opción 3: Forzar pull de imágenes (sin cambiar tag)
kubectl rollout restart deployment -n fuel-system
```

---

## 9. Monitoreo de Imágenes

### Ver Qué Imágenes Están Corriendo

```bash
# Ver todas las imágenes en uso en el namespace
kubectl get pods -n fuel-system -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | sort -u

# Ver con más detalle
kubectl get pods -n fuel-system -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[0].image
```

### Ver Historial de Imágenes

```bash
# Ver historial de rollout de un deployment
kubectl rollout history deployment/fuel-system-api-gateway -n fuel-system

# Ver detalles de una revisión específica
kubectl rollout history deployment/fuel-system-api-gateway -n fuel-system --revision=2
```

---

## 10. Troubleshooting

### Error: "ImagePullBackOff"

```bash
# Ver el error exacto
kubectl describe pod <pod-name> -n fuel-system

# Posibles causas:
# 1. La imagen no existe o el nombre está mal
# 2. La imagen es privada pero no está el imagePullSecret
# 3. Problema de red/conectividad

# Verificar que la imagen existe
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
```

### Error: "Manifest unknown"

```bash
# El tag no existe, verificar tags disponibles
curl -s https://ghcr.io/v2/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway/tags/list

# O revisar en GitHub:
# https://github.com/DavidJosueP2/distributed-gasoline-system/pkgs/container/fuel-system%2Fapi-gateway
```

### Las imágenes no se actualizan

```bash
# Si usas tag 'latest' y no ves cambios:

# 1. Verificar que imagePullPolicy es Always
kubectl get deployment fuel-system-api-gateway -n fuel-system -o yaml | grep imagePullPolicy

# 2. Forzar recreación de pods
kubectl rollout restart deployment fuel-system-api-gateway -n fuel-system

# 3. Eliminar y recrear pods manualmente
kubectl delete pod -l app.kubernetes.io/component=api-gateway -n fuel-system
```

---

## 11. Comparación: GHCR vs ACR

| Aspecto | GHCR (Actual) | ACR |
|---------|---------------|-----|
| **Costo** | $0 (público) | ~$20-200/mes |
| **Setup** | Ya está listo | Requiere configuración |
| **Autenticación** | No necesaria (público) | Service Principal o Admin |
| **Integración CI/CD** | Nativa con GitHub Actions | Requiere configuración extra |
| **Bandwidth** | Ilimitado (público) | Primeros 30-50GB gratis |
| **Geo-replication** | No disponible | Disponible en Premium |
| **Vulnerabilidad Scan** | GitHub Dependabot | Azure Defender |

**Conclusión**: Para tu caso, GHCR es la mejor opción ya que:
- ✅ Las imágenes ya están publicadas
- ✅ Son públicas (sin restricciones de acceso)
- ✅ Sin costo adicional
- ✅ Integración perfecta con tu pipeline de GitHub Actions

---

## 12. Script de Verificación Completa

```powershell
# verify-ghcr-deployment.ps1

Write-Host "🔍 Verificando configuración de GHCR en AKS..." -ForegroundColor Cyan

# 1. Verificar acceso a GHCR desde local
Write-Host "`n1. Verificando acceso a GHCR desde Docker local..." -ForegroundColor Yellow
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Acceso a GHCR correcto" -ForegroundColor Green
} else {
    Write-Host "❌ No se puede acceder a GHCR" -ForegroundColor Red
    exit 1
}

# 2. Verificar imágenes en AKS
Write-Host "`n2. Verificando imágenes en AKS..." -ForegroundColor Yellow
$pods = kubectl get pods -n fuel-system -o json | ConvertFrom-Json

foreach ($pod in $pods.items) {
    $podName = $pod.metadata.name
    $image = $pod.spec.containers[0].image
    $status = $pod.status.phase
    
    Write-Host "`nPod: $podName" -ForegroundColor Gray
    Write-Host "  Image: $image" -ForegroundColor Gray
    Write-Host "  Status: $status" -ForegroundColor $(if ($status -eq "Running") { "Green" } else { "Red" })
}

Write-Host "`n✅ Verificación completa!" -ForegroundColor Cyan
```

---

## ✅ Fase 5 Completada

Si llegaste hasta aquí, ¡excelente! Tienes:

- ✅ Imágenes disponibles en GHCR (públicas)
- ✅ No requieres ACR (ahorro de $20-200/mes)
- ✅ No requieres imagePullSecrets
- ✅ Configuración lista para usar en AKS
- ✅ Estrategia de tags definida
- ✅ Scripts de verificación

---

## 📍 Próximo Paso

Continúa con: **[Fase 6: Despliegue de Microservicios](./06-AZURE-DEPLOY-SERVICES.md)**

En la Fase 6:
- Usarás las imágenes de GHCR en tu deployment
- Configurarás `values-azure.yaml` con la URL de GHCR
- Desplegarás todos los microservicios
- Verificarás que funcionen correctamente

---

**¡Usando tus imágenes de GHCR! 🚀**
