# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY services/logger-svc/package.json ./

# Instalar solo dependencias de producción
RUN npm install --production --no-package-lock && npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias y configuración
COPY services/logger-svc/package.json ./
COPY services/logger-svc/tsconfig.json ./
COPY services/logger-svc/tsconfig.build.json ./
COPY services/logger-svc/nest-cli.json ./

# Instalar todas las dependencias
RUN npm install --no-package-lock

# Copiar código fuente
COPY services/logger-svc/src ./src

# Construir la aplicación
RUN npm run build

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalar curl para healthchecks
RUN apk add --no-cache curl

# Variables de entorno
ENV NODE_ENV=production

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Copiar package.json
COPY services/logger-svc/package.json ./

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto HTTP
EXPOSE 3200

# Health check usando el puerto HTTP correcto
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3200/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/main.js"]
