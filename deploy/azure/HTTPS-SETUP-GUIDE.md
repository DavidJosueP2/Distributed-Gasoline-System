# 🔒 Guía de Configuración HTTPS para API Gateway

> **Fecha**: Noviembre 24, 2025  
> **Ambiente**: Azure AKS (Producción)  
> **Método**: Self-Signed Certificate

---

## ✅ Cambios Realizados

Se han modificado los siguientes archivos para soportar HTTPS **solo en producción (Azure)**:

### 1. Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `deploy/helm/fuel-system/templates/api-gateway.yaml` | ✅ Agregado puerto HTTPS 443<br>✅ Configuración SSL con volumeMounts<br>✅ Variables de entorno SSL<br>✅ Health checks con HTTPS |
| `deploy/azure/values-azure.yaml` | ✅ `ssl.enabled: true`<br>✅ Configuración de puertos y secret |
| `deploy/local/values-local.yaml` | ✅ `ssl.enabled: false` (sin cambios en local) |
| `deploy/helm/fuel-system/values.yaml` | ✅ Valores por defecto de SSL |

---

## 🚀 Pasos para Aplicar en Azure

### Paso 1: Verificar que el Secret Existe

Tu certificado SSL/TLS debe estar creado como un secret de Kubernetes llamado `api-gateway-tls`:

```bash
# Verificar que el secret existe
kubectl get secret api-gateway-tls -n fuel-system

# Ver detalles del secret
kubectl describe secret api-gateway-tls -n fuel-system
```

**El secret debe tener estos campos:**
- `tls.crt` - Certificado público
- `tls.key` - Clave privada

Si **NO existe**, créalo con:

```bash
# Opción 1: Si tienes archivos de certificado
kubectl create secret tls api-gateway-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace=fuel-system

# Opción 2: Certificado self-signed (ejemplo de la guía)
kubectl create secret tls api-gateway-tls \
  --cert=/tmp/api-gateway.crt \
  --key=/tmp/api-gateway.key \
  --namespace=fuel-system
```

### Paso 2: Actualizar el Deployment con Helm

```bash
# Desde la raíz del proyecto
cd "D:/Sixth Semester/Aplicaciones Distribuidas/Proyecto Combustible/fuel-system-distributed"

# Aplicar los cambios
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml \
  --wait \
  --timeout 10m
```

### Paso 3: Verificar el Despliegue

```bash
# 1. Verificar que el pod se reinició correctamente
kubectl get pods -n fuel-system -l app.kubernetes.io/component=api-gateway

# 2. Ver los puertos del servicio
kubectl get svc fuel-system-api-gateway -n fuel-system

# Output esperado:
# NAME                        TYPE           PORT(S)                      AGE
# fuel-system-api-gateway     LoadBalancer   8080:xxxxx/TCP,443:xxxxx/TCP   5m

# 3. Ver logs del API Gateway
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Deberías ver algo como:
# ✅ SSL enabled: true
# ✅ SSL port: 443
# ✅ Certificate loaded from /etc/ssl/certs/tls.crt

# 4. Obtener la IP pública
INGRESS_IP=$(kubectl get svc fuel-system-api-gateway -n fuel-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "API Gateway HTTP:  http://$INGRESS_IP:8080"
echo "API Gateway HTTPS: https://$INGRESS_IP:443"
```

### Paso 4: Probar HTTPS

```bash
# Probar HTTP (debe seguir funcionando)
curl http://$INGRESS_IP:8080/health

# Probar HTTPS (con certificado self-signed, usar -k para ignorar validación)
curl -k https://$INGRESS_IP:443/health

# Si funciona, verás:
# {"status":"ok","timestamp":"2025-11-24T..."}
```

---

## 🔧 Variables de Entorno Agregadas al API Gateway

El API Gateway ahora recibe estas variables de entorno **solo cuando está en Azure**:

```yaml
SSL_ENABLED: "true"
SSL_PORT: "443"
SSL_CERT_PATH: "/etc/ssl/certs/tls.crt"
SSL_KEY_PATH: "/etc/ssl/certs/tls.key"
```

En **local (Kind)**, estas variables son:

