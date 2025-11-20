# 🚀 Guía Completa de Despliegue a Azure - Índice

> **Última actualización**: Noviembre 18, 2025  
> **Estado**: Listo para producción  
> **Ambiente**: Azure Kubernetes Service (AKS)

---

## 📋 Tabla de Contenidos

Esta guía está dividida en **7 fases** para facilitar el proceso de despliegue a Azure:

### **Fase 1: Preparación y Recursos Base**
📄 [`01-AZURE-SETUP-BASE.md`](./01-AZURE-SETUP-BASE.md)
- Instalación de Azure CLI
- Creación de Resource Group
- Configuración de Service Principal
- ✅ **SIN Azure Container Registry (ACR)** - Usarás GHCR público
- Configuración de GitHub Secrets

**Tiempo estimado**: 20 minutos

---

### **Fase 2: Infraestructura de Base de Datos**
📄 [`02-AZURE-POSTGRESQL.md`](./02-AZURE-POSTGRESQL.md)
- Creación de Azure Database for PostgreSQL Flexible Server
- Configuración: **GeneralPurpose tier, Standard_D4ads_v5 (4 vCores, 16GB RAM)**
- **PostgreSQL Version 17**
- **Storage**: 128 GB
- **HA Mode**: Same-Zone con failover automático
- Configuración de Firewall y VNet
- Creación de bases de datos (auth_db, driver_db, users_db, vehicles_db, routes_db, vehicles_shadow_db)
- **Réplica de lectura** para optimización de queries
- Configuración de SSL/TLS
- Testing de conexión

**Tiempo estimado**: 45 minutos

---

### **Fase 3: Cluster de Kubernetes (AKS)**
📄 [`03-AZURE-AKS-CLUSTER.md`](./03-AZURE-AKS-CLUSTER.md)
- Creación de AKS Cluster
- Configuración de integración ACR ↔ AKS
- Instalación de NGINX Ingress Controller
- Configuración de Load Balancer
- Configuración de autoescalado (HPA + Cluster Autoscaler)

**Tiempo estimado**: 30 minutos

---

### **Fase 4: Infraestructura de Mensajería y Logs**
📄 [`04-AZURE-RABBITMQ-ELASTICSEARCH.md`](./04-AZURE-RABBITMQ-ELASTICSEARCH.md)
- Despliegue de RabbitMQ en AKS con Helm
- Configuración de persistencia (Azure Disk)
- Despliegue de Elasticsearch en AKS
- Configuración de Kibana (opcional)
- Testing de conexión

**Tiempo estimado**: 40 minutos

---

### **Fase 5: Build y Push de Imágenes Docker**
📄 [`05-AZURE-BUILD-IMAGES.md`](./05-AZURE-BUILD-IMAGES.md)
- ✅ Uso de **GHCR (GitHub Container Registry) público**
- ❌ **NO se requiere ACR** (ahorro de $20-200/mes)
- Configuración de GitHub Actions (automatizado)
- Verificación de imágenes en GHCR
- Tagging estratégico

**Tiempo estimado**: 10 minutos (automatizado con GitHub Actions)

---

### **Fase 6: Despliegue de Microservicios**
📄 [`06-AZURE-DEPLOY-SERVICES.md`](./06-AZURE-DEPLOY-SERVICES.md)
- Despliegue de Eureka Server
- Configuración de valores para Azure (`values-azure.yaml`)
- Despliegue con Helm del chart `fuel-system`
- Configuración de Secrets para producción
- Verificación de Init Containers y migraciones
- Testing de Service Discovery

**Tiempo estimado**: 30 minutos

---

### **Fase 7: Configuración de Red y Seguridad**
📄 [`07-AZURE-NETWORKING-SECURITY.md`](./07-AZURE-NETWORKING-SECURITY.md)
- Configuración de Ingress con dominio público
- SSL/TLS con Let's Encrypt (cert-manager)
- Azure Application Gateway (opcional)
- Network Policies
- Azure Monitor y Application Insights
- Configuración de alertas

**Tiempo estimado**: 45 minutos

---

