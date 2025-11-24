# 🌐 Guía de Integración Frontend - Azure Container Apps

> **Fecha**: Noviembre 24, 2025  
> **Frontend URL**: https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io  
> **Backend API**: Tu API Gateway en AKS

---

## 📋 Cambios Realizados

Se han configurado todos los componentes necesarios para que tu frontend en Azure Container Apps se comunique correctamente con el backend en AKS.

### 1. ✅ CORS en API Gateway

**Archivo modificado**: `services/api-gateway/src/main.ts`

**Cambios:**
- ✅ Agregado el frontend de Azure Container Apps a los orígenes permitidos
- ✅ Configuración dinámica que lee `FRONTEND_URL` de variables de entorno
- ✅ Soporta HTTP y HTTPS
- ✅ Headers completos para autorización y credenciales
- ✅ Cache de preflight requests (1 hora)

**Orígenes permitidos ahora:**
```typescript
const allowedOrigins = [
  // Local development
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Azure Container Apps - Frontend (NUEVO)
  'https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io',
];

// Plus: cualquier URL en FRONTEND_URL variable
```

**Métodos permitidos:**
- GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD

**Headers permitidos:**
- Content-Type, Authorization, Accept, Origin, X-Requested-With, Access-Control-Allow-Origin, Access-Control-Allow-Credentials

### 2. ✅ FRONTEND_URL en ConfigMap

**Archivo modificado**: `deploy/helm/fuel-system/templates/configmap.yaml`

**Cambios:**
- ✅ Variable `FRONTEND_URL` ahora es configurable por ambiente
- ✅ Valor por defecto: `localhost:5174` (para local)
- ✅ Sobrescrito en Azure: URL del Container Apps

**Uso actual:**
- **Email Service**: Genera links de recuperación de contraseña y verificación de email
  - Formato: `${FRONTEND_URL}/reset-password?token=...`
  - Formato: `${FRONTEND_URL}/verify-email?token=...`

### 3. ✅ values-azure.yaml

**Archivo modificado**: `deploy/azure/values-azure.yaml`

**Cambios:**
- ✅ Nueva variable global: `frontendUrl`
- ✅ Valor configurado: `https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io`

```yaml
frontendUrl: "https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io"
```

Esta variable se inyecta en el ConfigMap y está disponible para todos los microservicios.

---

## 🚀 Cómo Desplegar los Cambios

### Opción 1: Rebuild y Push de Imágenes (Recomendado)

Los cambios en `api-gateway/src/main.ts` requieren rebuilder la imagen:

```bash
# 1. Commit y push los cambios
git add .
git commit -m "feat: Add Azure Container Apps frontend CORS support"
git push origin main

# 2. GitHub Actions automáticamente:
#    - Construye la nueva imagen del api-gateway
#    - La sube a GHCR con tag 'latest'
#    - Tiempo estimado: 5-10 minutos

# 3. Verificar que el workflow terminó
# Ve a: https://github.com/TU_USUARIO/TU_REPO/actions
```

### Opción 2: Build Manual Local (Si GitHub Actions está deshabilitado)

```bash
# Navegar al directorio del proyecto
cd "D:/Sixth Semester/Aplicaciones Distribuidas/Proyecto Combustible/fuel-system-distributed"

# Build de la imagen del API Gateway
docker build -t ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest -f services/api-gateway/Dockerfile .

# Login a GHCR (si no lo has hecho)
echo $GITHUB_TOKEN | docker login ghcr.io -u davidjosuep2 --password-stdin

# Push de la imagen
docker push ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
```

### Paso 3: Actualizar Deployment en AKS

```bash
# Conectar a tu cluster AKS
az aks get-credentials \
  --resource-group fuel-system-rg \
  --name fuel-system-aks \
  --overwrite-existing

# Actualizar con Helm (aplica nuevos valores del ConfigMap y fuerza pull de nueva imagen)
helm upgrade fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml \
  --set apiGateway.image.pullPolicy=Always \
  --wait

# Verificar que el ConfigMap se actualizó
kubectl get configmap fuel-system-config -n fuel-system -o yaml | grep FRONTEND_URL

# Output esperado:
# FRONTEND_URL: "https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io"
```

### Paso 4: Forzar Restart de Pods (Para aplicar nuevos valores)

```bash
# Restart del API Gateway (para aplicar CORS)
kubectl rollout restart deployment/fuel-system-api-gateway -n fuel-system

# Restart del Email Service (para aplicar FRONTEND_URL)
kubectl rollout restart deployment/fuel-system-email-service -n fuel-system

# Monitorear el rollout
kubectl rollout status deployment/fuel-system-api-gateway -n fuel-system
kubectl rollout status deployment/fuel-system-email-service -n fuel-system

# Verificar que los pods están corriendo
kubectl get pods -n fuel-system | grep -E 'api-gateway|email-service'
```

