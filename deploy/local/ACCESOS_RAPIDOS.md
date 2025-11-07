# 🌐 Accesos Rápidos - Fuel System Local

> **Última actualización**: Noviembre 6, 2025
> **Estado**: ✅ Verificado y funcionando

## 📍 Acceso Principal (Con Ingress)

Una vez que el NGINX Ingress Controller esté instalado, accede a todos los servicios por **puerto 80**:

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **API Gateway** | http://localhost/ | N/A |
| **Eureka Dashboard** | http://localhost/eureka | N/A |
| **RabbitMQ Management** | http://localhost/rabbitmq | admin / admin123 |

## 🔌 Acceso Alternativo (NodePort)

Si el Ingress no está configurado, accede directamente por NodePort:

| Servicio | URL | Puerto NodePort | Credenciales |
|----------|-----|-----------------|--------------|
| **API Gateway** | http://localhost:3000 | 30000 | N/A |
| **Eureka Dashboard** | http://localhost:8761 | 30761 | N/A |
| **RabbitMQ Management** | http://localhost:15672 | 31672 | admin / admin123 |
| **Elasticsearch** | http://localhost:9200 | 30920 | N/A |

## 🚀 Verificación Rápida

### 1. Ver todos los pods corriendo
```powershell
kubectl get pods -n fuel-system
```

**Esperado**: Todos los pods deben estar en estado `Running` (excepto algunos que pueden estar en `CrashLoopBackOff` si tienen dependencias faltantes).

### 2. Verificar servicios expuestos
```powershell
kubectl get svc -n fuel-system
```

### 3. Verificar Ingress
```powershell
kubectl get ingress -n fuel-system
```

**Esperado**: Debes ver 3 Ingress:
- `fuel-system` - Ingress del chart de Helm
- `fuel-system-local` - Ingress con rutas adicionales
- `fuel-system-services` - Ingress con subdominios (opcional)

## 🧪 Pruebas de Endpoints

### API Gateway (Con Ingress)
```bash
# Health check
curl http://localhost/health

# Login
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### API Gateway (Sin Ingress)
```bash
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Eureka Dashboard
Abre en tu navegador:
- Con Ingress: http://localhost/eureka
- Sin Ingress: http://localhost:8761

**Qué verificar:**
- Eureka debe mostrar los microservicios registrados
- Busca: `FUEL-SYSTEM-API-GATEWAY`, `FUEL-SYSTEM-AUTH-SERVICE`, etc.

### RabbitMQ Management
Abre en tu navegador:
- Con Ingress: http://localhost/rabbitmq
- Sin Ingress: http://localhost:15672

**Credenciales:**
- Usuario: `admin`
- Password: `admin123`

**Qué verificar:**
- Dashboard de RabbitMQ debe cargar
- Ve a "Queues" para ver las colas creadas

### Elasticsearch
```bash
# Ver el estado del cluster
curl http://localhost:9200

# Ver índices
curl http://localhost:9200/_cat/indices?v
```

## 🔧 Port-Forward (Para Debugging)

Si necesitas acceder a un servicio específico sin Ingress o NodePort:

```powershell
# API Gateway
kubectl port-forward -n fuel-system svc/fuel-system-api-gateway 8080:8080

# Auth Service (gRPC)
kubectl port-forward -n fuel-system svc/fuel-system-auth-service 50052:50052

# PostgreSQL (Auth DB)
kubectl port-forward -n fuel-system svc/auth-db-postgresql 5432:5432

# RabbitMQ
kubectl port-forward -n fuel-system svc/rabbitmq 15672:15672
```

Luego accede en `http://localhost:<puerto-local>`

## 📊 Mapeo de Puertos en Kind

El cluster Kind mapea los siguientes puertos del contenedor al host:

| Puerto Host | Puerto NodePort | Servicio |
|-------------|-----------------|----------|
| 3000 | 30000 | API Gateway |
| 8761 | 30761 | Eureka Server |
| 15672 | 31672 | RabbitMQ Management |
| 9200 | 30920 | Elasticsearch |

