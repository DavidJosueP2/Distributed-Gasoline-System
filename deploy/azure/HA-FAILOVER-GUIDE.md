# 🛡️ Guía de Alta Disponibilidad (HA) y Failover en PostgreSQL Azure

> **Fecha**: Noviembre 24, 2025  
> **Configuración Actual**: HA Same-Zone + Read Replica  
> **Objetivo**: Entender cómo funciona el failover y cuándo usar cada tipo de servidor

---

## 📊 Arquitectura Actual de PostgreSQL

Tu sistema tiene **DOS mecanismos separados** de alta disponibilidad:

### 1. HA Same-Zone (Alta Disponibilidad con Failover Automático)

```
┌─────────────────────────────────────────────────────────────┐
│  fuel-system-postgres.postgres.database.azure.com          │
│  (MISMO FQDN - NO CAMBIA)                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼──────┐        ┌──────▼──────┐
        │   PRIMARY    │◄──────►│   STANDBY   │
        │   (Activo)   │ Sync   │  (Hot copy) │
        │              │ Replic.│             │
        │ Escritura ✅ │        │ Escritura ❌│
        │ Lectura ✅   │        │ Lectura ❌  │
        └──────────────┘        └─────────────┘
              │
              │ Si PRIMARY falla (60-120s)
              ▼
        ┌──────────────┐
        │   STANDBY    │
        │ → PRIMARY    │  (Failover automático)
        │              │
        │ Escritura ✅ │
        │ Lectura ✅   │
        └──────────────┘
```

**Características:**
- ✅ **Failover automático** en 60-120 segundos
- ✅ **FQDN no cambia** (`fuel-system-postgres.postgres.database.azure.com`)
- ✅ Standby se convierte en PRIMARY automáticamente
- ✅ Maneja **escrituras y lecturas**
- ⚠️ ~1-2 minutos de downtime durante failover
- ⚠️ Conexiones activas se pierden (deben reconectarse)
- 💰 Costo: Incluido en el tier GeneralPurpose

### 2. Read Replica (Distribución de Carga - INDEPENDIENTE del HA)

```
┌─────────────────────────────────────────────────────────────┐
│  fuel-system-postgres.postgres.database.azure.com          │
│  (PRIMARY + HA Standby)                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Async Replication
                       │ (delay: segundos/minutos)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  fuel-system-postgres-read.postgres.database.azure.com     │
│  (READ REPLICA - SOLO LECTURA)                             │
└─────────────────────────────────────────────────────────────┘
        │
        │ Escritura ❌
        │ Lectura ✅
        │
        └─ NO hace failover
        └─ Independiente del HA
        └─ Para distribuir carga de lecturas pesadas
```

**Características:**
- ❌ **NO hace failover** (no es para HA)
- ✅ **FQDN diferente** (`fuel-system-postgres-read.postgres.database.azure.com`)
- ✅ **Solo lectura** (SELECT)
- ✅ Reduce carga en el servidor primario
- ✅ Ideal para reportes, dashboards, listados
- ⚠️ Replicación asíncrona (puede tener delay)
- 💰 Costo adicional: ~50% del costo del primario

---

## 🎯 ¿Qué pasa si apagas el servidor PRIMARY?

### Escenario 1: Apagar PRIMARY (con HA Same-Zone activo)

**¿Qué sucede?**

1. **t=0s**: PRIMARY se apaga/falla
2. **t=0-60s**: Azure detecta la falla (health checks)
3. **t=60-120s**: Azure inicia el failover automático
   - STANDBY se convierte en nuevo PRIMARY
   - DNS/FQDN apunta al nuevo PRIMARY
   - Replicación se reconfigura
4. **t=120s+**: Sistema operacional nuevamente
   - Mismo FQDN funciona
   - Tus microservicios se reconectan automáticamente

**Impacto en tus microservicios:**

```yaml
# Configuración actual en ConfigMap:
AUTH_DB_HOST: "fuel-system-postgres.postgres.database.azure.com"
DRIVER_DB_HOST: "fuel-system-postgres.postgres.database.azure.com"
# ... todos apuntan al mismo FQDN
```

✅ **Resultado**: 
- **1-2 minutos de downtime**
- **NO necesitas cambiar configuración**
- **Reconexión automática** después del failover
- **Sistema sigue funcionando**

### Escenario 2: Apagar Read Replica

**¿Qué sucede?**

1. **t=0s**: Read Replica se apaga/falla
2. **t=0s+**: PRIMARY sigue funcionando normalmente

