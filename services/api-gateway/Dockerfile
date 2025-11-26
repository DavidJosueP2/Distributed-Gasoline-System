# -------- deps (cacheable) --------
FROM node:20-alpine AS deps
WORKDIR /app
COPY services/api-gateway/package.json ./
RUN npm install --production --no-package-lock

# -------- build (Nest -> dist) --------
FROM node:20-alpine AS build
WORKDIR /app
COPY services/api-gateway/package.json ./
COPY services/api-gateway/tsconfig.json ./
COPY services/api-gateway/tsconfig.build.json ./
COPY services/api-gateway/nest-cli.json ./
RUN npm install --no-package-lock
COPY services/api-gateway/src ./src
RUN npm run build

# Copiar todos los archivos .proto necesarios
RUN mkdir -p ./protos
COPY protos/*.proto ./protos/

# -------- runtime (ligero) --------
FROM node:20-alpine
WORKDIR /app

# Instalar curl para healthchecks y tzdata para timezone
RUN apk add --no-cache curl tzdata

# Configurar timezone
ENV TZ=America/Guayaquil
ENV NODE_ENV=production

# Copiar package.json
COPY services/api-gateway/package.json ./

# Copiar deps de producción
COPY --from=deps  /app/node_modules ./node_modules

# Copiar archivos .proto
COPY --from=build /app/protos ./protos

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puertos HTTP y HTTPS
EXPOSE 8080
EXPOSE 8443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node","dist/main.js"]
