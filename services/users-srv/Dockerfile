# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

# Copiar archivos de dependencias
COPY package.json ./
COPY prisma ./prisma/

# ARG para DATABASE_URL en build time (solo para prisma generate)
# No se persiste en la imagen final
ARG USERS_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public

# Instalar dependencias y generar Prisma Client
RUN npm install --production --no-package-lock && \
    USERS_DATABASE_URL=$USERS_DATABASE_URL npx prisma generate && \
    npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

# Copiar archivos de dependencias
COPY package.json ./
COPY prisma ./prisma/

# ARG para DATABASE_URL en build time
ARG USERS_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public

# Instalar todas las dependencias y generar Prisma Client
RUN npm install --no-package-lock && \
    USERS_DATABASE_URL=$USERS_DATABASE_URL npx prisma generate

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

# Copiar Prisma schema y archivos necesarios
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/db ./db
COPY package.json ./

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto gRPC
EXPOSE 50053

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:50053/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/main.js"]