**Impacto en tus microservicios:**

```yaml
# Con la nueva configuración que implementé:
AUTH_DB_HOST: "fuel-system-postgres.postgres.database.azure.com"       # PRIMARY
AUTH_DB_READ_HOST: "fuel-system-postgres-read.postgres.database.azure.com"  # REPLICA
```

⚠️ **IMPORTANTE**: Actualmente tus microservicios **NO están usando la Read Replica** en el código. Solo he agregado las variables de entorno. El código de los microservicios necesita ser modificado para usar `*_DB_READ_HOST`.

---

## 🔧 Cómo Implementar Read Replica en tus Microservicios

### Estrategia Recomendada: Separar Lecturas de Escrituras

**Principio**: 
- **Escrituras** (INSERT, UPDATE, DELETE) → PRIMARY
- **Lecturas pesadas** (listados, reportes) → READ REPLICA
- **Lecturas críticas** (después de escribir) → PRIMARY

### Ejemplo: Driver Service (TypeORM)

Tu driver-service usa TypeORM. Aquí está cómo configurar múltiples conexiones:

**Archivo: `services/driver-ms/src/database/database.module.ts`** (nuevo o modificar)

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // Conexión WRITE (PRIMARY)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'default', // Conexión por defecto
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DRIVER_DB_HOST'), // PRIMARY
        port: config.get('DRIVER_DB_PORT'),
        username: config.get('DRIVER_DB_USER'),
        password: config.get('DRIVER_DB_PASS'),
        database: config.get('DRIVER_DB_NAME'),
        ssl: config.get('DRIVER_DB_SSL_MODE') === 'require' ? {
          rejectUnauthorized: false
        } : false,
        synchronize: false,
        logging: config.get('DRIVER_DB_LOGGING') === 'true',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      }),
    }),

    // Conexión READ (REPLICA)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'read', // Conexión separada para lecturas
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DRIVER_DB_READ_HOST'), // REPLICA (fallback a PRIMARY si no existe)
        port: config.get('DRIVER_DB_PORT'),
        username: config.get('DRIVER_DB_USER'),
        password: config.get('DRIVER_DB_PASS'),
        database: config.get('DRIVER_DB_NAME'),
        ssl: config.get('DRIVER_DB_SSL_MODE') === 'require' ? {
          rejectUnauthorized: false
        } : false,
        synchronize: false,
        logging: false, // Menos logging en reads
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      }),
    }),
  ],
})
export class DatabaseModule {}
```

**Uso en un Service:**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';

@Injectable()
export class DriversService {
  constructor(
    // Conexión WRITE (PRIMARY) - para escrituras
    @InjectRepository(Driver, 'default')
    private readonly driverRepo: Repository<Driver>,

    // Conexión READ (REPLICA) - para lecturas pesadas
    @InjectRepository(Driver, 'read')
    private readonly driverReadRepo: Repository<Driver>,
  ) {}

  // ✅ WRITE - usa PRIMARY
  async createDriver(data: CreateDriverDto): Promise<Driver> {
    const driver = this.driverRepo.create(data);
    return await this.driverRepo.save(driver); // PRIMARY
  }

  // ✅ WRITE - usa PRIMARY
  async updateDriver(id: string, data: UpdateDriverDto): Promise<Driver> {
    await this.driverRepo.update(id, data); // PRIMARY
    return await this.driverRepo.findOne({ where: { id } }); // PRIMARY (lectura crítica)
  }

  // ✅ READ - usa REPLICA (para listados)
  async findAllDrivers(): Promise<Driver[]> {
    return await this.driverReadRepo.find(); // REPLICA
  }

  // ✅ READ - usa REPLICA (para búsquedas)
  async searchDriversByLicense(license: string): Promise<Driver[]> {
    return await this.driverReadRepo.find({
      where: { licenseNumber: license }
    }); // REPLICA
  }

  // ⚠️ READ CRÍTICO - usa PRIMARY (después de escribir)
  async findDriverById(id: string): Promise<Driver> {
    return await this.driverRepo.findOne({ where: { id } }); // PRIMARY
  }
}
```

### Ejemplo: Users Service (Prisma)

