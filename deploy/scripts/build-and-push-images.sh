#!/bin/bash

# ==============================================
# Build and Push Docker Images to ACR
# ==============================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar variables de entorno
if [ -z "$ACR_LOGIN_SERVER" ]; then
    echo -e "${YELLOW}ACR_LOGIN_SERVER no configurado. Usando valor por defecto.${NC}"
    ACR_LOGIN_SERVER="fuelsystemacr.azurecr.io"
fi

IMAGE_TAG="${IMAGE_TAG:-latest}"
COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')}"

# Ir a la raíz del proyecto
cd "$(dirname "$0")/../.."

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Building and Pushing Docker Images${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Registry: $ACR_LOGIN_SERVER"
echo "Tag: $IMAGE_TAG"
echo "Commit: $COMMIT_SHA"
echo "Build Context: $(pwd)"
echo ""

# Array de servicios (nombre -> dockerfile path)
declare -A SERVICES=(
    ["api-gateway"]="./services/api-gateway/Dockerfile"
    ["auth-svc"]="./services/auth-svc/Dockerfile"
    ["driver-ms"]="./services/driver-ms/Dockerfile"
    ["users-srv"]="./services/users-srv/Dockerfile"
    ["vehicles-svc"]="./services/vehicles-svc/Dockerfile"
    ["email-svc"]="./services/email-svc/Dockerfile"
    ["hello-svc"]="./services/hello-svc/Dockerfile"
    ["logger-svc"]="./services/logger-svc/Dockerfile"
    ["publisher-rabbit-srv"]="./services/publisher-rabbit-srv/Dockerfile"
)

# Función para construir y subir una imagen
build_and_push() {
    local service=$1
    local dockerfile=$2

    if [ ! -f "$dockerfile" ]; then
        echo -e "${RED}⚠️  Dockerfile no encontrado: $dockerfile${NC}"
        return 1
    fi
    
    echo -e "${GREEN}🔨 Construyendo: $service${NC}"
    echo "   Dockerfile: $dockerfile"
    echo "   Context: . (raíz del proyecto)"

    # Build desde la raíz del proyecto (como en docker-compose)
    docker build \
        -f "$dockerfile" \
        -t "$ACR_LOGIN_SERVER/fuel-system/$service:$IMAGE_TAG" \
        -t "$ACR_LOGIN_SERVER/fuel-system/$service:$COMMIT_SHA" \
        --build-arg DATABASE_URL="postgresql://temp:temp@localhost:5432/temp?schema=public" \
        --build-arg SHADOW_DATABASE_URL="postgresql://temp:temp@localhost:5432/temp_shadow?schema=public" \
        --build-arg USERS_DATABASE_URL="postgresql://temp:temp@localhost:5432/temp?schema=public" \
        . || {
            echo -e "${RED}❌ Error construyendo: $service${NC}"
            return 1
        }

    echo -e "${GREEN}📤 Subiendo: $service${NC}"
    
    docker push "$ACR_LOGIN_SERVER/fuel-system/$service:$IMAGE_TAG" || {
        echo -e "${RED}❌ Error subiendo: $service${NC}"
        return 1
    }
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
        echo -e "${RED}Error: No se pudo autenticar en ACR${NC}"
        exit 1
    fi
}
echo ""

# Construir y subir todas las imágenes
FAILED_SERVICES=()
for service in "${!SERVICES[@]}"; do
    if ! build_and_push "$service" "${SERVICES[$service]}"; then
        FAILED_SERVICES+=("$service")
    fi
done

echo -e "${BLUE}============================================${NC}"
if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Todas las imágenes fueron construidas y subidas exitosamente!${NC}"
else
    echo -e "${RED}⚠️  Algunos servicios fallaron:${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
        echo -e "  ${RED}- $service${NC}"
    done
fi
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Imágenes disponibles en ACR:"
for service in "${!SERVICES[@]}"; do
    echo "  - $ACR_LOGIN_SERVER/fuel-system/$service:$IMAGE_TAG"
done
echo ""
echo -e "${YELLOW}Próximo paso: Configurar variables de entorno y ejecutar helm install${NC}"
echo ""