## 🎯 Flujo Completo de Despliegue

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: Setup Base                                          │
│ - Azure CLI, Resource Group, ACR, Service Principal         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 2: PostgreSQL                                          │
│ - Azure Database for PostgreSQL Flexible Server             │
│ - 6 bases de datos + configuración SSL                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 3: AKS Cluster                                         │
│ - Cluster de Kubernetes + NGINX Ingress + Load Balancer     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 4: RabbitMQ + Elasticsearch                            │
│ - Mensajería y logs centralizados en AKS                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 5: Build & Push Imágenes                               │
│ - 9 imágenes Docker en ACR (manual o GitHub Actions)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 6: Deploy Microservicios                               │
│ - Eureka + 9 microservicios con Helm                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 7: Networking & Security                               │
│ - Ingress + SSL + Monitoreo + Alertas                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Arquitectura Final en Azure

```
                         ┌─────────────────────┐
                         │   Azure Front Door  │
                         │  (Load Balancer)    │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  Azure Application  │
                         │     Gateway         │
                         │   (Opcional)        │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────▼─────────────────────┐
              │         NGINX Ingress Controller          │
              │              (en AKS)                     │
              └─────────────────────┬─────────────────────┘
                                    │
              ┌─────────────────────▼─────────────────────┐
              │          API Gateway (2 réplicas)         │
              │         Port 8080 - HTTP/REST             │
              └─────────────────────┬─────────────────────┘
                                    │
              ┌─────────────────────▼─────────────────────┐
              │         Eureka Server (2 réplicas)        │
              │       Service Discovery - Port 8761       │
              └─────────────────────┬─────────────────────┘
                                    │
      ┌─────────────────────────────┼─────────────────────────────┐
      │                             │                             │
      ▼                             ▼                             ▼
┌──────────┐               ┌──────────────┐              ┌──────────┐
│ Auth-SVC │               │  Driver-MS   │              │Users-SRV │
│gRPC:50052│               │gRPC:50062    │              │gRPC:50057│
│(HPA 2-5) │               │HTTP:3100     │              │(HPA 2-5) │
└────┬─────┘               │(HPA 2-5)     │              └────┬─────┘
     │                     └──────┬───────┘                    │
     │                            │                            │
     │                     ┌──────▼───────┐                    │
     │                     │ Vehicles-SVC │                    │
     │                     │ gRPC:50055   │                    │
     │                     │ (HPA 2-5)    │                    │
     │                     └──────┬───────┘                    │
     │                            │                            │
     │                     ┌──────▼───────┐                    │
     │                     │  Routes-SRV  │                    │
     │                     │ gRPC:50056   │                    │
     │                     │ (HPA 2-5)    │                    │
     │                     └──────┬───────┘                    │
     │                            │                            │
     └─────────────┬──────────────┴───────────┬────────────────┘
                   │                          │
          ┌────────▼────────┐        ┌───────▼────────┐
          │  Email Service  │        │ Logger Service │
          │  gRPC:50053     │        │ gRPC:50058     │
          │  (2 réplicas)   │        │ HTTP:3200      │
          └────────┬────────┘        └───────┬────────┘
                   │                         │
          ┌────────▼─────────────────────────▼────────┐
          │         RabbitMQ Cluster                  │
          │      (StatefulSet - 3 réplicas)           │
          │    Port 5672 (AMQP) + 15672 (Mgmt)        │
          │    Azure Disk Persistent Storage          │
          └────────────────┬──────────────────────────┘
                           │
          ┌────────────────▼──────────────────────────┐
          │      Elasticsearch Cluster                │
          │   (StatefulSet - 3 master + 2 data nodes) │
          │         Port 9200 (HTTP)                  │
          │    Azure Disk Persistent Storage          │
          └───────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════

          ┌───────────────────────────────────────────┐
          │  Azure Database for PostgreSQL            │
          │      Flexible Server                      │
          │  ─────────────────────────────────────    │
          │  • auth_db                                │
          │  • driver_db                              │
          │  • users_db                               │
          │  • vehicles_db                            │
          │  • vehicles_shadow_db                     │
          │  • routes_db                              │
          │  ─────────────────────────────────────    │
          │  SSL/TLS Required                         │
          │  Private Endpoint (VNet Integration)      │
          └───────────────────────────────────────────┘
```

---

## 💰 Estimación de Costos (Azure)

### Recursos Mínimos (Desarrollo/Testing)

| Recurso | SKU | Costo Mensual (USD) |
|---------|-----|---------------------|
| AKS Cluster (3 nodos) | Standard_D2s_v3 | ~$150 |
| PostgreSQL Flexible Server | Standard_D2ads_v5 | ~$150 |
| ~~Azure Container Registry~~ | ~~Standard~~ | ~~$20~~ **→ $0 (GHCR)** |
| Azure Load Balancer | Standard | ~$18 |
| Storage (Disks) | Premium SSD 256GB | ~$40 |
| Bandwidth | 100GB/mes | ~$10 |
| **TOTAL ESTIMADO** | | **~$368/mes** |

