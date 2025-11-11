# ===== STAGE 1: Dependencies =====
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

# Copiar archivos de dependencias
COPY services/vehicles-svc/package.json ./
COPY services/vehicles-svc/prisma ./prisma/

# ARG para DATABASE_URL y SHADOW_DATABASE_URL en build time
# Solo para prisma generate - no se persisten en la imagen final
ARG DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public
ARG SHADOW_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp_shadow?schema=public

# Instalar dependencias de producción y generar Prisma Client
RUN npm install --production --no-package-lock && \
    DATABASE_URL=$DATABASE_URL SHADOW_DATABASE_URL=$SHADOW_DATABASE_URL npx prisma generate && \
    npm cache clean --force

# ===== STAGE 2: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

# Copiar archivos de dependencias y configuración
COPY services/vehicles-svc/package.json ./
COPY services/vehicles-svc/tsconfig.json ./
COPY services/vehicles-svc/tsconfig.build.json ./
COPY services/vehicles-svc/nest-cli.json ./
COPY services/vehicles-svc/prisma ./prisma/

# ARG para DATABASE_URL y SHADOW_DATABASE_URL en build time
ARG DATABASE_URL=postgresql://temp:temp@localhost:5432/temp?schema=public
ARG SHADOW_DATABASE_URL=postgresql://temp:temp@localhost:5432/temp_shadow?schema=public

# Instalar todas las dependencias y generar Prisma Client
RUN npm install --no-package-lock && \
    DATABASE_URL=$DATABASE_URL SHADOW_DATABASE_URL=$SHADOW_DATABASE_URL npx prisma generate

# Copiar código fuente
COPY services/vehicles-svc/src ./src

# Copiar archivo de seed para compilarlo
COPY services/vehicles-svc/prisma/seed.ts ./prisma/seed.ts

# Construir la aplicación
RUN npm run build

# Compilar el seed manualmente (ts-node no estará en runtime)
# Usamos --rootDir . para preservar la estructura de directorios
RUN npx tsc prisma/seed.ts --outDir dist --rootDir . --esModuleInterop --resolveJsonModule --skipLibCheck --module commonjs --target ES2020 --lib ES2020

# Crear directorio y copiar archivo .proto desde la raíz del proyecto
RUN mkdir -p ./protos
COPY protos ./protos

# ===== STAGE 3: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

# Variables de entorno
ENV NODE_ENV=production

# Copiar package.json
COPY services/vehicles-svc/package.json ./

# Copiar dependencias de producción y Prisma Client generado
COPY --from=deps /app/node_modules ./node_modules

# Copiar Prisma schema y migraciones (necesarios para migrate deploy)
COPY --from=build /app/prisma ./prisma

# Copiar archivo .proto (necesario para gRPC)
COPY --from=build /app/protos ./protos

# Copiar código compilado
COPY --from=build /app/dist ./dist

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

