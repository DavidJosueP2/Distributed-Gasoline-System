#!/bin/bash

echo "🔧 Regenerando archivos gRPC desde driver_ms.proto..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. API Gateway
echo -e "${BLUE}📦 Regenerando gRPC para API Gateway...${NC}"
cd services/api-gateway

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  No se encontró package.json en api-gateway${NC}"
    cd ../..
else
    # Verificar si existe el script de generación
    if npm run | grep -q "proto:generate"; then
        npm run proto:generate
    else
        echo -e "${YELLOW}⚠️  No existe script proto:generate en api-gateway${NC}"
        echo "Puedes ejecutar manualmente:"
        echo "  npx proto-loader-gen-types --longs=String --enums=String --defaults --oneofs --grpcLib=@grpc/grpc-js --outDir=src/grpc/proto ../../protos/driver_ms.proto"
    fi
    cd ../..
fi

echo ""

# 2. Driver-MS
echo -e "${BLUE}📦 Regenerando gRPC para Driver-MS...${NC}"
cd services/driver-ms

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  No se encontró package.json en driver-ms${NC}"
    cd ../..
else
    # Verificar si existe el script de generación
    if npm run | grep -q "proto:generate"; then
        npm run proto:generate
    else
        echo -e "${YELLOW}⚠️  No existe script proto:generate en driver-ms${NC}"
        echo "Puedes ejecutar manualmente:"
        echo "  npx proto-loader-gen-types --longs=String --enums=String --defaults --oneofs --grpcLib=@grpc/grpc-js --outDir=src/grpc/proto ../../protos/driver_ms.proto"
    fi
    cd ../..
fi

echo ""
echo -e "${GREEN}✅ Regeneración completada!${NC}"
echo ""
echo -e "${YELLOW}📝 Recuerda:${NC}"
echo "  1. Reiniciar API Gateway:  cd services/api-gateway && npm run start:dev"
echo "  2. Reiniciar Driver-MS:    cd services/driver-ms && npm run start:dev"
echo "  3. Probar crear licencia con isProfessional: true"
