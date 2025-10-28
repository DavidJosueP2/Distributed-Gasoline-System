# ============================================
# Fuel System - Makefile
# ============================================

.PHONY: help build up down logs clean test migrate-up migrate-down helm-install helm-uninstall azure-setup

# Variables
COMPOSE_FILE := docker-compose.yml
HELM_CHART := deploy/helm/fuel-system
NAMESPACE := fuel-system

# Colores para output
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RESET  := $(shell tput -Txterm sgr0)

##@ General

help: ## Mostrar esta ayuda
	@echo ''
	@echo 'Uso:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  ${YELLOW}%-20s${RESET} %s\n", $$1, $$2 } /^##@/ { printf "\n${GREEN}%s${RESET}\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Desarrollo Local (Docker Compose)

build: ## Construir todas las imágenes Docker
	docker-compose -f $(COMPOSE_FILE) build

up: ## Iniciar todos los servicios
	docker-compose -f $(COMPOSE_FILE) up -d

down: ## Detener todos los servicios
	docker-compose -f $(COMPOSE_FILE) down

restart: down up ## Reiniciar todos los servicios

logs: ## Ver logs de todos los servicios
	docker-compose -f $(COMPOSE_FILE) logs -f

logs-%: ## Ver logs de un servicio específico (ej: make logs-api-gateway)
	docker-compose -f $(COMPOSE_FILE) logs -f $*

ps: ## Ver estado de los servicios
	docker-compose -f $(COMPOSE_FILE) ps

clean: ## Limpiar contenedores, volúmenes e imágenes
	docker-compose -f $(COMPOSE_FILE) down -v --rmi all

clean-volumes: ## Limpiar solo los volúmenes
	docker-compose -f $(COMPOSE_FILE) down -v

##@ Base de Datos

migrate-up: ## Ejecutar migraciones de base de datos
	@echo "$(GREEN)Ejecutando migraciones...$(RESET)"
	docker-compose exec users-srv npx prisma migrate deploy
	docker-compose exec vehicles-svc npx prisma migrate deploy
	docker-compose exec driver-ms npm run typeorm:migrate

migrate-down: ## Revertir migraciones de base de datos
	@echo "$(GREEN)Revirtiendo migraciones...$(RESET)"
	docker-compose exec driver-ms npm run typeorm:revert

prisma-studio: ## Abrir Prisma Studio para users-srv
	docker-compose exec users-srv npx prisma studio

prisma-generate: ## Generar Prisma Client
	docker-compose exec users-srv npx prisma generate
	docker-compose exec vehicles-svc npx prisma generate

##@ Testing

test: ## Ejecutar tests de todos los servicios
	@echo "$(GREEN)Ejecutando tests...$(RESET)"
	cd services/api-gateway && npm test
	cd services/auth-svc && npm test
	cd services/driver-ms && npm test
	cd services/users-srv && npm test
	cd services/vehicles-svc && npm test

test-%: ## Ejecutar tests de un servicio específico (ej: make test-api-gateway)
	cd services/$* && npm test

lint: ## Ejecutar linter en todos los servicios
	@echo "$(GREEN)Ejecutando linter...$(RESET)"
	cd services/api-gateway && npm run lint
	cd services/auth-svc && npm run lint
	cd services/driver-ms && npm run lint

##@ Kubernetes / Helm

k8s-context: ## Ver contexto actual de Kubernetes
	kubectl config current-context

k8s-switch-local: ## Cambiar a contexto local (Docker Desktop)
	kubectl config use-context docker-desktop

k8s-switch-azure: ## Cambiar a contexto de Azure
	kubectl config use-context fuel-system-aks

helm-install: ## Instalar/Actualizar con Helm
	helm upgrade --install fuel-system $(HELM_CHART) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--values $(HELM_CHART)/values.yaml \
		--timeout 10m \
		--wait

helm-uninstall: ## Desinstalar Helm release
	helm uninstall fuel-system --namespace $(NAMESPACE)

helm-template: ## Ver templates de Helm sin instalar
	helm template fuel-system $(HELM_CHART) \
		--namespace $(NAMESPACE) \
		--values $(HELM_CHART)/values.yaml

helm-lint: ## Validar chart de Helm
	helm lint $(HELM_CHART)

k8s-pods: ## Ver pods en Kubernetes
	kubectl get pods -n $(NAMESPACE)

k8s-services: ## Ver servicios en Kubernetes
	kubectl get services -n $(NAMESPACE)

k8s-logs-%: ## Ver logs de un deployment (ej: make k8s-logs-api-gateway)
	kubectl logs -f deployment/fuel-system-$* -n $(NAMESPACE)

k8s-describe-%: ## Describir un deployment (ej: make k8s-describe-api-gateway)
	kubectl describe deployment fuel-system-$* -n $(NAMESPACE)

