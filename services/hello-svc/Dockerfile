# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json ./

# Instalar solo dependencias de producción
RUN npm install --production --no-package-lock && npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json ./

# Instalar todas las dependencias
RUN npm install --no-package-lock

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Variables de entorno
ENV NODE_ENV=production

# Copiar dependencias de producción
COPY --from=deps /app/node_modules ./node_modules

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Copiar package.json
COPY package.json ./

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto gRPC
EXPOSE 50056

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:50056/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/main.js"]

