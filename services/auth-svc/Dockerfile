# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY services/auth-svc/package.json ./

# Instalar solo dependencias de producción
RUN npm install --production --no-package-lock && npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias y configuración
COPY services/auth-svc/package.json ./
COPY services/auth-svc/tsconfig.json ./
COPY services/auth-svc/tsconfig.build.json ./
COPY services/auth-svc/nest-cli.json ./

# Instalar todas las dependencias (incluidas dev)
RUN npm install --no-package-lock

# Copiar código fuente
COPY services/auth-svc/src ./src

# Construir la aplicación
RUN npm run build

# Crear directorio y copiar archivo .proto desde la raíz del proyecto
RUN mkdir -p ./protos
COPY protos/auth.proto ./protos/auth.proto

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Variables de entorno
ENV NODE_ENV=production

# Copiar package.json
COPY services/auth-svc/package.json ./

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules

# Copiar archivo .proto (necesario para gRPC)
COPY --from=build /app/protos ./protos

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto
EXPOSE 50051

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:50051/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/main.js"]

