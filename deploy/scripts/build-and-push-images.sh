#!/bin/bash

# ==============================================
# Build and Push Docker Images to ACR
# ==============================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar variables de entorno
if [ -z "$ACR_LOGIN_SERVER" ]; then
    echo -e "${YELLOW}ACR_LOGIN_SERVER no configurado. Usando valor por defecto.${NC}"
    ACR_LOGIN_SERVER="fuelsystemacr.azurecr.io"
fi

IMAGE_TAG="${IMAGE_TAG:-latest}"
COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Building and Pushing Docker Images${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Registry: $ACR_LOGIN_SERVER"
echo "Tag: $IMAGE_TAG"
echo "Commit: $COMMIT_SHA"
echo ""

# Array de servicios
SERVICES=(
    "api-gateway"
    "auth-svc"
    "driver-ms"
    "users-srv"
    "vehicles-svc"
    "email-svc"
    "hello-svc"
    "logger-svc"
    "publisher-rabbit-srv"
)

# Función para construir y subir una imagen
build_and_push() {
    local service=$1
    local service_dir="./services/$service"
    
    if [ ! -d "$service_dir" ]; then
        echo -e "${YELLOW}⚠️  Directorio no encontrado: $service_dir${NC}"
        return 1
    fi
    
    echo -e "${GREEN}🔨 Construyendo: $service${NC}"
    
    docker build \
        -t "$ACR_LOGIN_SERVER/fuel-system/$service:$IMAGE_TAG" \
        -t "$ACR_LOGIN_SERVER/fuel-system/$service:$COMMIT_SHA" \
        "$service_dir"
    
    echo -e "${GREEN}📤 Subiendo: $service${NC}"
    
    docker push "$ACR_LOGIN_SERVER/fuel-system/$service:$IMAGE_TAG"
    docker push "$ACR_LOGIN_SERVER/fuel-system/$service:$COMMIT_SHA"
    
    echo -e "${GREEN}✅ Completado: $service${NC}"
    echo ""
}

# Login en ACR
echo -e "${GREEN}🔐 Iniciando sesión en ACR...${NC}"
az acr login --name "${ACR_LOGIN_SERVER%%.*}" || {
    echo -e "${YELLOW}⚠️  No se pudo hacer login con az acr. Intentando con docker login...${NC}"
    if [ -n "$ACR_USERNAME" ] && [ -n "$ACR_PASSWORD" ]; then
        echo "$ACR_PASSWORD" | docker login "$ACR_LOGIN_SERVER" -u "$ACR_USERNAME" --password-stdin
    else
        echo "Error: No se pudo autenticar en ACR"
        exit 1
    fi
}

# Construir y subir todas las imágenes
for service in "${SERVICES[@]}"; do
    build_and_push "$service"
done

echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}✅ Todas las imágenes fueron construidas y subidas exitosamente!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Imágenes disponibles:"
for service in "${SERVICES[@]}"; do
    echo "  - $ACR_LOGIN_SERVER/fuel-system/$service:$IMAGE_TAG"
done
echo ""
echo -e "${YELLOW}Próximo paso: make helm-install${NC}"
echo ""

