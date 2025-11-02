# ==============================================
# Makefile - Fuel System (Desarrollo Local)
# ==============================================
# Para producción, usa GitHub Actions (ver deploy/GITHUB_ACTIONS_DEPLOY.md)

.PHONY: help

# Variables
NAMESPACE ?= fuel-system
RESOURCE_GROUP ?= fuel-system-rg
AKS_CLUSTER ?= fuel-system-aks

# Colores
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m

# ==============================================
# Help
# ==============================================
help: ## Mostrar este mensaje de ayuda
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Fuel System - Makefile (Desarrollo Local)$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)Para despliegue en Azure, usa GitHub Actions:$(NC)"
	@echo "  - Push a 'main' o 'develop' → Build automático"
	@echo "  - Merge a 'main' → Deploy automático a AKS"
	@echo "  - Ver: deploy/GITHUB_ACTIONS_DEPLOY.md"
	@echo ""
	@echo "$(GREEN)Comandos disponibles:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ==============================================
# Desarrollo Local (Docker Compose)
# ==============================================
dev-build: ## Construir imágenes localmente
	@echo "$(GREEN)🔨 Construyendo imágenes Docker...$(NC)"
	docker-compose build

dev-up: ## Levantar todos los servicios
	@echo "$(GREEN)🚀 Levantando servicios...$(NC)"
	docker-compose up -d
	@echo ""
	@echo "$(GREEN)✅ Servicios iniciados$(NC)"
	@echo "$(BLUE)API Gateway:$(NC) http://localhost:8080"
	@echo "$(BLUE)Eureka:$(NC) http://localhost:8761"
	@echo "$(BLUE)RabbitMQ:$(NC) http://localhost:15672 (guest/guest)"
	@echo "$(BLUE)Kibana:$(NC) http://localhost:5601"
	@echo "$(BLUE)PgAdmin:$(NC) http://localhost:8081 (admin@example.com/admin123)"

dev-down: ## Detener servicios
	@echo "$(YELLOW)🛑 Deteniendo servicios...$(NC)"
	docker-compose down

dev-restart: dev-down dev-up ## Reiniciar servicios

dev-logs: ## Ver logs de todos los servicios
	docker-compose logs -f

dev-logs-service: ## Ver logs de un servicio (uso: make dev-logs-service SERVICE=api-gateway)
	docker-compose logs -f $(SERVICE)

dev-ps: ## Ver estado de los servicios
	docker-compose ps

dev-clean: ## Limpiar todo (contenedores, volúmenes, imágenes)
	@echo "$(YELLOW)🧹 Limpiando Docker...$(NC)"
	docker-compose down -v
	docker system prune -af --volumes

# ==============================================
# Testing Local
# ==============================================
test-health: ## Probar health endpoint
	@echo "$(BLUE)🧪 Testing API Gateway health...$(NC)"
	@curl -f http://localhost:8080/health && echo "" && echo "$(GREEN)✅ API Gateway OK$(NC)" || echo "$(YELLOW)❌ API Gateway no responde$(NC)"

test-api: ## Probar endpoints básicos
	@echo "$(BLUE)🧪 Testing API endpoints...$(NC)"
	@echo "Health:"
	@curl -s http://localhost:8080/health | jq .
	@echo ""
	@echo "Eureka:"
	@curl -s http://localhost:8761/actuator/health | jq .

# ==============================================
# Utilidades Kubernetes (para verificación)
# ==============================================
k8s-config: ## Configurar kubectl para AKS
	@echo "$(GREEN)⚙️  Configurando kubectl...$(NC)"
	az aks get-credentials --resource-group $(RESOURCE_GROUP) --name $(AKS_CLUSTER) --overwrite-existing

k8s-pods: ## Ver pods en AKS
	kubectl get pods -n $(NAMESPACE)

k8s-services: ## Ver servicios en AKS
	kubectl get services -n $(NAMESPACE)

k8s-logs: ## Ver logs de un pod (uso: make k8s-logs POD=api-gateway-xxx)
	kubectl logs -f $(POD) -n $(NAMESPACE)

k8s-status: ## Ver estado completo del cluster
	@echo "$(BLUE)📊 Estado del cluster:$(NC)"
	@kubectl get all -n $(NAMESPACE)
	@echo ""
	@echo "$(BLUE)🔄 HPAs (Autoscaling):$(NC)"
	@kubectl get hpa -n $(NAMESPACE)

k8s-gateway-ip: ## Obtener IP del API Gateway
	@echo "$(BLUE)🌐 IP del API Gateway:$(NC)"
	@kubectl get service fuel-system-api-gateway -n $(NAMESPACE) -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
	@echo ""

# ==============================================
# Información
# ==============================================
info: ## Mostrar información del sistema
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Fuel System - Información$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)🏠 Desarrollo Local:$(NC)"
	@echo "  - API Gateway: http://localhost:8080"
	@echo "  - Eureka: http://localhost:8761"
	@echo "  - RabbitMQ: http://localhost:15672"
	@echo "  - Kibana: http://localhost:5601"
	@echo "  - PgAdmin: http://localhost:8081"
	@echo ""
	@echo "$(YELLOW)☁️  Producción (Azure):$(NC)"
	@echo "  - Resource Group: $(RESOURCE_GROUP)"
	@echo "  - AKS Cluster: $(AKS_CLUSTER)"
	@echo "  - Namespace: $(NAMESPACE)"
	@echo ""
	@echo "$(YELLOW)📚 Documentación:$(NC)"
	@echo "  - GitHub Actions: deploy/GITHUB_ACTIONS_DEPLOY.md"
	@echo "  - Arquitectura: deploy/ARCHITECTURE.md"
	@echo "  - Migraciones: deploy/MIGRATIONS_GUIDE.md"
	@echo ""
	@echo "$(YELLOW)🚀 Para desplegar a Azure:$(NC)"
	@echo "  1. Configura GitHub Secrets (ver GITHUB_ACTIONS_DEPLOY.md)"
	@echo "  2. Push a 'main' → Deploy automático"
	@echo "  3. O usa: Actions → Deploy to AKS → Run workflow"
	@echo ""
