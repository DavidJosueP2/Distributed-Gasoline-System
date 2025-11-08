# 🏠 Local Kubernetes Deployment

Esta carpeta contiene toda la configuración necesaria para desplegar el **Fuel System** en un cluster de Kubernetes local.

## 📁 Contenido

- **`king-fuel-local.md`**: Guía completa paso a paso para montar todo el sistema en local
- **`kind-config.yaml`**: Configuración del cluster Kind con 1 control-plane y 2 workers
- **`values-local.yaml`**: Valores de Helm optimizados para entorno local
- **`eureka-deployment.yaml`**: Deployment y Service de Eureka Server
- **`deploy-infra.sh`**: Script automatizado para Linux/macOS
- **`deploy-infra.ps1`**: Script automatizado para Windows PowerShell
- **`quick-commands.ps1`**: Comandos útiles para gestionar el despliegue

## 🚀 Quick Start

### 1. Crear el Cluster (con Kind)

```bash
# Crear cluster con configuración que expone puertos para Ingress
kind create cluster --name fuel-local --config ./kind-config.yaml

# Verificar
kubectl cluster-info --context kind-fuel-local
```

### 2. Instalar NGINX Ingress Controller

**⚠️ IMPORTANTE**: Este paso debe hacerse ANTES de desplegar la infraestructura.

**Windows (PowerShell):**
```powershell
.\install-ingress.ps1
```

**Manualmente:**
```bash
# Instalar NGINX Ingress Controller para Kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Esperar a que esté listo (toma ~60 segundos)
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### 3. Desplegar Infraestructura

**Windows (PowerShell):**
```powershell
.\deploy-infra.ps1
```

O usa el script de comandos rápidos:
```powershell
# Cargar funciones
. .\quick-commands.ps1

# Ver comandos disponibles
Show-Help

# Desplegar todo
Deploy-All
```

**Linux/macOS:**
```bash
chmod +x ./deploy-infra.sh
./deploy-infra.sh
```

### 4. Desplegar Eureka Server

```bash
kubectl apply -f ./eureka-deployment.yaml -n fuel-system

# Verificar
kubectl get pods -n fuel-system -l app=eureka-server
```

### 5. Desplegar Microservicios

**NOTA**: Las imágenes de GHCR son públicas, no necesitas crear un secret.

```bash
cd ../helm/fuel-system

# Instalar con valores locales (Ingress incluido)
helm install fuel-system . \
  --namespace fuel-system \
  --values ./values.yaml \
  --values ../../local/values-local.yaml

# Verificar el despliegue
kubectl get pods -n fuel-system
kubectl get ingress -n fuel-system
```

### 6. (Opcional) Aplicar Ingress adicional para Eureka y RabbitMQ

```bash
kubectl apply -f ../../local/ingress-local.yaml -n fuel-system
```

## 🌐 Accesos a los Servicios

### Con Ingress (Recomendado - Puerto 80):
- **API Gateway**: http://localhost/
- **Eureka Dashboard**: http://localhost/eureka
- **RabbitMQ Management**: http://localhost/rabbitmq (usuario: admin, password: admin123)

### Sin Ingress (NodePort - Puertos Específicos):
- **API Gateway**: http://localhost:3000
- **Eureka Dashboard**: http://localhost:8761
- **RabbitMQ Management**: http://localhost:15672 (usuario: admin, password: admin123)
- **Elasticsearch**: http://localhost:9200

### 2. Instalar NGINX Ingress Controller

**⚠️ IMPORTANTE**: Este paso debe hacerse ANTES de desplegar la infraestructura.

**Windows (PowerShell):**
```powershell
.\install-ingress.ps1
```

**Manualmente:**
```bash
# Instalar NGINX Ingress Controller para Kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Esperar a que esté listo (toma ~60 segundos)
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### 3. Desplegar Infraestructura

**Windows (PowerShell):**
```powershell
.\deploy-infra.ps1
```

O usa el script de comandos rápidos:
```powershell
# Cargar funciones
. .\quick-commands.ps1

# Ver comandos disponibles
Show-Help

# Desplegar todo
Deploy-All
```

**Linux/macOS:**
```bash
chmod +x ./deploy-infra.sh
./deploy-infra.sh
```

### 4. Desplegar Eureka Server

```bash
kubectl apply -f ./eureka-deployment.yaml -n fuel-system

# Verificar
kubectl get pods -n fuel-system -l app=eureka-server
```

### 5. Desplegar Microservicios

**NOTA**: Las imágenes de GHCR son públicas, no necesitas crear un secret.

```bash
cd ../helm/fuel-system

# Instalar con valores locales (Ingress incluido)
helm install fuel-system . \
  --namespace fuel-system \
  --values ./values.yaml \
  --values ../../local/values-local.yaml

# Verificar el despliegue
kubectl get pods -n fuel-system
kubectl get ingress -n fuel-system
```

### 6. (Opcional) Aplicar Ingress adicional para Eureka y RabbitMQ

```bash
kubectl apply -f ../../local/ingress-local.yaml -n fuel-system
```

## 🌐 Acceso a Servicios

### Con Ingress (Recomendado)

Una vez instalado NGINX Ingress Controller, accede a los servicios en:

- **API Gateway**: http://localhost/
- **Eureka Dashboard**: http://localhost/eureka
- **RabbitMQ Management**: http://localhost/rabbitmq (usuario: admin, password: admin123)

### Con NodePort (Alternativa)

Si no usas Ingress, accede directamente por NodePort:

- **API Gateway**: http://localhost:3000
- **Eureka Dashboard**: http://localhost:8761
- **RabbitMQ Management**: http://localhost:15672 (usuario: admin, password: admin123)
- **Elasticsearch**: http://localhost:9200

