# ===== STAGE 1: Build =====
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json ./

# Instalar dependencias
RUN npm install --no-package-lock

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# ===== STAGE 2: Runtime =====
FROM node:20-alpine AS runtime
WORKDIR /app

# Variables de entorno
ENV NODE_ENV=production

# Copiar dependencias
COPY --from=build /app/node_modules ./node_modules

# Copiar código compilado
COPY --from=build /app/dist ./dist

# Copiar package.json
COPY package.json ./

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

# Exponer puerto
EXPOSE 50058

# Comando de inicio
CMD ["node", "dist/main.js"]
