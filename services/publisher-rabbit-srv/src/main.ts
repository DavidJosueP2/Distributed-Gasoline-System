import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join, resolve, isAbsolute } from 'path';
import { AppModule } from './app.module';
import { registerInEureka } from './discovery/eureka-register';

function protoDir() {
  const configured = process.env.PROTO_ROOT || process.env.PROTOS_DIR;
  if (configured) {
    return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  }
  return resolve(__dirname, '..', '..', '..', 'protos');
}

async function bootstrap() {
  const port = Number(process.env.PUBLISHER_GRPC_PORT || process.env.GRPC_PORT || 50090);
  const bindHost = process.env.SERVICE_BIND_HOST || process.env.BIND_HOST || '0.0.0.0';

  
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log', 'debug'] });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'logger',
  protoPath: join(protoDir(), 'logs.proto'),
      url: `${bindHost}:${port}`,
    },
  });

  const eureka = registerInEureka();

  await app.startAllMicroservices();
  await app.listen(Number(process.env.PUBLISHER_HTTP_PORT || port + 1000), bindHost);
  console.log(`[PUBLISHER] gRPC on ${bindHost}:${port}`);

  const stop = async () => {
    try { await app.close(); } catch {}
    try { (eureka as any)?.stop?.(); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

bootstrap();
