# Guía Unificada de Despliegue a Azure AKS

> **Última actualización**: Noviembre 19, 2025  
> **Objetivo**: Explicar de forma clara los dos métodos de despliegue disponibles

---

## Resumen de la Arquitectura de Despliegue

Tu sistema tiene **3 capas** que se despliegan en orden:

### Capa 1: Infraestructura Base (Fase 1-3)
- Azure Resource Group
- Azure PostgreSQL Flexible Server (`fuel-system-postgres.postgres.database.azure.com`)
- AKS Cluster con IP estática y Ingress Controller

### Capa 2: Infraestructura de Aplicación (Fase 4)
- RabbitMQ (Helm chart separado)
- Elasticsearch (Helm chart separado)
- Kibana (Helm chart separado)
- Eureka Server (deployment manual con 1 réplica)

### Capa 3: Microservicios (Fase 5-6)
- API Gateway
- Auth Service
- Driver Service
- Users Service
- Vehicles Service
- Routes Service
- Fuel Service
- Email Service
- Logger Service
- Publisher Service

---

## Valores de Ejemplo Usados en esta Guía

**IMPORTANTE:** Estos son valores de ejemplo para pruebas. En producción real, usa valores seguros y diferentes.

| Recurso | Valor de Ejemplo |
|---------|------------------|
| **PostgreSQL FQDN** | `fuel-system-postgres.postgres.database.azure.com` |
| **PostgreSQL Read Replica** | `fuel-system-postgres-read.postgres.database.azure.com` |
| **PostgreSQL Username** | `pgadmin@fuel-system-postgres` (formato: usuario@servidor) |
| **PostgreSQL Password** | `FuelSystem2024!Secure` |
| **PostgreSQL SSL Mode** | `require` (OBLIGATORIO en Azure) |
| **RabbitMQ Username** | `admin` |
| **RabbitMQ Password** | `RabbitDev2024` |
| **JWT Secret** | `my-super-secret-jwt-key-minimum-32-characters-long-for-security` |
| **Eureka Replicas** | `1` |
| **Ingress IP** | IP estática asignada en Fase 3 |

---

## Dos Métodos de Despliegue

### Método 1: Manual (Recomendado para aprender)

**Ventajas:**
- Control total de cada paso
- Fácil de debuggear
- Entiendes qué hace cada comando

**Desventajas:**
- Más lento
- Propenso a errores humanos

**Cuándo usar:** Primera vez, desarrollo, troubleshooting

### Método 2: CI/CD con GitHub Actions (Recomendado para producción)

**Ventajas:**
- Automatizado
- Consistente
- Rápido después del setup inicial

**Desventajas:**
- Requiere configuración inicial de secrets
- Más difícil de debuggear

**Cuándo usar:** Después de validar manual, para deploys frecuentes

---

## Flujo de Archivos

### Archivos de Configuración de Helm

```
deploy/helm/fuel-system/
├── Chart.yaml                    # Metadata del chart
├── values.yaml                   # Valores DEFAULT (para todos los ambientes)
├── templates/
│   ├── configmap.yaml           # ConfigMap con variables de entorno
│   ├── secrets.yaml             # Secrets (se crean si no existen)
│   ├── eureka-server.yaml       # Eureka (deshabilitado, se despliega manual)
│   ├── api-gateway.yaml         # API Gateway deployment + service + HPA
│   ├── auth-service.yaml        # Auth Service deployment + service + HPA
│   ├── microservices.yaml       # Resto de microservicios
│   └── ingress.yaml             # Ingress para exponer API Gateway
└── _helpers.tpl                 # Funciones helper de Helm
```

### Archivos de Valores por Ambiente

```
deploy/local/values-local.yaml    # Sobrescribe values.yaml para local (Kind)
deploy/azure/values-azure.yaml    # Sobrescribe values.yaml para Azure (AKS)
```

### Archivos de Infraestructura (Fase 4)

```
deploy/azure/helm-values/
├── elasticsearch-values-dev.yaml
├── elasticsearch-values-prod.yaml
├── rabbitmq-values-dev.yaml
├── rabbitmq-values-prod.yaml
├── kibana-values-dev.yaml
└── kibana-values-prod.yaml
```

---

## Cómo Funciona Helm

Cuando ejecutas:

```bash
helm install fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml
```

**Helm hace lo siguiente:**

1. Lee `values.yaml` (valores base)
2. Lee `values-azure.yaml` (sobrescribe valores específicos de Azure)
3. Procesa cada archivo en `templates/` reemplazando `{{ .Values.xxx }}`
4. Aplica los manifests resultantes a Kubernetes

**Ejemplo:**

