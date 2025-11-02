import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublisherModule } from './publisher/publisher.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../../.env'],
    }),
    PublisherModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
