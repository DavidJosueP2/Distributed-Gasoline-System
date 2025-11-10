# ===== STAGE 1: Dependencias =====
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY services/routes-srv/package.json ./

# Instalar solo dependencias de producción
RUN npm install --production --no-package-lock && npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias y configuración
COPY services/routes-srv/package.json ./
COPY services/routes-srv/tsconfig.json ./
COPY services/routes-srv/tsconfig.build.json ./
COPY services/routes-srv/nest-cli.json ./

# Instalar todas las dependencias (incluye dev)
RUN npm install --no-package-lock

# Copiar código fuente
COPY services/routes-srv/src ./src

# Construir la aplicación
RUN npm run build

# Copiar todos los archivos .proto necesarios
RUN mkdir -p ./protos
COPY protos ./protos

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Variables de entorno
ENV NODE_ENV=production

# Copiar package.json
COPY services/routes-srv/package.json ./

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules

# Copiar archivos .proto
COPY --from=build /app/protos ./protos

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto gRPC
EXPOSE 50053

# Healthcheck básico usando conexión TCP
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "require('net').connect({ port: 50053, host: '127.0.0.1' }).on('connect', ()=>process.exit(0)).on('error', ()=>process.exit(1))"

# Comando de inicio
CMD ["node", "dist/main.js"]