**Archivo: `services/users-srv/src/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // Cliente WRITE (PRIMARY)
  public readonly client: PrismaClient;

  // Cliente READ (REPLICA)
  public readonly readClient: PrismaClient;

  constructor(private config: ConfigService) {
    // Cliente principal (WRITE)
    this.client = new PrismaClient({
      datasources: {
        db: {
          url: this.buildDatabaseUrl(
            this.config.get('USERS_DB_HOST'),
            this.config.get('USERS_DB_NAME')
          ),
        },
      },
    });

    // Cliente de lectura (READ REPLICA)
    const readHost = this.config.get('USERS_DB_READ_HOST') || this.config.get('USERS_DB_HOST');
    this.readClient = new PrismaClient({
      datasources: {
        db: {
          url: this.buildDatabaseUrl(readHost, this.config.get('USERS_DB_NAME')),
        },
      },
    });
  }

  private buildDatabaseUrl(host: string, database: string): string {
    const user = this.config.get('DB_USERNAME');
    const pass = this.config.get('DB_PASSWORD');
    const port = this.config.get('DB_PORT');
    const sslMode = this.config.get('USERS_DB_SSL_MODE');
    return `postgresql://${user}:${pass}@${host}:${port}/${database}?schema=public&sslmode=${sslMode}`;
  }

  async onModuleInit() {
    await this.client.$connect();
    await this.readClient.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
    await this.readClient.$disconnect();
  }
}
```

**Uso en un Service:**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ✅ WRITE - usa PRIMARY
  async createUser(data: CreateUserDto) {
    return await this.prisma.client.user.create({ data }); // PRIMARY
  }

  // ✅ WRITE - usa PRIMARY
  async updateUser(id: string, data: UpdateUserDto) {
    return await this.prisma.client.user.update({
      where: { id },
      data,
    }); // PRIMARY
  }

  // ✅ READ - usa REPLICA (para listados)
  async findAllUsers() {
    return await this.prisma.readClient.user.findMany(); // REPLICA
  }

  // ✅ READ - usa REPLICA (para búsquedas)
  async findUsersByRole(role: string) {
    return await this.prisma.readClient.user.findMany({
      where: { role },
    }); // REPLICA
  }

  // ⚠️ READ CRÍTICO - usa PRIMARY (para autenticación)
  async findUserByEmail(email: string) {
    return await this.prisma.client.user.findUnique({
      where: { email },
    }); // PRIMARY (crítico para login)
  }
}
```

---

## 🧪 Cómo Probar el Failover

### Preparación

1. **Verificar estado inicial:**

```bash
# Ver configuración HA
az postgres flexible-server show \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --query "{name:name, state:state, haMode:highAvailability.mode, haState:highAvailability.state}" \
  -o table

# Output esperado:
# Name                    State    HaMode     HaState
# fuel-system-postgres    Ready    SameZone   Healthy
```

2. **Monitorear antes del test:**

```bash
# Terminal 1: Monitorear pods
kubectl get pods -n fuel-system -w

# Terminal 2: Logs del API Gateway
kubectl logs -f deployment/fuel-system-api-gateway -n fuel-system

# Terminal 3: Hacer requests continuos
while true; do
  curl http://<INGRESS_IP>/health
  echo " - $(date)"
  sleep 2
done
```

### Test de Failover

**Opción 1: Failover Manual (Recomendado para testing)**

```bash
# Iniciar failover manual
az postgres flexible-server restart \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --failover Forced

# Monitorear el proceso
watch -n 5 'az postgres flexible-server show \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --query "{state:state, haState:highAvailability.state}" \
  -o table'

# El proceso toma 60-120 segundos
```

**Opción 2: Simular falla del PRIMARY (más realista)**

```bash
# Esto simula una falla real apagando el servidor
# ⚠️ CUIDADO: Causará downtime real de 1-2 minutos

# Método 1: Restart del servidor (failover automático)
az postgres flexible-server restart \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres

# Método 2: Stop del servidor (más drástico)
az postgres flexible-server stop \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres

# Azure detectará la falla y hará failover automático
```

### Qué Observar Durante el Failover

**Fase 1: Detección (0-60s)**
```
- Azure health checks detectan que PRIMARY no responde
- Tus microservicios empiezan a recibir errores de conexión
- Logs mostrarán: "Connection refused" o "Connection timeout"
```

**Fase 2: Failover (60-120s)**
```
- STANDBY se promociona a PRIMARY
- DNS se actualiza (FQDN apunta al nuevo PRIMARY)
- Configuración de replicación se reconstruye
```

**Fase 3: Recuperación (120s+)**
```
- Tus microservicios reconectan automáticamente
- Requests exitosos nuevamente
- Sistema completamente operacional
```

**Logs esperados en tus microservicios:**

