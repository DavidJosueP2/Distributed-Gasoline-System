# ===== STAGE 1: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias y configuración
COPY services/publisher-rabbit-srv/package.json ./
COPY services/publisher-rabbit-srv/tsconfig.json ./

# Instalar dependencias
RUN npm install --no-package-lock

# Copiar código fuente
COPY services/publisher-rabbit-srv/src ./src

# Compilar TypeScript
RUN npm run build

# Copiar archivo .proto desde la raíz del proyecto
RUN mkdir -p ./protos
COPY protos/logs.proto ./protos/logs.proto

# ===== STAGE 2: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalar tzdata para timezone
RUN apk add --no-cache tzdata

# Variables de entorno
ENV TZ=America/Guayaquil
ENV NODE_ENV=production

# Copiar package.json
COPY services/publisher-rabbit-srv/package.json ./

# Copiar dependencias
COPY --from=build /app/node_modules ./node_modules

# Copiar archivo .proto (necesario para gRPC)
COPY --from=build /app/protos ./protos

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto HTTP
EXPOSE 4100

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4100/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/main.js"]
