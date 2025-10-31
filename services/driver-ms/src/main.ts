import 'reflect-metadata'; 
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { registerInEureka } from './discovery/eureka-register';
import { getEurekaConfig, validateEurekaConfig } from './utils/eureka-helper';

// ✅ Define un módulo raíz que cargue las variables desde ../../../.env
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../../.env'], // .env dos directorios atrás
    }),
    AppModule,
  ],
})
class RootModule {}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // ✅ Configuración centralizada de puertos y hosts
  const GRPC_PORT = Number(process.env.DRIVER_GRPC_PORT || 50052);
  const HTTP_PORT = Number(process.env.DRIVER_HTTP_PORT || 3001);
  const BIND_HOST = process.env.SERVICE_BIND_HOST || '0.0.0.0';
  const PROTO_ROOT = process.env.PROTO_ROOT || '../../protos'; // Ruta relativa desde la carpeta dist
  const SHOULD_REGISTER =
    (process.env.DISCOVERY_MODE || '').toLowerCase() === 'eureka' ||
    (process.env.EUREKA_ENABLED || '').toLowerCase() === 'true';


    logger.log(`Starting Driver Service...`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    // Create HTTP app
    const httpApp = await NestFactory.create(RootModule);
    httpApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

     const isDevelopment = process.env.NODE_ENV !== 'production';
    const protoPath = isDevelopment
      ? join(process.cwd(), PROTO_ROOT, 'driver_ms.proto')
      : join(__dirname, '..', PROTO_ROOT, 'driver_ms.proto');
    
    logger.log(`Using proto file: ${protoPath}`);
    logger.log(`.env loaded from: ../../../.env`);

    // Create gRPC microservice
    const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      RootModule,
      {
        transport: Transport.GRPC,
        options: {
          package: ['driverms.v1'],  // Usar un arreglo para soportar múltiples paquetes
          protoPath: protoPath,
          url: `${BIND_HOST}:${GRPC_PORT}`,
          loader: {
            longs: Number,     // Convertir int64 a Number en JavaScript
            enums: String,     // Usar strings para enums
            defaults: true,    // Usar valores predeterminados para campos faltantes
            oneofs: true,      // Manejar oneofs
            includeDirs: [process.env.NODE_ENV !== 'production' 
              ? join(process.cwd(), PROTO_ROOT) 
              : join(__dirname, '..', PROTO_ROOT)], // Ruta adecuada según el entorno
          },
          keepalive: {
            keepaliveTimeMs: 120000,
            keepaliveTimeoutMs: 20000,
            keepalivePermitWithoutCalls: 1,
          }
        },
      },
    );

    // ✅ Registro en Eureka mejorado
    let eurekaClient: { stop: () => void; } | undefined = undefined;
    if (validateEurekaConfig()) {
      try {
        const { serviceUrl } = getEurekaConfig();
        logger.log(`Attempting Eureka registration at: ${serviceUrl}`);
        
        eurekaClient = SHOULD_REGISTER ? registerInEureka() : undefined
        logger.log('Eureka registration initiated');
      } catch (eurekaError) {
        logger.warn('Eureka registration failed, continuing without service discovery');
        logger.debug('Eureka error details:', eurekaError?.message || 'Unknown error');
      }
    } else {
      logger.warn('Eureka configuration incomplete, skipping service discovery');
    }

    // ✅ Inicio de servicios con manejo de errores individual
    try {
      await grpcApp.listen();
      logger.log(`gRPC server successfully started on ${BIND_HOST}:${GRPC_PORT}`);
    } catch (grpcError) {
      logger.error(`Failed to start gRPC server: ${grpcError.message}`);
      throw grpcError;
    }

    try {
      await httpApp.listen(HTTP_PORT);
      logger.log(`HTTP server successfully started on ${BIND_HOST}:${HTTP_PORT}`);
    } catch (httpError) {
      logger.error(`Failed to start HTTP server: ${httpError.message}`);
      throw httpError;
    }

    // ✅ Log final de estado
    logger.log(`🚀 Driver Service successfully started`);
    logger.log(`   gRPC: ${BIND_HOST}:${GRPC_PORT}`);
    logger.log(`   HTTP: ${BIND_HOST}:${HTTP_PORT}`);
    logger.log(`   Proto: ${protoPath}`);
    logger.log(`   Eureka: ${eurekaClient ? 'Registered' : 'Disabled'}`);

    // ✅ Manejo mejorado de shutdown
    const stop = async (signal: string) => {
      logger.log(`\nReceived ${signal}, initiating graceful shutdown...`);
      
      const shutdownPromises: Promise<void>[] = [];

      // Detener Eureka client
      if (eurekaClient) {
        shutdownPromises.push(
          (async () => {
            try {
              // Verificar que eurekaClient tenga el método stop
              if (typeof eurekaClient.stop === 'function') {
                eurekaClient.stop();
                logger.log('✓ Eureka client deregistered');
              } else {
                logger.warn('⚠️ Eureka client stop method not available');
              }
            } catch (eurekaError: any) {
              logger.error('✗ Error stopping Eureka client:', eurekaError?.message || 'Unknown error');
            }
          })()
        );
      }

      // Cerrar gRPC server
      shutdownPromises.push(
        (async () => {
          try {
            await grpcApp.close();
            logger.log('✓ gRPC server closed');
          } catch (grpcError: any) {
            logger.error('✗ Error closing gRPC server:', grpcError?.message || 'Unknown error');
          }
        })()
      );

      // Cerrar HTTP server
      shutdownPromises.push(
        (async () => {
          try {
            await httpApp.close();
            logger.log('✓ HTTP server closed');
          } catch (httpError: any) {
            logger.error('✗ Error closing HTTP server:', httpError?.message || 'Unknown error');
          }
        })()
      );

      // Esperar a que todas las operaciones de shutdown terminen
      await Promise.allSettled(shutdownPromises);
      
      logger.log('👋 Driver Service shutdown completed');
      process.exit(0);
    };

    // Limpiar handlers existentes para evitar duplicados
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      // Eliminar todos los listeners existentes para estos signals
      process.removeAllListeners(signal);
      
      // Registrar nuestro handler de shutdown
      process.on(signal, () => stop(signal));
    });

    // Manejar unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception thrown:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
}

bootstrap();