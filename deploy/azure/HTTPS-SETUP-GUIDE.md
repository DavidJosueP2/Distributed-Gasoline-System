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
| `deploy/helm/fuel-system/templates/api-gateway.yaml` | ✅ Agregado puerto HTTPS 8443 (interno)<br>✅ Configuración SSL con volumeMounts<br>✅ Variables de entorno SSL<br>✅ Health checks con HTTP |
| `deploy/azure/values-azure.yaml` | ✅ `ssl.enabled: true`<br>✅ Puerto interno 8443, externo 443<br>✅ Configuración de secret |
| `deploy/local/values-local.yaml` | ✅ `ssl.enabled: false` (sin cambios en local) |
| `deploy/helm/fuel-system/values.yaml` | ✅ Valores por defecto de SSL |
| `services/api-gateway/src/main.ts` | ✅ Dual HTTP/HTTPS server support |
| `services/api-gateway/Dockerfile` | ✅ EXPOSE 8080 y 8443 |

---

## 🚀 Pasos para Aplicar en Azure

### Paso 1: Verificar que el Secret Existe

Tu certificado SSL/TLS debe estar creado como un secret de Kubernetes:

```bash
# Verificar que el secret existe (usa el nombre que creaste)
kubectl get secret fuel-system-tls -n fuel-system

# Ver detalles del secret
kubectl describe secret fuel-system-tls -n fuel-system
```

**El secret debe tener estos campos:**
- `tls.crt` - Certificado público
- `tls.key` - Clave privada

Si **NO existe**, créalo con:

```bash
# Certificado self-signed
kubectl create secret tls fuel-system-tls \
  --cert=/path/to/tls.crt \
  --key=/path/to/tls.key \
  --namespace=fuel-system
```

### Paso 2: Actualizar el Deployment con Helm

```bash
# Desde la raíz del proyecto
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml
```

### Paso 3: Verificar el Despliegue

```bash
# 1. Verificar que el pod está corriendo
kubectl get pods -n fuel-system -l app.kubernetes.io/component=api-gateway

# 2. Ver los puertos del servicio
kubectl get svc fuel-system-api-gateway -n fuel-system

# Output esperado:
# NAME                        TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)
# fuel-system-api-gateway     LoadBalancer   10.0.x.x      172.183.x.x      8080:xxx/TCP,443:xxx/TCP

# 3. Ver logs del API Gateway
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Deberías ver:
# [API Gateway] HTTP server listening on port 8080
# [API Gateway] SSL enabled - Loading certificates from /etc/ssl/certs/tls.crt
# [API Gateway] HTTPS server listening on port 8443

# 4. Obtener la IP pública
export API_IP=$(kubectl get svc fuel-system-api-gateway -n fuel-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "API Gateway HTTP:  http://$API_IP:8080"
echo "API Gateway HTTPS: https://$API_IP:443"
```

### Paso 4: Probar HTTPS

```bash
# Probar HTTP
curl http://$API_IP:8080/health

# Probar HTTPS (con -k para ignorar validación de certificado self-signed)
curl -k https://$API_IP:443/health

# Si funciona, verás:
# {"status":"ok","timestamp":"2025-11-24T..."}
```

---

## 🔧 Variables de Entorno del API Gateway

El API Gateway recibe estas variables cuando SSL está habilitado:

```yaml
SSL_ENABLED: "true"
SSL_PORT: "8443"              # Puerto interno (no privilegiado)
SSL_CERT_PATH: "/etc/ssl/certs/tls.crt"
SSL_KEY_PATH: "/etc/ssl/certs/tls.key"
```

En **local (Kind)**:

```yaml
SSL_ENABLED: "false"
```

---

## 📝 Configuración en values-azure.yaml

```yaml
apiGateway:
  ssl:
    enabled: true              # Habilita HTTPS
    port: 8443                 # Puerto interno del contenedor (no privilegiado)
    servicePort: 443           # Puerto expuesto externamente por el Service
    secretName: "fuel-system-tls"  # Nombre del secret con los certificados
```

**¿Por qué puerto 8443 en lugar de 443?**

Los puertos < 1024 (como 443) requieren privilegios de root. Como el contenedor corre con un usuario no-root (`nestjs`), usamos el puerto 8443 internamente. Kubernetes mapea automáticamente el puerto externo 443 → interno 8443.

---

## 🔍 Troubleshooting

### Problema 1: Service del API Gateway No Existe

```bash
# Error: services "fuel-system-api-gateway" not found

# Verificar si el deployment existe
kubectl get deployment fuel-system-api-gateway -n fuel-system

# Si existe pero el service no, aplicar Helm upgrade
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml
```

### Problema 2: Pod en CrashLoopBackOff

```bash
# Ver logs del pod
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Errores comunes:
# - "Certificate file not found": El secret no existe o tiene un nombre diferente
# - "listen EACCES: permission denied 0.0.0.0:443": Puerto privilegiado (ya corregido con 8443)
```

**Solución:**
```bash
# Verificar que el secret existe con el nombre correcto
kubectl get secret fuel-system-tls -n fuel-system

# Verificar que values-azure.yaml tiene el nombre correcto
# ssl.secretName: "fuel-system-tls"
```

### Problema 3: HTTPS No Responde

```bash
# Verificar que el puerto 8443 está escuchando dentro del pod
kubectl exec -it deployment/fuel-system-api-gateway -n fuel-system -- netstat -tlnp

# Verificar logs del servidor HTTPS
kubectl logs deployment/fuel-system-api-gateway -n fuel-system | grep -i ssl

# Debe mostrar:
# [API Gateway] SSL enabled - Loading certificates from /etc/ssl/certs/tls.crt
# [API Gateway] HTTPS server listening on port 8443
```

---

## 🌐 Acceso desde el Navegador

### Con Certificado Self-Signed

Los navegadores mostrarán una advertencia de seguridad. Esto es **normal** con certificados self-signed.

**Para acceder:**

1. Abre: `https://<IP>:443`
2. El navegador mostrará: "Tu conexión no es privada"
3. Click en "Avanzado" → "Continuar a [IP] (no seguro)"
4. Deberías ver la respuesta del API Gateway

### Recomendación para Producción

Para producción real, usa **Let's Encrypt** con cert-manager o **Azure Application Gateway** con certificados válidos.

---

## 📊 Resumen de Configuración

### Local (Kind)
- ✅ HTTP en puerto 8080
- ❌ HTTPS deshabilitado
- ✅ Sin certificados necesarios
- ✅ Acceso: `http://localhost:8080`

### Azure (Producción)
- ✅ HTTP en puerto 8080
- ✅ HTTPS en puerto 8443 (interno) / 443 (externo)
- ✅ Certificados desde secret `fuel-system-tls`
- ✅ Acceso HTTP: `http://<IP>:8080`
- ✅ Acceso HTTPS: `https://<IP>:443`

---