### Paso 5: Verificar Logs

```bash
# Ver logs del API Gateway (buscar mensaje de CORS)
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system --tail=50

# Deberías ver:
# [API Gateway] HTTP server listening on port 8080
# [API Gateway] CORS enabled for origins: [..., 'https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io']

# Ver logs del Email Service
kubectl logs -f deployment/fuel-system-email-service -n fuel-system --tail=50
```

---

## 🧪 Pruebas de Integración

### 1. Probar CORS desde el Frontend

Desde la consola del navegador en tu frontend (https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io):

```javascript
// Obtener la IP de tu API Gateway primero
// Ejecuta en terminal:
// kubectl get svc fuel-system-api-gateway -n fuel-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

const API_URL = 'http://<API_GATEWAY_IP>:8080'; // O https si SSL está habilitado

// Test 1: Preflight request (OPTIONS)
fetch(`${API_URL}/health`, {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io'
  }
}).then(response => {
  console.log('Preflight OK:', response.status); // Debe ser 200 o 204
  console.log('CORS headers:', {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
  });
});

// Test 2: GET request
fetch(`${API_URL}/health`, {
  method: 'GET',
  credentials: 'include', // Para enviar cookies
  headers: {
    'Content-Type': 'application/json'
  }
}).then(response => response.json())
  .then(data => console.log('Health check:', data))
  .catch(err => console.error('CORS error:', err));

// Test 3: POST request (login)
fetch(`${API_URL}/auth/log-in`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
}).then(response => response.json())
  .then(data => console.log('Login response:', data))
  .catch(err => console.error('Login error:', err));
```

### 2. Probar Email de Recuperación de Contraseña

```bash
# Desde tu máquina local o desde Azure Cloud Shell

# 1. Obtener IP del API Gateway
export API_IP=$(kubectl get svc fuel-system-api-gateway -n fuel-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "API Gateway: http://$API_IP:8080"

# 2. Solicitar recuperación de contraseña
curl -X POST http://$API_IP:8080/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 3. Revisar logs del Email Service
kubectl logs -f deployment/fuel-system-email-service -n fuel-system --tail=20

# Deberías ver algo como:
# [EmailService] Sending password recovery email to test@example.com
# [EmailService] Reset URL: https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io/reset-password?token=...
```

### 3. Verificar URL en Email Recibido

Si tienes acceso al email del usuario de prueba:

1. Abre el email de "Recuperación de Contraseña"
2. Verifica que el link apunte a:
   ```
   https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io/reset-password?token=...
   ```
3. Click en el link debería abrir tu frontend en Azure Container Apps

---

## 🛠️ Configuración del Frontend

Tu compañero debe actualizar la URL del API en el frontend. Aquí las variables que debe configurar:

### Variables de Entorno del Frontend

```javascript
// .env o configuración de Azure Container Apps

// URL del API Gateway en AKS
VITE_API_URL=http://<API_GATEWAY_IP>:8080

// O si tienes HTTPS configurado:
VITE_API_URL=https://<API_GATEWAY_IP>:443

// O si tienes un dominio:
VITE_API_URL=https://api.tu-dominio.com
```

### Obtener IP del API Gateway

```bash
# Ejecutar en terminal
kubectl get svc fuel-system-api-gateway -n fuel-system

# Output:
# NAME                        TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)
# fuel-system-api-gateway     LoadBalancer   10.0.x.x      172.183.x.x      8080:xxx/TCP,443:xxx/TCP

# La IP externa es la que debe usar el frontend
```

### Ejemplo de Configuración Axios en Frontend

```typescript
// src/api/axios.ts o similar

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // IMPORTANTE: Para enviar cookies/credentials
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // O donde guardes el token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Ejemplo de Login en Frontend

```typescript
// src/services/auth.service.ts