En `values.yaml`:
```yaml
postgresql:
  external:
    password: "CHANGE_ME"
```

En `values-azure.yaml`:
```yaml
postgresql:
  external:
    password: "FuelSystem2024!Secure"  # Sobrescribe
```

Resultado: Se usa `FuelSystem2024!Secure` como password.

---

## Método 1: Despliegue Manual Paso a Paso

### Pre-requisitos

- Fases 1-4 completadas (ver 01 a 04-AZURE-*.md)
- `kubectl` configurado con contexto de AKS
- Imágenes en GHCR públicas (Fase 5)

### Paso 1: Crear Secrets de Producción

```bash
# Namespace
kubectl create namespace fuel-system

# PostgreSQL Secret
# IMPORTANTE: Debe coincidir con el password de Azure PostgreSQL
# CRÍTICO: En Azure el username debe ser: usuario@servidor
kubectl create secret generic fuel-system-postgresql \
  --from-literal=username='pgadmin@fuel-system-postgres' \
  --from-literal=password='FuelSystem2024!Secure' \
  --namespace=fuel-system

# RabbitMQ Secret
kubectl create secret generic fuel-system-rabbitmq \
  --from-literal=username=admin \
  --from-literal=password='RabbitDev2024' \
  --namespace=fuel-system

# JWT Secret
kubectl create secret generic fuel-system-jwt \
  --from-literal=secret='my-super-secret-jwt-key-minimum-32-characters-long-for-security' \
  --namespace=fuel-system

# SMTP Secret (ejemplo con Gmail)
kubectl create secret generic fuel-system-smtp \
  --from-literal=host='smtp.gmail.com' \
  --from-literal=port='587' \
  --from-literal=user='fuel-system-test@gmail.com' \
  --from-literal=password='tu-app-password-de-gmail' \
  --namespace=fuel-system
```

### Paso 2: Verificar values-azure.yaml

El archivo `deploy/azure/values-azure.yaml` ya contiene:

```yaml
postgresql:
  external:
    hosts:
      auth: "fuel-system-postgres.postgres.database.azure.com"
      # ... (todos usan el mismo servidor)
    username: "pgadmin"
    password: "FuelSystem2024!Secure"
    sslMode: "require"  # OBLIGATORIO en Azure

secrets:
  postgresql:
    password: "FuelSystem2024!Secure"
  rabbitmq:
    password: "RabbitDev2024"
```

**Si tu servidor tiene un nombre diferente**, edita este archivo.

### Paso 3: Desplegar Eureka Server (1 réplica)

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eureka-server
  namespace: fuel-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: eureka-server
  template:
    metadata:
      labels:
        app: eureka-server
    spec:
      containers:
      - name: eureka-server
        image: steeltoeoss/eureka-server:latest
        ports:
        - containerPort: 8761
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: eureka-server
  namespace: fuel-system
spec:
  type: ClusterIP
  ports:
  - port: 8761
    targetPort: 8761
  selector:
    app: eureka-server
EOF
```

### Paso 4: Desplegar con Helm

```bash
# Desde la raíz del proyecto
cd "D:/Sixth Semester/Aplicaciones Distribuidas/Proyecto Combustible/fuel-system-distributed"

# Desplegar
helm upgrade --install fuel-system ./deploy/helm/fuel-system \
  --namespace fuel-system \
  --create-namespace \
  --values ./deploy/helm/fuel-system/values.yaml \
  --values ./deploy/azure/values-azure.yaml \
  --wait \
  --timeout 15m \
  --debug

# Monitorear
kubectl get pods -n fuel-system -w
```

### Paso 5: Verificar

```bash
# Ver todos los pods
kubectl get pods -n fuel-system

# Ver servicios
kubectl get svc -n fuel-system

# Ver ingress
kubectl get ingress -n fuel-system

# Obtener IP pública (estática configurada en Fase 3)
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

---

## Método 2: Despliegue Automático con CI/CD

### Pre-requisitos

- Fases 1-4 completadas manualmente
- GitHub repository configurado
- Imágenes compiladas por workflow `build-and-push.yml`

### Paso 1: Configurar GitHub Secrets

Ve a tu repositorio en GitHub → Settings → Secrets and variables → Actions

Crea estos secrets con los **valores de ejemplo**:

| Secret Name | Valor de Ejemplo |
|-------------|------------------|
| `AKS_CLUSTER_NAME` | `fuel-system-aks` |
| `AKS_RESOURCE_GROUP` | `fuel-system-rg` |
| `AZURE_CREDENTIALS` | `{"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}` |
| `POSTGRES_HOST` | `fuel-system-postgres.postgres.database.azure.com` |
| `POSTGRES_USERNAME` | `pgadmin` |
| `POSTGRES_PASSWORD` | `FuelSystem2024!Secure` |
| `RABBITMQ_PASSWORD` | `RabbitDev2024` |
| `JWT_SECRET` | `my-super-secret-jwt-key-minimum-32-characters-long-for-security` |
| `SMTP_USER` | `fuel-system-test@gmail.com` |
| `SMTP_PASSWORD` | `tu-app-password` |

