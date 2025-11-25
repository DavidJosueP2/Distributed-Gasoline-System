import { Module } from '@nestjs/common';
import { RoutesGrpcModule } from './presentation/modules/routes-grpc.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // SSL Configuration para Azure PostgreSQL
        const sslEnabled = configService.get<string>('DB_SSL') === 'true' ||
                           configService.get<string>('DB_SSL_MODE') === 'require' ||
                           configService.get<string>('ROUTES_DB_SSL_MODE') === 'require';

        const sslRejectUnauthorized = configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';

        return {
          type: 'postgres' as const,
          host: configService.get<string>('ROUTES_DB_HOST') || configService.get<string>('DB_HOST', 'localhost'),
          port: parseInt(configService.get<string>('ROUTES_DB_PORT') || configService.get<string>('DB_PORT', '5500'), 10),
          username: configService.get<string>('ROUTES_DB_USER') || configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('ROUTES_DB_PASS') || configService.get<string>('DB_PASSWORD', 'admin'),
          database: configService.get<string>('ROUTES_DB_NAME') || configService.get<string>('DB_NAME', 'routes'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('ROUTES_DB_SYNCHRONIZE') === 'true' || false,
          logging: configService.get<string>('ROUTES_DB_LOGGING') === 'true' || configService.get<string>('NODE_ENV') === 'development',
          // SSL Configuration (OBLIGATORIO en Azure)
          ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : false,
        };
      },
      inject: [ConfigService],
    }),
    RoutesGrpcModule,
  ],
})
export class AppModule {}
