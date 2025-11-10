import 'reflect-metadata'; 
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { registerInEureka } from './discovery/eureka-register';

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
  const GRPC_PORT = Number(process.env.DRIVER_GRPC_PORT || 50062);
  const HTTP_PORT = Number(process.env.DRIVER_HTTP_PORT || 3100);
  const BIND_HOST = process.env.SERVICE_BIND_HOST || '0.0.0.0';
  const PROTO_ROOT = process.env.PROTO_ROOT || process.env.PROTOS_DIR || join(__dirname, '../protos');
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

    // Determinar ruta del proto (soporta rutas absolutas y relativas)
    const isAbsolutePath = PROTO_ROOT.startsWith('/');
    const protoDir = isAbsolutePath ? PROTO_ROOT : join(__dirname, '..', PROTO_ROOT);
    const protoPath = join(protoDir, 'driver_ms.proto');
    
    logger.log(`Using proto file: ${protoPath}`);
    logger.log(`Proto directory: ${protoDir}`);

    // Create gRPC microservice
    const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      RootModule,
      {
        transport: Transport.GRPC,
        options: {
          package: ['driverms.v1'],
          protoPath: protoPath,
          url: `${BIND_HOST}:${GRPC_PORT}`,
          loader: {
            longs: Number,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: [protoDir],
          },
          keepalive: {
            keepaliveTimeMs: 120000,
            keepaliveTimeoutMs: 20000,
            keepalivePermitWithoutCalls: 1,
          }
        },
      },
    );

    // ✅ Registro en Eureka simplificado
    let eurekaClient: { stop: () => void; } | undefined = undefined;
    if (SHOULD_REGISTER) {
      try {
        const eurekaHost = process.env.EUREKA_HOST || 'localhost';
        const eurekaPort = process.env.EUREKA_PORT || '8761';
        const basePath = (process.env.EUREKA_BASE_PATH || '/eureka').replace(/\/$/, '');
        logger.log(`Attempting Eureka registration at: http://${eurekaHost}:${eurekaPort}${basePath}/apps`);

        eurekaClient = registerInEureka();
        logger.log('Eureka registration initiated');
      } catch (eurekaError) {
        logger.warn('Eureka registration failed, continuing without service discovery');
        logger.debug('Eureka error details:', eurekaError?.message || 'Unknown error');
      }
    } else {
      logger.log('Eureka registration disabled (DISCOVERY_MODE not set to eureka)');
    }

    // ✅ Inicio de servicios con manejo de errores individual
    try {
      await grpcApp.listen();
      logger.log(`✓ gRPC server started on ${BIND_HOST}:${GRPC_PORT}`);
    } catch (grpcError) {
      logger.error(`Failed to start gRPC server: ${grpcError.message}`);
      throw grpcError;
    }

    try {
      await httpApp.listen(HTTP_PORT);
      logger.log(`✓ HTTP server started on ${BIND_HOST}:${HTTP_PORT}`);
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
              if (typeof eurekaClient.stop === 'function') {
                eurekaClient.stop();
                logger.log('✓ Eureka client deregistered');
              }
            } catch (eurekaError: any) {
              logger.error('✗ Error stopping Eureka client:', eurekaError?.message || 'Unknown error');
            }
          })()
        );
      }

      // Detener servidores
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

      // Esperar todos los shutdowns
      await Promise.all(shutdownPromises);
      logger.log('✓ Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => stop('SIGTERM'));
    process.on('SIGINT', () => stop('SIGINT'));

  } catch (error) {
    logger.error('❌ Bootstrap failed:');
    logger.error(error);
    process.exit(1);
  }
}

bootstrap();