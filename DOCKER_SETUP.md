# Configuración de Docker - Fuel System

## 📁 Estructura de Archivos

```
fuel-system-distributed/
├── .env                              # Variables globales
├── env.example                       # Plantilla
├── docker-compose.yml                # Todo dockerizado
├── docker-compose.infra.yml          # Solo infraestructura
│
├── services/
│   ├── users-srv/
│   │   ├── .env                      # Variables de Prisma (crear)
│   │   └── ENV_LOCAL_EXAMPLE.txt     # Plantilla
│   ├── vehicles-svc/
│   │   ├── .env                      # Variables de Prisma (crear)
│   │   └── ENV_LOCAL_EXAMPLE.txt     # Plantilla
│   └── otros servicios...
```

## ⚡ Setup Inicial

```bash
# Crea TODOS los archivos .env automáticamente
npm run env:setup

# O manualmente:
cp env.example .env
cp services/users-srv/ENV_LOCAL_EXAMPLE.txt services/users-srv/.env
cp services/vehicles-svc/ENV_LOCAL_EXAMPLE.txt services/vehicles-svc/.env
```

## 🎯 Dos Modos de Trabajo

### Modo 1: Desarrollo Local (Recomendado)
Solo infraestructura en Docker, microservicios en tu máquina:

```bash
# 1. Setup de variables (automático)
npm run setup

# 2. O paso a paso:
npm run env:setup         # Crea archivos .env
npm run infra:up          # Solo DBs, Eureka, RabbitMQ
npm run infra:ready       # Espera que esté lista
npm run prisma:prepare    # Migraciones de Prisma

# 3. Correr microservicios
npm run dev:auth          # Solo auth
npm run dev:users         # Solo users
npm run dev               # Todos
```

**✅ Ventajas**: Más rápido, menos espacio, hot-reload funciona
**📍 Host**: Tu código corre en `tu máquina` → Conecta a `localhost:543X`

### Modo 2: Todo Dockerizado
Levanta TODO con Docker (infra + microservicios):

```bash
# 1. Setup
npm run env:setup

# 2. Construir imágenes
npm run docker:build

# 3. Levantar todo
npm run docker:up

# 4. Ver logs
npm run docker:logs
```

**✅ Ventajas**: Simula producción, pruebas completas
**📍 Host**: Todo en Docker → Se comunican por `red interna` (auth-db:5432)

## 🗄️ Bases de Datos Separadas

Cada microservicio tiene su propia base de datos:

| Servicio | Puerto Local | Container Name | Database |
|----------|--------------|----------------|----------|
| Auth | `localhost:5433` | `fuel-auth-db` | `auth` |
| Users | `localhost:5434` | `fuel-users-db` | `users` |
| Vehicles | `localhost:5435` | `fuel-vehicles-db` | `vehicles` |
| Driver | `localhost:5436` | `fuel-driver-db` | `drivers` |

**En desarrollo local**: Usas `localhost:543X`
**En Docker**: Contenedores usan `fuel-users-db:5432` (red interna)

## Servicios de Infraestructura

- **Eureka**: http://localhost:8761 (Service Discovery)
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601

## 📝 Variables de Entorno - Explicación

### ¿Por qué 3 archivos .env?

1. **`.env` (raíz)**: Variables globales (Eureka, JWT, SMTP, etc.)
2. **`services/users-srv/.env`**: Solo `USERS_DATABASE_URL` para Prisma CLI
3. **`services/vehicles-svc/.env`**: Solo `DATABASE_URL` y `SHADOW_DATABASE_URL` para Prisma CLI

### ¿Cómo busca las variables?

**NestJS** (cuando corres el microservicio):
```typescript
// Busca en este orden:
envFilePath: ['.env', '../../.env']  // 1º hijo, 2º padre
```

**Prisma CLI** (migrate, generate, studio):
```bash
# Solo busca en la raíz del microservicio
cd services/users-srv
npx prisma migrate dev  # Lee: services/users-srv/.env
```

## 🛠️ Comandos Útiles

```bash
# Setup
npm run env:setup      # Crear archivos .env automáticamente
npm run setup          # Setup completo (env + infra + prisma)

# Infraestructura
npm run infra:up       # Iniciar solo DBs
npm run infra:down     # Detener y limpiar
npm run infra:logs     # Ver logs
npm run infra:ready    # Esperar que esté lista

# Docker completo
npm run docker:build   # Construir imágenes
npm run docker:up      # Iniciar todo
npm run docker:down    # Detener y limpiar
npm run docker:logs    # Ver logs

# Desarrollo
npm run dev            # Todos los microservicios
npm run dev:auth       # Solo auth
npm run dev:users      # Solo users
npm run dev:vehicles   # Solo vehicles
npm run dev:drivers    # Solo drivers

# Prisma
npm run prisma:users   # Generar cliente
npm run prisma:prepare # Reset y generar todo
```

## 🌐 Docker vs Local vs Azure

| Aspecto | Local (npm run dev) | Docker (docker-compose) | Azure (AKS) |
|---------|---------------------|-------------------------|-------------|
| Microservicio | Tu máquina (Node.js) | Contenedor | Pod en AKS |
| DB Host | `localhost` | `users-db` | Azure PostgreSQL |
| DB Port | `5434` | `5432` | `5432` |
| Red | Host network | `fuel-network` | VNet privada |
| Variables | `.env` padre/hijo | `env_file` | K8s Secrets |
| Eureka | `localhost:8761` | `eureka-server:8761` | `eureka-server:8761` |

**Resumen:**
- **Local**: Microservicios fuera de Docker, se conectan a `localhost`
- **Docker**: Todo dentro de Docker, red interna
- **Azure**: Kubernetes con PostgreSQL administrado por Azure

## Troubleshooting

### Los puertos están ocupados
Cambia los puertos en `.env`:
```bash
AUTH_DB_PORT=5433      # Cambiar a otro puerto libre
USERS_DB_PORT=5434     # etc.
```

### Bases de datos no se crean
```bash
npm run infra:down     # Limpiar todo
npm run infra:up       # Volver a crear
```

### Los microservicios no conectan a Eureka
Verifica que Eureka esté corriendo:
```bash
curl http://localhost:8761
```

### Error de Prisma
```bash
npm run prisma:users      # Generar cliente Prisma
npm run prisma:prepare    # Reset y generar
```

## Para Azure/Producción

Los Dockerfiles están optimizados para Azure. Ver:
- `deploy/helm/` - Helm charts para AKS
- `.github/workflows/` - CI/CD automático
- `DEPLOYMENT.md` - Guía completa de despliegue