import api from '@/api/axios';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/log-in', {
      email,
      password,
    });
    
    // Guardar token
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  },
  
  async forgotPassword(email: string) {
    const response = await api.post('/auth/forgot-password', {
      email,
    });
    return response.data;
  },
  
  async resetPassword(token: string, newPassword: string) {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },
};
```

---

## 🔍 Troubleshooting

### Error: "CORS policy blocked"

**Causa**: El API Gateway no reconoce el origen del frontend

**Solución:**

1. Verificar que el API Gateway se actualizó:
   ```bash
   kubectl logs deployment/fuel-system-api-gateway -n fuel-system | grep "CORS enabled"
   ```

2. Verificar que la URL del frontend es exactamente:
   ```
   https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io
   ```
   (Sin `/` al final)

3. Si tu frontend usa un subdominio o URL diferente, agrégalo en `main.ts`:
   ```typescript
   const allowedOrigins = [
     // ...existing origins...
     'https://TU_NUEVA_URL.azurecontainerapps.io',
   ];
   ```

### Error: "Network request failed"

**Causa**: El frontend no puede conectarse al API Gateway

**Solución:**

1. Verificar que el API Gateway tiene IP pública:
   ```bash
   kubectl get svc fuel-system-api-gateway -n fuel-system
   ```

2. Verificar que el NSG (Network Security Group) permite tráfico:
   ```bash
   # Ver reglas del NSG
   az network nsg rule list \
     --resource-group <NODE_RESOURCE_GROUP> \
     --nsg-name <NSG_NAME> \
     --output table
   ```

3. Verificar que el pod está corriendo:
   ```bash
   kubectl get pods -n fuel-system | grep api-gateway
   ```

### Error: "Email con URL incorrecta"

**Causa**: La variable `FRONTEND_URL` no se actualizó en el Email Service

**Solución:**

1. Verificar ConfigMap:
   ```bash
   kubectl get configmap fuel-system-config -n fuel-system -o yaml | grep FRONTEND_URL
   ```

2. Si está mal, actualizar con Helm y restart:
   ```bash
   helm upgrade fuel-system ./deploy/helm/fuel-system \
     --namespace fuel-system \
     --values ./deploy/helm/fuel-system/values.yaml \
     --values ./deploy/azure/values-azure.yaml
   
   kubectl rollout restart deployment/fuel-system-email-service -n fuel-system
   ```

---

## 📝 Checklist de Despliegue

Usa este checklist para verificar que todo está configurado correctamente:

### Backend (AKS)

- [ ] Código del API Gateway actualizado con CORS
- [ ] Nueva imagen del API Gateway construida y subida a GHCR
- [ ] `values-azure.yaml` tiene `frontendUrl` configurado
- [ ] Helm upgrade ejecutado con éxito
- [ ] Pods del API Gateway reiniciados
- [ ] Pods del Email Service reiniciados
- [ ] ConfigMap muestra `FRONTEND_URL` correcto
- [ ] Logs del API Gateway muestran "CORS enabled for origins" con la URL correcta
- [ ] API Gateway tiene IP pública asignada

### Frontend (Azure Container Apps)

- [ ] Variable `VITE_API_URL` configurada con IP del API Gateway
- [ ] Axios configurado con `withCredentials: true`
- [ ] Requests incluyen header `Authorization` con JWT token
- [ ] Frontend puede hacer login exitosamente
- [ ] Frontend puede recibir respuestas de la API

### Testing

- [ ] Preflight OPTIONS request funciona
- [ ] GET `/health` funciona desde el frontend
- [ ] POST `/auth/log-in` funciona desde el frontend
- [ ] Email de recuperación tiene URL correcta del frontend
- [ ] Link de recuperación abre el frontend correcto
- [ ] No hay errores de CORS en la consola del navegador

---

## 🎯 Resumen de URLs

| Componente | URL | Uso |
|------------|-----|-----|
| **Frontend** | `https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io` | Interfaz de usuario |
| **API Gateway** | `http://<IP>:8080` o `https://<IP>:443` | Backend API |
| **Eureka** | `http://<API_IP>:8080/eureka` | Service Discovery (internal) |
| **RabbitMQ** | Internal only | Messaging |
| **Elasticsearch** | Internal only | Logs |

---

## 📞 Información para tu Compañero

**Envíale esto a tu compañero que mantiene el frontend:**

```
Hey! Ya configuré el backend para que funcione con el frontend en Azure.

URL del API: http://<EJECUTA: kubectl get svc fuel-system-api-gateway -n fuel-system>:8080

Configuración necesaria en el frontend:
1. Actualiza VITE_API_URL con la IP del API arriba
2. Asegúrate de tener withCredentials: true en axios
3. Ya configuré CORS para tu URL: https://gasolyne-system-frontend.nicemeadow-78bbf7dc.westus3.azurecontainerapps.io

Para probar:
- Login: POST /auth/log-in
- Health: GET /health
- Forgot password: POST /auth/forgot-password

Los emails de recuperación ya apuntan a tu frontend en Azure.
```

---

**¡Configuración completada!** 🎉

Ahora tu frontend en Azure Container Apps puede comunicarse correctamente con tu backend en AKS.

