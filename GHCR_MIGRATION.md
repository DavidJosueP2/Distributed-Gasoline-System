# 🆓 Migración a GitHub Container Registry (GHCR)

## 📋 ¿Por qué GHCR?

**Azure Container Registry (ACR) cobra incluso cuando está apagado** porque el costo es por almacenamiento, no por uso.

**GitHub Container Registry (GHCR) es GRATIS para repositorios públicos:**
- ✅ Sin costos mensuales
- ✅ Sin límites de almacenamiento
- ✅ Ancho de banda ilimitado
- ✅ Automático con GitHub Actions

## ✅ Cambios Realizados

### 1. **Workflows de GitHub Actions**

**`build-and-push.yml`**:
- Cambiado de ACR (`fuelsystemacr.azurecr.io`) a GHCR (`ghcr.io`)
- Login con `GITHUB_TOKEN` (automático, no necesita secrets)
- Permisos añadidos: `packages: write`

**`deploy-to-azure.yml`**:
- Actualizado para pull de GHCR
- Secret de registry cambiado a `ghcr-secret`

### 2. **Helm Chart** (`values.yaml`)

```yaml
imageRegistry:
  url: "ghcr.io/tu-usuario-github/fuel-system"
```

## 🚀 Configuración Necesaria

### Paso 1: Hacer el Repositorio Público

```bash
# En GitHub:
# Settings → General → Danger Zone → Change visibility → Make public
```

**Importante**: Las imágenes en GHCR son **gratuitas SOLO para repos públicos**.

### Paso 2: Configurar Visibilidad de Paquetes

Después del primer push, las imágenes se crearán como **privadas por defecto**. Necesitas hacerlas públicas:

1. Ve a tu perfil de GitHub → Packages
2. Click en cada imagen (ej: `fuel-system/api-gateway`)
3. Package settings → Change visibility → Public

O hazlo automáticamente con GitHub CLI:

```bash
# Instalar GitHub CLI
gh auth login

# Hacer públicos todos los paquetes
for pkg in api-gateway auth-svc driver-ms email-svc hello-svc logger-svc publisher-rabbit-srv users-srv vehicles-svc; do
  gh api \
    --method PATCH \
    -H "Accept: application/vnd.github+json" \
    /user/packages/container/fuel-system%2F$pkg/visibility \
    -f visibility='public'
done
```

### Paso 3: NO Necesitas Configurar Secrets

El workflow usa `GITHUB_TOKEN` que ya está disponible automáticamente.

**Secrets que YA NO necesitas:**
- ❌ `ACR_LOGIN_SERVER`
- ❌ `ACR_USERNAME`
- ❌ `ACR_PASSWORD`

**Secret que SÍ necesitas (solo para deploy futuro):**
- ✅ `GHCR_PAT` - Personal Access Token con scope `read:packages` (solo si el repo es privado)

### Paso 4: Primer Push

```bash
git add .
git commit -m "feat: migrar de ACR a GHCR para reducir costos"
git push origin main
```

GitHub Actions automáticamente:
1. Construirá las 9 imágenes
2. Las subirá a `ghcr.io/tu-usuario/fuel-system/`
3. Las etiquetará con múltiples tags

## 📦 Verificar las Imágenes

### En GitHub Web

1. Ve a tu perfil → Packages
2. Deberías ver 9 paquetes:
   - `fuel-system/api-gateway`
   - `fuel-system/auth-svc`
   - `fuel-system/driver-ms`
   - etc.

### Con Docker CLI

```bash
# Pull de una imagen
docker pull ghcr.io/tu-usuario/fuel-system/api-gateway:latest

# Ver tags disponibles
# Ve a: https://github.com/tu-usuario?tab=packages
```

## 🔗 URLs de las Imágenes

Todas las imágenes estarán disponibles en:

```
ghcr.io/tu-usuario/fuel-system/api-gateway:latest
ghcr.io/tu-usuario/fuel-system/api-gateway:abc123d (SHA corto)
ghcr.io/tu-usuario/fuel-system/api-gateway:main-abc123def456 (SHA completo)
ghcr.io/tu-usuario/fuel-system/auth-svc:latest
...
```

## 🐳 Usar las Imágenes Localmente

```bash
# Pull y run
docker pull ghcr.io/tu-usuario/fuel-system/api-gateway:latest
docker run -p 8080:8080 ghcr.io/tu-usuario/fuel-system/api-gateway:latest

# Con docker-compose (actualizar .env)
IMAGE_REGISTRY=ghcr.io/tu-usuario/fuel-system
IMAGE_TAG=latest
```

## ☸️ Deploy a AKS (Futuro)

Cuando habilites el deploy automático:

```bash
# El workflow usará:
imageRegistry.url=ghcr.io/tu-usuario/fuel-system
global.imageTag=abc123d  # SHA corto del commit
```

AKS descargará las imágenes desde GHCR (gratis, público).

## 📊 Comparación de Costos

| Aspecto | ACR (Azure) | GHCR (GitHub) |
|---------|-------------|---------------|
| **Costo Base** | ~$20/mes (Standard) | **$0** |
| **Almacenamiento** | $0.10/GB/mes | **Gratis** |
| **Transferencia** | $0.087/GB | **Gratis** |
| **Total Mensual** | ~$20-50/mes | **$0** |

**Ahorro anual: $240 - $600 USD** 💰

## ⚠️ Limitaciones de GHCR

1. **Repo debe ser público** (o pagar GitHub Pro)
2. **Imágenes públicas** (cualquiera puede descargarlas)
3. **Sin soporte de Azure Portal** (solo GitHub UI)

Para producción enterprise, considera mantener ACR. Para desarrollo/testing/demos, GHCR es perfecto.

## 🔄 Rollback a ACR (si es necesario)

Si en el futuro necesitas volver a ACR:

1. Revertir los 3 archivos modificados
2. Configurar los secrets de ACR
3. Push a main

## ✅ Checklist

- [ ] Repositorio es público en GitHub
- [ ] Primer push ejecutado (`git push origin main`)
- [ ] Workflow "Build and Push" completado exitosamente
- [ ] 9 paquetes visibles en GitHub Packages
- [ ] Paquetes configurados como públicos
- [ ] Eliminar ACR de Azure (si no lo usas más)

---

**¡Listo! Ahora tu sistema usa GHCR gratis** 🎉