k8s-shell-%: ## Abrir shell en un pod (ej: make k8s-shell-api-gateway)
	kubectl exec -it deployment/fuel-system-$* -n $(NAMESPACE) -- sh

k8s-port-forward-%: ## Port forward a un servicio (ej: make k8s-port-forward-api-gateway)
	kubectl port-forward service/fuel-system-$* 8080:8080 -n $(NAMESPACE)

##@ Azure

azure-login: ## Login en Azure
	az login

azure-setup: ## Configurar recursos de Azure
	./deploy/scripts/setup-azure.sh

azure-acr-login: ## Login en Azure Container Registry
	az acr login --name $${ACR_NAME}

azure-build-push: ## Construir y subir imágenes a ACR
	@echo "$(GREEN)Construyendo y subiendo imágenes a ACR...$(RESET)"
	./deploy/scripts/build-and-push-images.sh

azure-get-credentials: ## Obtener credenciales de AKS
	az aks get-credentials \
		--resource-group $${AKS_RESOURCE_GROUP} \
		--name $${AKS_CLUSTER_NAME} \
		--overwrite-existing

##@ Docker Registry

docker-login-acr: ## Login en ACR con Docker
	docker login $${ACR_LOGIN_SERVER} -u $${ACR_USERNAME} -p $${ACR_PASSWORD}

docker-build-all: ## Construir todas las imágenes para producción
	@echo "$(GREEN)Construyendo imágenes...$(RESET)"
	docker build -t fuel-system/api-gateway:latest ./services/api-gateway
	docker build -t fuel-system/auth-svc:latest ./services/auth-svc
	docker build -t fuel-system/driver-ms:latest ./services/driver-ms
	docker build -t fuel-system/users-srv:latest ./services/users-srv
	docker build -t fuel-system/vehicles-svc:latest ./services/vehicles-svc
	docker build -t fuel-system/email-svc:latest ./services/email-svc
	docker build -t fuel-system/hello-svc:latest ./services/hello-svc
	docker build -t fuel-system/logger-svc:latest ./services/logger-svc
	docker build -t fuel-system/publisher-rabbit-srv:latest ./services/publisher-rabbit-srv

##@ Utilidades

check-env: ## Verificar variables de entorno
	@echo "$(GREEN)Verificando variables de entorno...$(RESET)"
	@test -n "$$POSTGRES_PASSWORD" && echo "✓ POSTGRES_PASSWORD configurado" || echo "✗ POSTGRES_PASSWORD no configurado"
	@test -n "$$JWT_SECRET" && echo "✓ JWT_SECRET configurado" || echo "✗ JWT_SECRET no configurado"
	@test -n "$$ACR_LOGIN_SERVER" && echo "✓ ACR_LOGIN_SERVER configurado" || echo "✗ ACR_LOGIN_SERVER no configurado"

health-check: ## Verificar salud de los servicios
	@echo "$(GREEN)Verificando salud de los servicios...$(RESET)"
	@curl -f http://localhost:8080/health || echo "API Gateway no responde"
	@curl -f http://localhost:8761 || echo "Eureka no responde"
	@curl -f http://localhost:15672 || echo "RabbitMQ Management no responde"

install-deps: ## Instalar dependencias de todos los servicios
	@echo "$(GREEN)Instalando dependencias...$(RESET)"
	cd services/api-gateway && npm install
	cd services/auth-svc && npm install
	cd services/driver-ms && npm install
	cd services/users-srv && npm install
	cd services/vehicles-svc && npm install
	cd services/email-svc && npm install
	cd services/hello-svc && npm install
	cd services/logger-svc && npm install
	cd services/publisher-rabbit-srv && npm install

dev-setup: install-deps ## Setup inicial para desarrollo
	@echo "$(GREEN)Setup de desarrollo completado$(RESET)"
	@echo "Ejecuta 'make up' para iniciar los servicios"

##@ Documentación

docs-serve: ## Servir documentación localmente
	@echo "$(GREEN)La documentación está en:$(RESET)"
	@echo "  - README.md"
	@echo "  - DEPLOYMENT.md"
	@echo "  - deploy/AZURE_SETUP.md"

version: ## Mostrar versiones de herramientas
	@echo "$(GREEN)Versiones:$(RESET)"
	@echo "Docker:      $$(docker --version)"
	@echo "Docker Compose: $$(docker-compose --version)"
	@echo "Kubectl:     $$(kubectl version --client --short 2>/dev/null || echo 'No instalado')"
	@echo "Helm:        $$(helm version --short 2>/dev/null || echo 'No instalado')"
	@echo "Azure CLI:   $$(az --version | head -n 1 || echo 'No instalado')"
	@echo "Node.js:     $$(node --version 2>/dev/null || echo 'No instalado')"

