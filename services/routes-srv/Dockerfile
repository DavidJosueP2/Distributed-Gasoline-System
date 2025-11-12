# ===== STAGE 1: Dependencies =====
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

# Instalar todas las dependencias (incluidas dev)
RUN npm install --no-package-lock

# Copiar código fuente
COPY services/routes-srv/src ./src

# Copiar archivo SQL para inicialización
COPY services/routes-srv/db/init.sql ./db/init.sql

# Construir la aplicación
RUN npm run build

# Copiar todos los archivos .proto necesarios
RUN mkdir -p ./protos
COPY protos ./protos

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalar postgresql-client para ejecutar init.sql
RUN apk add --no-cache postgresql-client

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

# Copiar archivo SQL para inicialización y seeding
COPY --from=build /app/db/init.sql ./db/init.sql

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto gRPC (50053 es el puerto de routes-srv)
EXPOSE 50053

# Health check básico usando conexión TCP
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "require('net').connect({ port: 50053, host: '127.0.0.1' }).on('connect', ()=>process.exit(0)).on('error', ()=>process.exit(1))"

# Comando de inicio
CMD ["node", "dist/main.js"]