### Recursos Producción (Configuración Actual)

| Recurso | SKU | Costo Mensual (USD) |
|---------|-----|---------------------|
| AKS Cluster (5 nodos) | Standard_D4s_v3 | ~$400 |
| PostgreSQL Primary Server | Standard_D4ads_v5 HA | ~$323 |
| PostgreSQL Read Replica | Standard_D4ads_v5 | ~$315 |
| ~~Azure Container Registry~~ | ~~Premium~~ | ~~$200~~ **→ $0 (GHCR)** |
| Azure Load Balancer | Standard | ~$18 |
| Storage (Disks) | Premium SSD 512GB | ~$80 |
| Bandwidth | 500GB/mes | ~$45 |
| **TOTAL ESTIMADO** | | **~$1,181/mes** |

> **⚠️ NOTA**: Los costos son aproximados y pueden variar según región y uso real.
> **✅ CONFIGURACIÓN ACTUAL**: 
> - PostgreSQL con GeneralPurpose tier (Standard_D4ads_v5) + Read Replica = ~$638/mes
> - **Sin ACR (usando GHCR público)** = **Ahorro de $20-200/mes** ($240-2,400/año)

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener:

- ✅ **Cuenta de Azure** con créditos o suscripción activa
- ✅ **Permisos de Owner/Contributor** en la suscripción
- ✅ **Git** instalado y repositorio del proyecto
- ✅ **Docker Desktop** instalado (para builds locales)
- ✅ **PowerShell** o **Bash** según tu OS
- ✅ **Conexión a internet estable**
- ✅ **Dominio propio** (opcional pero recomendado para producción)
- ✅ **Azure CLI** instalado

---

## 📝 Convenciones de Nomenclatura

Durante toda la guía, usaremos estas convenciones:

```bash
RESOURCE_GROUP="fuel-system-rg"
LOCATION="northcentralus"
AKS_NAME="fuel-system-aks"
POSTGRES_SERVER="fuel-system-postgres"
POSTGRES_VERSION="17"
POSTGRES_SKU="Standard_D4ads_v5"
POSTGRES_TIER="GeneralPurpose"
POSTGRES_PASSWORD="FuelSystem2024@Secure"
NAMESPACE="fuel-system"
```

Puedes cambiar estos nombres según tus preferencias.

---

## 🚨 Notas Importantes

1. **Costos**: Todos los recursos de Azure tienen costo. Monitorea tu gasto en el portal.
2. **Regiones**: Usa la misma región para todos los recursos para reducir latencia y costos.
3. **Backups**: Azure PostgreSQL hace backups automáticos, pero configura tu propia estrategia.
4. **Seguridad**: Cambia TODAS las contraseñas por defecto en producción.
5. **Monitoreo**: Configura alertas desde el principio para detectar problemas.

---

## 📞 Soporte y Troubleshooting

Si encuentras problemas durante el despliegue:

1. Revisa los logs de los pods: `kubectl logs <pod-name> -n fuel-system`
2. Verifica eventos: `kubectl get events -n fuel-system --sort-by='.lastTimestamp'`
3. Consulta la documentación de Azure: https://docs.microsoft.com/azure/
4. Revisa los archivos de troubleshooting en cada fase

---

## 🎓 Recomendaciones

### Para Desarrollo/Testing:
- Usa SKUs más pequeños (D2s_v3)
- Deshabilita Alta Disponibilidad en PostgreSQL
- Usa 2-3 nodos en AKS
- No configures Application Gateway (usa solo Ingress)

### Para Producción:
- Usa SKUs más grandes (D4s_v3 o superior)
- Habilita Alta Disponibilidad en PostgreSQL
- Usa 4-5 nodos en AKS con autoescalado
- Configura Application Gateway + WAF
- Implementa Azure Monitor + Application Insights
- Configura Azure Key Vault para secrets

---

## 🚀 ¡Empecemos!

Una vez que hayas revisado este índice, comienza con:

👉 **[Fase 1: Setup Base](./01-AZURE-SETUP-BASE.md)**

---

**¡Éxito en tu despliegue! 🎉**
