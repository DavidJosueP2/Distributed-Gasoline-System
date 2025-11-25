# Fase 4: RabbitMQ y Elasticsearch en AKS

> **Tiempo estimado**: 40 minutos  
> **Prerequisitos**: Fase 1, 2 y 3 completadas

---

## Objetivos de esta Fase

Al finalizar esta fase, tendrás:

- RabbitMQ Cluster desplegado con persistencia
- Elasticsearch Cluster operacional
- Kibana para visualización de logs (opcional)
- Configuración de storage classes
- Connection strings configurados para microservicios

---

## 1. Verificar Storage Classes Disponibles

```bash
# Ver storage classes disponibles en AKS
kubectl get storageclass

# Output esperado:
# NAME                    PROVISIONER          RECLAIMPOLICY   VOLUMEBINDINGMODE
# azurefile              file.csi.azure.com   Delete          Immediate
# azurefile-csi          file.csi.azure.com   Delete          Immediate
# azurefile-csi-premium  file.csi.azure.com   Delete          Immediate
# azurefile-premium      file.csi.azure.com   Delete          Immediate
# default (default)      disk.csi.azure.com   Delete          WaitForFirstConsumer
# managed                disk.csi.azure.com   Delete          WaitForFirstConsumer
# managed-csi            disk.csi.azure.com   Delete          WaitForFirstConsumer
# managed-csi-premium    disk.csi.azure.com   Delete          WaitForFirstConsumer
# managed-premium        disk.csi.azure.com   Delete          WaitForFirstConsumer
```

**Storage class recomendado**: `managed-csi` (Standard SSD)

---

## 2. Configuración de RabbitMQ

### Agregar Helm Repository

```bash
# Agregar repositorio Bitnami
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Ver versiones disponibles
helm search repo bitnami/rabbitmq --versions | head -10
```

### Archivo de Valores para Desarrollo

Los archivos de configuración se encuentran en: `./helm-values/rabbitmq-values-dev.yaml`

### Archivo de Valores para Producción

Los archivos de configuración se encuentran en: `./helm-values/rabbitmq-values-prod.yaml`

### Instalar RabbitMQ

```bash
# Para ambiente de desarrollo
helm install rabbitmq bitnami/rabbitmq \
  --namespace fuel-system \
  --values ./helm-values/rabbitmq-values-dev.yaml \
  --wait \
  --timeout 10m \
  --debug

# Para ambiente de producción
helm install rabbitmq bitnami/rabbitmq \
  --namespace fuel-system \
  --values ./helm-values/rabbitmq-values-prod.yaml \
  --wait \
  --timeout 10m \
  --debug

# Verificar instalación
kubectl get pods -n fuel-system -l app.kubernetes.io/name=rabbitmq

# Ver StatefulSet
kubectl get statefulset rabbitmq -n fuel-system

# Ver PersistentVolumeClaims
kubectl get pvc -n fuel-system
```

### Verificar Cluster de RabbitMQ (solo Producción)

```bash
# Obtener password
RABBITMQ_PASSWORD=$(kubectl get secret --namespace fuel-system rabbitmq -o jsonpath="{.data.rabbitmq-password}" | base64 --decode)

# Acceder a pod
kubectl exec -it rabbitmq-0 -n fuel-system -- bash

# Verificar cluster status
rabbitmqctl cluster_status

# Salir
exit
```

### Acceso a Management UI

```bash
# Port-forward para acceso local
kubectl port-forward svc/rabbitmq -n fuel-system 15672:15672

# Acceder en navegador: http://localhost:15672
# Usuario: admin
# Password: configurado en values file
```

---

## 3. Configuración de Elasticsearch

### Agregar Helm Repository

```bash
# Agregar repositorio Elastic
helm repo add elastic https://helm.elastic.co
helm repo update

# Ver versiones disponibles
helm search repo elastic/elasticsearch --versions | head -10
```

### Archivo de Valores para Desarrollo

Los archivos de configuración se encuentran en: `./helm-values/elasticsearch-values-dev.yaml`

### Archivo de Valores para Producción

Los archivos de configuración se encuentran en: `./helm-values/elasticsearch-values-prod.yaml`

### Instalar Elasticsearch

```bash
# Para ambiente de desarrollo
helm install elasticsearch elastic/elasticsearch \
  --namespace fuel-system \
  --version 7.17.3 \
  --values ./helm-values/elasticsearch-values-dev.yaml \
  --wait \
  --timeout 15m \
  --debug

# Para ambiente de producción
helm install elasticsearch elastic/elasticsearch \
  --namespace fuel-system \
  --version 7.17.3 \
  --values ./helm-values/elasticsearch-values-prod.yaml \
  --wait \
  --timeout 15m \
  --debug

# Eventos en vivo
kubectl get events -n fuel-system \
  --field-selector involvedObject.name=elasticsearch-master-0 \
  --watch

# Verificar instalación
kubectl get pods -n fuel-system -l app=elasticsearch-master

# Ver StatefulSet
kubectl get statefulset elasticsearch-master -n fuel-system

# Ver PVCs
kubectl get pvc -n fuel-system -l app=elasticsearch-master
```

### Verificar Funcionamiento de Elasticsearch

```bash
# Port-forward
kubectl port-forward svc/elasticsearch-master -n fuel-system 9200:9200

# En otra terminal, probar conexión
curl http://localhost:9200

# Ver salud del cluster
curl http://localhost:9200/_cluster/health?pretty

# Output esperado:
# {
#   "cluster_name" : "elasticsearch",
#   "status" : "green",
#   "number_of_nodes" : 3,
#   ...
# }
```

