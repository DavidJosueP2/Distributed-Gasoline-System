# Fase 5: Imágenes Docker desde GHCR

> **Tiempo estimado**: 5 minutos  
> **Prerequisitos**: Fase 1 completada

---

## Objetivos de esta Fase

Al finalizar esta fase, tendrás:

- Imágenes Docker públicas en GitHub Container Registry (GHCR)
- No se requiere Azure Container Registry (ACR)
- No se requieren imagePullSecrets
- Build automático con GitHub Actions

---

## 1. Tus Imágenes en GHCR

Tus imágenes ya están publicadas en GHCR como paquetes públicos:

```
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/auth-svc:latest
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/driver-ms:latest
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/users-srv:latest
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/vehicles-svc:latest
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/routes-srv:latest
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/fuel-svc:latest
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/email-svc:latest
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/logger-svc:latest
ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/publisher-rabbit-srv:latest
```

---

## 2. Verificar Imágenes

```bash
# Verificar que puedes descargar una imagen (son públicas)
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest

# Ver imágenes locales
docker images | grep ghcr.io
```

---

## 3. Cómo se Construyen las Imágenes

Las imágenes se construyen automáticamente con el workflow de GitHub Actions:

**Archivo:** `.github/workflows/build-and-push.yml`

**Trigger:** Cada vez que haces push a `main` y cambias archivos en `services/` o `protos/`

**Proceso:**
1. GitHub Actions detecta cambios
2. Construye imágenes Docker para cada microservicio
3. Las publica en GHCR con tag `latest`
4. Las imágenes son públicas (no requieren autenticación)

---

## 4. Ventajas de GHCR Público vs ACR

| Aspecto | GHCR Público | Azure ACR |
|---------|--------------|-----------|
| Costo | $0 | $5-200/mes |
| Setup | Ninguno | Complejo |
| Secrets K8s | No necesarios | Sí (imagePullSecret) |
| Bandwidth | Ilimitado | Limitado |
| Integración GitHub | Nativa | Manual |

---

## 5. Forzar Rebuild de Imágenes (Manual)

Si necesitas reconstruir las imágenes manualmente:

```bash
# Opción 1: Trigger manual del workflow
# Ve a GitHub → Actions → Build and Push Docker Images → Run workflow

# Opción 2: Push vacío
git commit --allow-empty -m "Trigger build"
git push origin main
```

---

## Verificación

Las imágenes están listas si:

- Ves los paquetes en: `https://github.com/DavidJosueP2?tab=packages`
- Puedes hacer `docker pull` sin autenticación
- El workflow "Build and Push Docker Images" está en verde

---

## Siguiente Fase

**IMPORTANTE:** Antes de continuar a la Fase 6, lee la **[Guía Unificada de Despliegue](./DEPLOY-GUIDE.md)** que explica:

- Cómo funciona Helm con los archivos de valores
- Diferencia entre despliegue manual y CI/CD
- Estructura de archivos y configuración

Continuar con [Fase 6: Despliegue de Microservicios](./06-AZURE-DEPLOY-SERVICES.md)