### Con Port-Forward (Para debugging)

```bash
# API Gateway
kubectl port-forward -n fuel-system svc/fuel-system-api-gateway 8080:8080

# Eureka Server
kubectl port-forward -n fuel-system svc/eureka-server 8761:8761

# RabbitMQ
kubectl port-forward -n fuel-system svc/rabbitmq 15672:15672
```

## 🔍 Verificación

### Verificar que todo está funcionando

```bash
# Ver todos los pods
kubectl get pods -n fuel-system

# Ver servicios
kubectl get svc -n fuel-system

# Ver Ingress
kubectl get ingress -n fuel-system

# Ver logs de un servicio
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system
```

### Probar el API Gateway

```bash
# Con Ingress
curl http://localhost/health

# Con NodePort
curl http://localhost:3000/health
```

### Verificar Eureka Dashboard

Abre tu navegador en:
- Con Ingress: http://localhost/eureka
- Con NodePort: http://localhost:8761

Deberías ver los microservicios registrados.

## 📝 Comandos Útiles

### Gestión del Cluster

```bash
# Ver contextos
kubectl config get-contexts

# Cambiar contexto
kubectl config use-context kind-fuel-local

# Ver todos los recursos
kubectl get all -n fuel-system
```

### Debugging

```bash
# Logs de un pod
kubectl logs -f <pod-name> -n fuel-system

# Logs de un deployment
kubectl logs -f deployment/fuel-system-driver-service -n fuel-system

# Entrar a un pod
kubectl exec -it <pod-name> -n fuel-system -- /bin/sh

# Ver eventos
kubectl get events -n fuel-system --sort-by='.lastTimestamp'
```

### Actualizar Despliegue

```bash
cd ../helm/fuel-system

# Actualizar el release
helm upgrade fuel-system . \
  --namespace fuel-system \
  --values ./values.yaml \
  --values ../../local/values-local.yaml

# Reiniciar un deployment
kubectl rollout restart deployment/fuel-system-driver-service -n fuel-system
```

### Limpieza

```bash
# Desinstalar microservicios
helm uninstall fuel-system -n fuel-system

# Desinstalar infraestructura (⚠️ elimina las bases de datos)
helm uninstall auth-db driver-db users-db vehicles-db vehicles-shadow-db -n fuel-system
helm uninstall rabbitmq elasticsearch -n fuel-system
kubectl delete -f ./eureka-deployment.yaml -n fuel-system

# Eliminar el namespace completo (⚠️ elimina TODO)
kubectl delete namespace fuel-system

# Eliminar el cluster de Kind
kind delete cluster --name fuel-local
```

## 🐛 Troubleshooting

### Problema: Ingress no responde

```bash
# Verificar que NGINX Ingress Controller está corriendo
kubectl get pods -n ingress-nginx

# Ver logs del Ingress Controller
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Verificar el Ingress
kubectl describe ingress fuel-system -n fuel-system
```

**Solución**: Asegúrate de que el cluster Kind se creó con `kind-config.yaml` que tiene los `extraPortMappings` configurados.

### Problema: Microservicios no se registran en Eureka

```bash
# Verificar que Eureka está corriendo
kubectl get pods -n fuel-system -l app=eureka-server

# Verificar que el servicio de Eureka existe
kubectl get svc eureka-server -n fuel-system

# Ver logs de Eureka
kubectl logs -n fuel-system deployment/eureka-server
```

**Solución**: El servicio de Eureka debe llamarse `eureka-server` (sin prefijo `fuel-system-`) para que los microservicios se conecten correctamente.

### Problema: "ImagePullBackOff"

Las imágenes de GHCR son públicas, así que este error no debería ocurrir. Si sucede:

```bash
# Verificar el evento del pod
kubectl describe pod <pod-name> -n fuel-system

# Verificar que la imagen existe
docker pull ghcr.io/davidjosuep2/distributed-gasoline-system/fuel-system/api-gateway:latest
```

### Problema: Pods en "CrashLoopBackOff"

```bash
# Ver logs del pod que falla
kubectl logs <pod-name> -n fuel-system --previous

# Ver logs en tiempo real
kubectl logs -f <pod-name> -n fuel-system
```

**Causas comunes**:
- Falta configurar variables de entorno
- No puede conectarse a la base de datos
- No puede conectarse a Eureka

## 📚 Documentación Adicional

- **ARCHITECTURE.md**: Arquitectura general del sistema
- **MIGRATIONS_GUIDE.md**: Guía de migraciones de base de datos
- **SEEDING_STRATEGY.md**: Estrategia de seeding de datos
- **SOLUCION_VARIABLES_ENV.md**: Solución de problemas de variables de entorno

## 🎯 Arquitectura de Despliegue Local

```
┌─────────────────────────────────────────────────────────────┐
│                     NGINX Ingress Controller                 │
│                      (localhost:80/443)                      │
└───────────┬──────────────────────┬─────────────────┬────────┘
            │                      │                 │
            ▼                      ▼                 ▼
    ┌──────────────┐      ┌──────────────┐  ┌─────────────┐
    │ API Gateway  │      │   Eureka     │  │  RabbitMQ   │
    │  (Port 8080) │      │ (Port 8761)  │  │ Management  │
    └──────┬───────┘      └──────┬───────┘  └─────────────┘
           │                     │
           ▼                     ▼
    ┌──────────────────────────────────┐
    │      Microservicios (gRPC)       │
    │  Auth • Driver • Users • Vehicles│
    │   Email • Logger • Publisher     │
    └──────────┬───────────────────────┘
               │
               ▼
```
