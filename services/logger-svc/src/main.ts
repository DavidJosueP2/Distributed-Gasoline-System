import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from './looger.module';

async function bootstrap() {
  const app = await NestFactory.create(LoggerModule, { logger: ['error', 'warn', 'log', 'debug'] });
  const configService = app.get(ConfigService);
  const httpPort = configService.get<number>('LOGGER_HTTP_PORT') ?? 3200;
  const bindHost = configService.get<string>('SERVICE_BIND_HOST') ?? '0.0.0.0';

  await app.listen(httpPort, bindHost);
  console.log(`🚀 Logger service running on port ${httpPort}`);
}

bootstrap();