---

## 4. Configuración de Kibana (Opcional)

### Archivo de Valores para Desarrollo

Los archivos de configuración se encuentran en: `./helm-values/kibana-values-dev.yaml`

### Archivo de Valores para Producción

Los archivos de configuración se encuentran en: `./helm-values/kibana-values-prod.yaml`

### Instalar Kibana

```bash
# Para ambiente de desarrollo
helm upgrade --install kibana elastic/kibana \
  --namespace fuel-system \
  --version 7.17.3 \
  --values ./helm-values/kibana-values-dev.yaml \
  --wait \
  --timeout 10m \
  --debug

# Para ambiente de producción
helm upgrade --install kibana elastic/kibana \
  --namespace fuel-system \
  --version 7.17.3 \
  --values ./helm-values/kibana-values-prod.yaml \
  --wait \
  --timeout 10m \
  --debug

# Verificar instalación
kubectl get pods -n fuel-system -l app=kibana

# Ver servicio
kubectl get svc -n fuel-system | grep kibana
```

### Acceder a Kibana

```bash
# Port-forward para acceso local
kubectl port-forward svc/kibana-kibana -n fuel-system 5601:5601

# Acceder en navegador: http://localhost:5601
```

---

## 5. Verificación de Conectividad

```bash
# Verificar servicios
kubectl get svc -n fuel-system

# Probar conectividad desde un pod temporal
kubectl run test-curl --image=curlimages/curl -i --tty --rm -n fuel-system -- sh

# Dentro del pod, probar Elasticsearch
curl http://elasticsearch-master:9200

# Probar RabbitMQ
curl http://rabbitmq:15672
```

---

## 6. Connection Strings para Microservicios

### RabbitMQ

```yaml
RABBITMQ_HOST: rabbitmq.fuel-system.svc.cluster.local
RABBITMQ_PORT: "5672"
RABBITMQ_MANAGEMENT_PORT: "15672"
RABBITMQ_USER: admin
RABBITMQ_PASSWORD: <obtener-del-secret>
```

### Elasticsearch

```yaml
ELASTICSEARCH_URL: http://elasticsearch-master.fuel-system.svc.cluster.local:9200
ELASTICSEARCH_HOST: elasticsearch-master.fuel-system.svc.cluster.local
ELASTICSEARCH_PORT: "9200"
```

---

## 7. Actualizar Configuración

```bash
# Actualizar RabbitMQ
helm upgrade rabbitmq bitnami/rabbitmq \
  --namespace fuel-system \
  --values ./helm-values/rabbitmq-values-dev.yaml \
  --wait \
  --debug

# Actualizar Elasticsearch
helm upgrade elasticsearch elastic/elasticsearch \
  --namespace fuel-system \
  --version 7.17.3 \
  --values ./helm-values/elasticsearch-values-dev.yaml \
  --wait \
  --debug

# Actualizar Kibana
helm upgrade kibana elastic/kibana \
  --namespace fuel-system \
  --version 7.17.3 \
  --values ./helm-values/kibana-values-dev.yaml \
  --wait \
  --debug
```

---

## 8. Desinstalar

```bash
# Desinstalar Kibana
helm uninstall kibana -n fuel-system

# Desinstalar RabbitMQ
helm uninstall rabbitmq -n fuel-system

# Desinstalar Elasticsearch
helm uninstall elasticsearch -n fuel-system

# Eliminar PVCs (CUIDADO: esto borra los datos)
kubectl delete pvc -n fuel-system -l app.kubernetes.io/name=rabbitmq
kubectl delete pvc -n fuel-system -l app=elasticsearch-master
```

---

## 9. Troubleshooting

### Elasticsearch Unhealthy

```bash
# Ver logs
kubectl logs elasticsearch-master-0 -n fuel-system

# Describir pod
kubectl describe pod elasticsearch-master-0 -n fuel-system

# Verificar configuración
kubectl exec -it elasticsearch-master-0 -n fuel-system -- cat /usr/share/elasticsearch/config/elasticsearch.yml
```

### RabbitMQ Pod Pending

```bash
# Ver eventos
kubectl describe pod rabbitmq-0 -n fuel-system

# Verificar PVCs
kubectl get pvc -n fuel-system
```

### Kibana no conecta a Elasticsearch

```bash
# Ver logs de Kibana
kubectl logs -f -l app=kibana -n fuel-system

# Verificar conectividad
kubectl exec -it $(kubectl get pod -l app=kibana -o jsonpath="{.items[0].metadata.name}" -n fuel-system) -n fuel-system -- curl http://elasticsearch-master:9200
```

---

## 10. Verificación Final

```bash
# Verificar todos los componentes
kubectl get all -n fuel-system

# Verificar health de pods
kubectl get pods -n fuel-system -o wide

# Output esperado (Desarrollo):
# rabbitmq-0                 1/1     Running
# elasticsearch-master-0     1/1     Running
# kibana-xxx                 1/1     Running

# Output esperado (Producción):
# rabbitmq-0,1,2             1/1     Running
# elasticsearch-master-0,1,2 1/1     Running
# kibana-xxx,yyy             1/1     Running
```

---

## Siguiente Fase

Continuar con [Fase 5: Build y Push de Imágenes Docker](./05-AZURE-BUILD-IMAGES.md)