```yaml
SSL_ENABLED: "false"
```

---

## 📝 Configuración en values-azure.yaml

La configuración de SSL en `values-azure.yaml` es:

```yaml
apiGateway:
  ssl:
    enabled: true              # Habilita HTTPS
    port: 443                  # Puerto interno del contenedor
    servicePort: 443           # Puerto expuesto por el Service
    secretName: "api-gateway-tls"  # Nombre del secret con los certificados
```

---

## 🔍 Troubleshooting

### Problema 1: Pod en CrashLoopBackOff

```bash
# Ver logs del pod
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Errores comunes:
# - "Failed to load certificate": El secret no existe o tiene un nombre diferente
# - "Permission denied": Los archivos del certificado no tienen permisos de lectura
```

**Solución:**
```bash
# Verificar que el secret existe
kubectl get secret api-gateway-tls -n fuel-system

# Si no existe, créalo según Paso 1
```

### Problema 2: El Servicio No Expone Puerto 443

```bash
# Ver configuración del servicio
kubectl describe svc fuel-system-api-gateway -n fuel-system

# Debe mostrar:
# Port:       http  8080/TCP
# Port:       https 443/TCP
```

**Solución:**
```bash
# Volver a aplicar el Helm chart
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml \
  --force
```

### Problema 3: Health Checks Fallan con HTTPS

Los health checks ahora usan HTTPS cuando SSL está habilitado. Si falla:

```bash
# Ver eventos del pod
kubectl describe pod -l app.kubernetes.io/component=api-gateway -n fuel-system

# Si ves "Liveness probe failed", puede ser que:
# 1. El certificado no es válido para localhost
# 2. El puerto HTTPS no está escuchando correctamente
```

**Solución temporal:**
Edita `api-gateway.yaml` y cambia los probes a usar HTTP en lugar de HTTPS:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http  # Usar puerto HTTP en lugar de HTTPS
    scheme: HTTP  # Cambiar de HTTPS a HTTP
```

---

## 🌐 Acceso desde el Navegador

### Con Certificado Self-Signed

Los navegadores mostrarán una advertencia de seguridad. Esto es **normal** con certificados self-signed.

**Para acceder:**

1. Abre: `https://<INGRESS_IP>:443`
2. El navegador mostrará: "Tu conexión no es privada"
3. Click en "Avanzado" → "Continuar a [IP] (no seguro)"
4. Deberías ver la respuesta del API Gateway

### Recomendación para Producción

Para producción real, usa **Let's Encrypt** o **Azure Application Gateway** con certificados válidos. Ver guía completa en:

- `deploy/azure/07-AZURE-NETWORKING-SECURITY.md` (Opción B: Let's Encrypt)

---

## 📊 Resumen de Configuración

### Local (Kind)
- ✅ HTTP en puerto 8080
- ❌ HTTPS deshabilitado
- ✅ Sin certificados necesarios
- ✅ Acceso: `http://localhost:8080`

### Azure (Producción)
- ✅ HTTP en puerto 8080
- ✅ HTTPS en puerto 443
- ✅ Certificados desde secret `api-gateway-tls`
- ✅ Acceso HTTP: `http://<IP>:8080`
- ✅ Acceso HTTPS: `https://<IP>:443`

---

## ✅ Checklist Final

- [ ] Secret `api-gateway-tls` creado en namespace `fuel-system`
- [ ] Helm upgrade ejecutado con `values-azure.yaml`
- [ ] Pod de API Gateway reiniciado y en estado Running
- [ ] Servicio expone ambos puertos (8080 y 443)
- [ ] Health check HTTP funciona
- [ ] Health check HTTPS funciona
- [ ] Conexión HTTPS accesible desde navegador

---

## 🎯 Próximos Pasos

Una vez que verifiques que HTTPS funciona:

1. **Actualizar Ingress** (si lo usas) para rutear tráfico HTTPS
2. **Configurar redirección HTTP → HTTPS** (opcional)
3. **Migrar a Let's Encrypt** para certificados válidos (producción)
4. **Actualizar cliente/frontend** para usar HTTPS

---

¿Necesitas ayuda con alguno de estos pasos? ¡Avísame! 🚀