**Verificar mapeo de puertos:**
```powershell
docker ps --filter name=fuel-local-control-plane --format "table {{.Names}}\t{{.Ports}}"
```

## 🐛 Troubleshooting de Accesos

### Problema: "This site can't be reached" en localhost

**Causas posibles:**
1. ❌ NGINX Ingress Controller no está instalado
2. ❌ El servicio no está corriendo
3. ❌ Kind no tiene los puertos mapeados

**Soluciones:**

```powershell
# 1. Verificar que Ingress Controller está corriendo
kubectl get pods -n ingress-nginx

# Si no está instalado:
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# 2. Verificar que el servicio existe
kubectl get svc -n fuel-system eureka-server

# 3. Verificar mapeo de puertos de Kind
docker ps --filter name=fuel-local
```

### Problema: Eureka no muestra microservicios

**Verificar:**
```powershell
# Ver logs de Eureka
kubectl logs -n fuel-system deployment/eureka-server

# Ver logs de un microservicio
kubectl logs -n fuel-system deployment/fuel-system-api-gateway

# Verificar que pueden alcanzar Eureka
kubectl exec -it -n fuel-system deployment/fuel-system-api-gateway -- nslookup eureka-server
```

### Problema: RabbitMQ no acepta conexiones

**Verificar:**
```powershell
# Ver logs de RabbitMQ
kubectl logs -n fuel-system statefulset/rabbitmq

# Verificar que el pod está Running
kubectl get pods -n fuel-system -l app.kubernetes.io/name=rabbitmq

# Probar conexión desde dentro del cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n fuel-system -- curl http://rabbitmq:15672
```

## 📝 Notas Importantes

### Sobre Ingress con Rutas
El archivo `ingress-local.yaml` define rutas usando regex para enrutar correctamente:
- `/()(.*)` → API Gateway
- `/eureka(/|$)(.*)` → Eureka Server  
- `/rabbitmq(/|$)(.*)` → RabbitMQ Management

Estas rutas usan `rewrite-target: /$2` para eliminar el prefijo de la ruta.

### Sobre NodePort vs LoadBalancer
En Kind, los servicios tipo `LoadBalancer` no reciben una IP externa. Por eso:
- Usamos `NodePort` para servicios que queremos exponer
- Los NodePort se mapean en el `kind-config.yaml`
- El Ingress Controller hace de proxy unificado en el puerto 80

### Sobre el orden de los despliegues
**IMPORTANTE**: El orden correcto es:
1. ✅ Crear cluster Kind
2. ✅ Instalar NGINX Ingress Controller
3. ✅ Desplegar infraestructura (PostgreSQL, RabbitMQ, Elasticsearch)
4. ✅ Desplegar Eureka Server
5. ✅ Desplegar microservicios (chart `fuel-system`)
6. ✅ Aplicar Ingress adicional (opcional)

## 🎯 Checklist de Verificación de Accesos

- [ ] ✅ http://localhost/ → API Gateway responde
- [ ] ✅ http://localhost/eureka → Eureka Dashboard carga
- [ ] ✅ http://localhost/rabbitmq → RabbitMQ Management carga
- [ ] ✅ http://localhost:8761 → Eureka Dashboard (NodePort)
- [ ] ✅ http://localhost:15672 → RabbitMQ Management (NodePort)
- [ ] ✅ http://localhost:9200 → Elasticsearch responde
- [ ] ✅ Microservicios aparecen registrados en Eureka
- [ ] ✅ Puedo hacer login en el API Gateway

## 🔗 Enlaces de Referencia

- **Documentación completa**: `kind-fuel-local.md`
- **Troubleshooting avanzado**: `kind-fuel-local.md#troubleshooting`
- **Scripts útiles**: `quick-commands.ps1`
- **Configuración de Ingress**: `ingress-local.yaml`

---

**¿Problemas para acceder?** Revisa la sección de Troubleshooting o ejecuta:
```powershell
# Diagnóstico completo
.\diagnose-eureka.ps1

# Ver estado de todo
kubectl get all -n fuel-system
```

**¡Happy Testing! 🚀**

