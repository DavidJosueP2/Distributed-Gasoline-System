# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY services/fuel-svc/package.json ./
COPY services/fuel-svc/package-lock.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias y configuración
COPY services/fuel-svc/package.json ./
COPY services/fuel-svc/package-lock.json ./
COPY services/fuel-svc/tsconfig.json ./
COPY services/fuel-svc/tsconfig.build.json ./
COPY services/fuel-svc/nest-cli.json ./

# Instalar todas las dependencias (incluidas dev)
RUN npm ci --ignore-scripts

# Copiar código fuente
COPY services/fuel-svc/src ./src

# Construir la aplicación
RUN npm run build

# Copiar todos los archivos .proto necesarios (CRÍTICO para gRPC)
RUN mkdir -p ./protos
COPY protos ./protos

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Variables de entorno
ENV NODE_ENV=production

# Copiar package.json
COPY services/fuel-svc/package.json ./

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules

# Copiar archivos .proto (CRÍTICO para gRPC)
COPY --from=build /app/protos ./protos

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto gRPC (50053 es el puerto de fuel-svc)
EXPOSE 50053

# Health check básico usando conexión TCP
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "require('net').connect({ port: 50053, host: '127.0.0.1' }).on('connect', ()=>process.exit(0)).on('error', ()=>process.exit(1))"

# Comando de inicio
CMD ["node", "dist/main.js"]

