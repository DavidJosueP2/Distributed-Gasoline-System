# 📝 Configuración de Variables de Entorno

## 🎯 Enfoque Actual: `.env` por Servicio

Cada microservicio tiene su propio archivo `.env` con **solo las variables que necesita**.

### 📂 Estructura

```
back/
├── .env                    # ⚠️ DEPRECADO - Solo para Docker Compose
└── services/
    ├── api-gateway/.env    # ✅ Config del gateway
    ├── auth-svc/.env       # ✅ Config de autenticación
    ├── driver-ms/.env      # ✅ Config de drivers
    ├── email-svc/.env      # ✅ Config de email
    ├── fuel-svc/.env       # ✅ Config de combustible
    ├── hello-svc/.env      # ✅ Config de hello (demo)
    ├── logger-svc/.env     # ✅ Config de logger
    ├── routes-srv/.env     # ✅ Config de rutas
    ├── users-srv/.env      # ✅ Config de usuarios
    └── vehicles-svc/.env   # ✅ Config de vehículos
```

---

## ✅ Variables Comunes en Todos los Servicios

```bash
# Registro en Eureka
DISCOVERY_MODE=eureka
EUREKA_ENABLED=true
EUREKA_HOST=localhost
EUREKA_PORT=8761
EUREKA_BASE_PATH=/eureka

# Configuración de Red
SERVICE_BIND_HOST=0.0.0.0       # Donde escucha el servicio
SERVICE_REGISTER_HOST=127.0.0.1 # IP que anuncia en Eureka

# Rutas
PROTO_ROOT=../../protos          # Archivos .proto compartidos
```

---

## 🚀 Cómo Arrancar Servicios

### Opción 1: Individualmente (Recomendado - Ahorro de RAM)

```bash
# Desde la carpeta del servicio
cd back/services/users-srv
npm run start:dev

# O desde el root
cd back/services/auth-svc && npm run start:dev
```

### Opción 2: Múltiples servicios en terminales separadas

```bash
# Terminal 1
cd back/services/users-srv && npm run start:dev

# Terminal 2
cd back/services/auth-svc && npm run start:dev

# Terminal 3
cd back/services/driver-ms && npm run start:dev
```

---

## 🔧 Variables Específicas por Servicio

### **API Gateway** (`api-gateway/.env`)
```bash
GATEWAY_HTTP_PORT=8080
GRPC_CALL_TIMEOUT_MS=6000
JWT_SECRET=tu-secret-aqui
```

### **Auth Service** (`auth-svc/.env`)
```bash
AUTH_GRPC_PORT=50052
AUTH_DATABASE_URL=postgresql://...
JWT_SECRET=tu-secret-aqui
```

### **Users Service** (`users-srv/.env`)
```bash
USERS_GRPC_PORT=50057
USERS_DATABASE_URL=postgresql://...
```

### **Driver Service** (`driver-ms/.env`)
```bash
DRIVER_HTTP_PORT=3100
DRIVER_GRPC_PORT=50062
DRIVER_DATABASE_URL=postgresql://...
```

### **Email Service** (`email-svc/.env`)
```bash
EMAIL_GRPC_PORT=50053
SMTP_HOST=smtp.gmail.com
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-password
```

---

## 🐳 Para Docker (Uso del `.env` centralizado)

El archivo `back/.env` **solo se usa con Docker Compose**:

```bash
cd back
docker-compose up -d
```

Los contenedores leerán el `.env` centralizado automáticamente.

---

## 🛠️ Troubleshooting

### ❌ Error: `EADDRINUSE: address already in use`
**Causa:** El puerto ya está ocupado.

**Solución:**
```bash
# Windows
netstat -ano | findstr :<puerto>
taskkill /PID <proceso_id> /F

# Linux/Mac
lsof -i :<puerto>
kill -9 <proceso_id>
```

### ❌ Error: No se conecta a Eureka
**Verifica:**
```bash
# 1. Eureka está corriendo
curl http://localhost:8761/eureka/apps

# 2. Variables están seteadas
DISCOVERY_MODE=eureka
EUREKA_ENABLED=true
```

### ❌ Error: No encuentra variables de entorno
**Verifica:**
1. El archivo `.env` existe en la carpeta del servicio
2. No tiene errores de sintaxis (sin espacios en los `=`)
3. Reinicia el servicio después de cambiar el `.env`

---

## 📊 Puertos por Defecto

| Servicio      | Puerto gRPC | Puerto HTTP | Base de Datos |
|---------------|-------------|-------------|---------------|
| API Gateway   | -           | 8080        | -             |
| Eureka        | -           | 8761        | -             |
| Auth          | 50052       | -           | 5432 (authms) |
| Users         | 50057       | -           | 5432 (usersms)|
| Driver        | 50062       | 3100        | 5432 (drivers)|
| Email         | 50053       | -           | -             |
| Vehicles      | 50055       | -           | 5432 (vehiclesms)|
| Routes        | 50056       | -           | 5432 (routesms)|
| Fuel          | 50058       | -           | 5432 (fuelms) |
| Logger        | 50054       | -           | -             |
| Hello         | 50051       | -           | -             |

---

## 💡 Ventajas de Este Enfoque

✅ **Menos RAM:** Solo arrancas los servicios que necesitas  
✅ **Más claro:** Cada servicio sabe qué variables usa  
✅ **Menos conflictos:** No hay variables mezcladas  
✅ **Más rápido:** Arranque individual es instantáneo  

---

## 🔄 Migración desde Configuración Centralizada

**Antes** (todo en `back/.env`):
```bash
cd back
npm run dev:all  # Arranca TODO (mucha RAM)
```

**Ahora** (`.env` por servicio):
```bash
cd back/services/users-srv
npm run start:dev  # Solo lo que necesitas
```

---

## 📝 Notas

- **No commitees** archivos `.env` con datos sensibles (usa `.env.example`)
- **Los `.env` locales** tienen prioridad sobre el centralizado
- **Para producción**, usa variables de entorno del sistema o secretos de Kubernetes
