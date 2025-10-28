# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

# Copiar archivos de dependencias
COPY package.json ./
COPY prisma ./prisma/

# Instalar dependencias y generar Prisma Client
RUN npm install --production --no-package-lock && \
    npx prisma generate && \
    npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

# Copiar archivos de dependencias
COPY package.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias
RUN npm install --no-package-lock && npx prisma generate

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

# Variables de entorno
ENV NODE_ENV=production

# Copiar dependencias de producción y Prisma Client
COPY --from=deps /app/node_modules ./node_modules

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Copiar Prisma schema, seeds e init.sql
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/init.sql ./init.sql
COPY package.json ./

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto gRPC
EXPOSE 50054

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:50054/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/main.js"]