### Paso 2: Hacer Push

```bash
git add .
git commit -m "Deploy to Azure"
git push origin main
```

El workflow se ejecutará automáticamente después de que `build-and-push.yml` termine.

### Paso 3: Monitorear el Workflow

Ve a GitHub → Actions → Verás "Deploy to Azure AKS" ejecutándose

---

## Troubleshooting Común

### Problema: Pods en CrashLoopBackOff

**Causa:** Init containers no pueden conectar a la base de datos

**Solución:**
```bash
# Ver logs del init container
kubectl logs POD_NAME -c typeorm-migrate -n fuel-system
kubectl logs POD_NAME -c prisma-migrate -n fuel-system

# Verificar que el host de PostgreSQL sea correcto
kubectl get configmap fuel-system-config -n fuel-system -o yaml | grep DB_HOST
```

### Problema: "password authentication failed"

**Causa:** Password incorrecto en el secret

**Solución:**
```bash
# Verificar password en secret
kubectl get secret fuel-system-postgresql -n fuel-system -o jsonpath='{.data.password}' | base64 --decode

# Debe mostrar: FuelSystem2024!Secure

# Si es incorrecto, recrear:
kubectl delete secret fuel-system-postgresql -n fuel-system
kubectl create secret generic fuel-system-postgresql \
  --from-literal=username=pgadmin \
  --from-literal=password='FuelSystem2024!Secure' \
  --namespace=fuel-system

# Reiniciar pods
kubectl rollout restart deployment -n fuel-system
```

### Problema: "ImagePullBackOff"

**Causa:** No puede descargar la imagen de GHCR

**Solución:**
```bash
# Verificar que la imagen existe y es pública
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
```

### Problema: Services no se registran en Eureka

**Causa:** Variables de entorno incorrectas

**Solución:**
```bash
# Verificar ConfigMap
kubectl get configmap fuel-system-config -n fuel-system -o yaml

# Verificar que DISCOVERY_MODE=eureka
# Verificar que EUREKA_HOST=eureka-server

# Reiniciar pods
kubectl rollout restart deployment -n fuel-system
```

---

## Comparación: Manual vs CI/CD

| Aspecto | Manual | CI/CD |
|---------|--------|-------|
| **Tiempo inicial** | 15 min | 30 min (setup) |
| **Deploys posteriores** | 15 min cada vez | 5 min (automático) |
| **Control** | Total | Limitado |
| **Errores** | Fácil de ver | Requiere logs de GitHub |
| **Rollback** | Manual | Con Git revert |
| **Auditoría** | No | Sí (historial de GitHub) |

---

## Recomendación

**Para tu caso (estudiante aprendiendo y probando):**

1. **Primera vez:** Usa método manual para entender cada paso
2. **Después de validar:** Configura CI/CD para deploys rápidos
3. **Para experimentar:** Sigue usando manual en desarrollo

---

## Próximos Pasos

Una vez desplegado exitosamente:

1. Probar endpoints del API Gateway (con la IP estática)
2. Verificar Eureka Dashboard (debe mostrar 1 instancia de Eureka)
3. Revisar logs en Kibana
4. Configurar dominio y SSL (Fase 7)

---

## Resumen de Comandos Útiles

```bash
# Ver todo
kubectl get all -n fuel-system

# Logs en tiempo real
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Ejecutar comando en pod
kubectl exec -it POD_NAME -n fuel-system -- /bin/sh

# Port-forward
kubectl port-forward svc/fuel-system-api-gateway -n fuel-system 8080:8080

# Port-forward a Eureka
kubectl port-forward svc/eureka-server -n fuel-system 8761:8761

# Eliminar todo
helm uninstall fuel-system -n fuel-system
kubectl delete namespace fuel-system
```

---

## Configuración de IP Estática

La IP estática se configura automáticamente en la Fase 3 cuando creas el cluster y despliegas el NGINX Ingress Controller. 

Azure asigna automáticamente una IP pública al Load Balancer, y en el paso 13 de la Fase 3 se documenta cómo hacerla estática permanentemente.

**Beneficios de la IP estática:**
- No cambia si eliminas y recreas el Ingress Controller
- Puedes configurar DNS apuntando a esta IP
- Facilita la configuración de certificados SSL

**Para verificar tu IP estática:**
```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```
