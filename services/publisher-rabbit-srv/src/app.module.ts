import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublisherModule } from './publisher/publisher.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../../.env'],
    }),
    PublisherModule,
  ],
})
export class AppModule {}
