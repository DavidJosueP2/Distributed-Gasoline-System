# -------- deps (cacheable) --------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --production --no-package-lock

# -------- build (Nest -> dist) --------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-package-lock
COPY . .
RUN npm run build

# -------- runtime (ligero) --------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# código + deps de producción
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
# mismo puerto que usa tu main.ts (por env; default 8080) :contentReference[oaicite:3]{index=3}
EXPOSE 8080
CMD ["node","dist/main.js"]