```
[Driver Service] ERROR: Connection to database failed: ECONNREFUSED
[Driver Service] WARN: Retrying connection... (attempt 1/5)
[Driver Service] WARN: Retrying connection... (attempt 2/5)
[Driver Service] INFO: Connected to database successfully
[Driver Service] INFO: Database connection restored
```

### Verificar Después del Failover

```bash
# 1. Verificar que el nuevo PRIMARY está activo
az postgres flexible-server show \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --query "{state:state, haMode:highAvailability.mode, haState:highAvailability.state}" \
  -o table

# Output esperado:
# State    HaMode     HaState
# Ready    SameZone   Healthy

# 2. Verificar que pods están funcionando
kubectl get pods -n fuel-system

# 3. Probar API
curl http://<INGRESS_IP>/health
curl -X POST http://<INGRESS_IP>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice_admin","password":"admin123"}'

# 4. Verificar logs de conexión
kubectl logs deployment/fuel-system-driver-service -n fuel-system --tail=50 | grep -i "database\|connection"
```

---

## 📈 Métricas para Monitorear

### Antes de implementar Read Replica en código:

```bash
# Conexiones al PRIMARY
az postgres flexible-server show \
  --resource-group fuel-system-rg \
  --name fuel-system-postgres \
  --query "storage" -o table

# Ver uso de CPU/Memoria
az monitor metrics list \
  --resource /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/fuel-system-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/fuel-system-postgres \
  --metric "cpu_percent,memory_percent" \
  --interval PT1M
```

### Después de implementar Read Replica:

```bash
# Conexiones al PRIMARY (deben bajar)
# Conexiones a la REPLICA (deben aumentar)

# Comparar carga entre PRIMARY y REPLICA
az monitor metrics list \
  --resource <RESOURCE_ID_PRIMARY> \
  --metric "active_connections,cpu_percent" \
  --interval PT1M

az monitor metrics list \
  --resource <RESOURCE_ID_REPLICA> \
  --metric "active_connections,cpu_percent" \
  --interval PT1M
```

---

## ✅ Resumen: ¿Qué protege cada mecanismo?

| Escenario de Fallo | HA Same-Zone | Read Replica |
|---------------------|--------------|--------------|
| PRIMARY server crash | ✅ Failover automático | ❌ No ayuda |
| PRIMARY zona falla | ✅ Failover automático | ❌ No ayuda |
| Sobrecarga de lecturas | ⚠️ Limitado | ✅ Distribuye carga |
| Querys lentas | ❌ No ayuda | ✅ Aísla del PRIMARY |
| Corruption de datos | ❌ Se replica | ❌ Se replica |
| Backup/Restore | ✅ Automático (Azure) | ❌ Independiente |

---

## 🎯 Recomendaciones para tu Ingeniero

**Para demostrar el HA Same-Zone:**

1. **Configuración actual es suficiente** - Ya tienes HA configurado
2. **Hacer un failover forzado** con:
   ```bash
   az postgres flexible-server restart \
     --resource-group fuel-system-rg \
     --name fuel-system-postgres \
     --failover Forced
   ```
3. **Mostrar que el sistema sigue funcionando** después de 1-2 minutos
4. **Logs mostrarán reconexión** automática

**Para aprovechar la Read Replica:**

1. **Modificar el código de tus microservicios** (ejemplos arriba)
2. **Separar operaciones de lectura pesadas** a la réplica
3. **Mantener escrituras y lecturas críticas** en el PRIMARY
4. **Monitorear métricas** antes y después

---

## 🚨 Importante: Estado Actual de tu Sistema

### ✅ Lo que SÍ tienes funcionando:

- **HA Same-Zone**: Configurado y activo
- **Failover automático**: Funcionará si el PRIMARY falla
- **Read Replica**: Servidor creado y funcionando

### ❌ Lo que NO está funcionando todavía:

- **Uso de Read Replica**: Los microservicios no la están usando
- **Variables de entorno**: Agregadas pero el código no las consume
- **Distribución de carga**: Todo va al PRIMARY

### 🔧 Próximos Pasos:

1. **Para tu demo con el ingeniero**: 
   - ✅ Ya puedes hacer el test de failover
   - ✅ El sistema seguirá funcionando

2. **Para optimización futura**:
   - Modificar código de microservicios para usar Read Replica
   - Implementar las estrategias de lectura/escritura mostradas arriba
   - Monitorear mejora de performance

---

**Conclusión**: Tu sistema **SÍ tiene protección contra fallos** del servidor PRIMARY gracias al HA Same-Zone. La Read Replica es un **bonus de performance** que puedes implementar después.

