# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY services/driver-ms/package.json ./

# Instalar solo dependencias de producción
RUN npm install --production --no-package-lock && npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias y configuración
COPY services/driver-ms/package.json ./
COPY services/driver-ms/tsconfig.json ./
COPY services/driver-ms/tsconfig.build.json ./
COPY services/driver-ms/nest-cli.json ./

# Instalar todas las dependencias (incluidas dev)
RUN npm install --no-package-lock

# Copiar código fuente y archivos necesarios
COPY services/driver-ms/src ./src
COPY services/driver-ms/migrations ./migrations
COPY services/driver-ms/init.sql ./init.sql
COPY services/driver-ms/seed.sql ./seed.sql

# Construir la aplicación
RUN npm run build

# Crear directorio y copiar archivos .proto necesarios desde la raíz del proyecto
RUN mkdir -p ./protos
COPY protos/driver_ms.proto ./protos/driver_ms.proto
COPY protos/users.proto ./protos/users.proto

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalar postgresql-client para ejecutar seeds
RUN apk add --no-cache postgresql-client

# Variables de entorno
ENV NODE_ENV=production

# Copiar package.json
COPY services/driver-ms/package.json ./

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules

# Copiar archivo .proto (necesario para gRPC)
COPY --from=build /app/protos ./protos

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Copiar archivos necesarios para migraciones
COPY --from=build /app/src/data-source.ts ./src/data-source.ts
COPY --from=build /app/migrations ./migrations

# Copiar archivos SQL para inicialización y seeding (desde el stage de build)
COPY --from=build /app/init.sql ./init.sql
COPY --from=build /app/seed.sql ./seed.sql

# Copiar script de inicialización
COPY services/driver-ms/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto gRPC
EXPOSE 50052

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:50052/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["./docker-entrypoint.sh"]
