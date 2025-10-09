import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { Logger } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggerController } from './logger.controller';
import { LogsRabbitConsumer } from './rabbitmq/logs-rabbit.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
    }),
    ElasticsearchModule.registerAsync({
      useFactory: () => {
        const logger = new Logger('ElasticsearchConfig');
        const compatibilityVersion = (() => {
          const raw = process.env.ELASTICSEARCH_COMPATIBILITY_VERSION;
          if (raw === '7' || raw === '8') return raw;
          if (raw && raw !== '7' && raw !== '8') {
            logger.warn(
              `Unsupported ELASTICSEARCH_COMPATIBILITY_VERSION="${raw}". Falling back to 8.`,
            );
          }
          return '8';
        })();

        const headers = {
          accept: `application/vnd.elasticsearch+json; compatible-with=${compatibilityVersion}`,
          'content-type': `application/vnd.elasticsearch+json; compatible-with=${compatibilityVersion}`,
        } as const;

        return {
          node: process.env.ELASTICSEARCH_URL,
          headers,
        };
      },
    }),
  ],
  controllers: [LoggerController],
  providers: [LoggerService, LogsRabbitConsumer],
})
export class LoggerModule {}
