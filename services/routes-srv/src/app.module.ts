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
          host: configService.get('ROUTES_DB_HOST') || configService.get('DB_HOST', 'localhost'),
          port: configService.get('ROUTES_DB_PORT') || configService.get('DB_PORT', 5500),
          username: configService.get('ROUTES_DB_USER') || configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('ROUTES_DB_PASS') || configService.get('DB_PASSWORD', 'admin'),
          database: configService.get('ROUTES_DB_NAME') || configService.get('DB_NAME', 'routes'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('ROUTES_DB_SYNCHRONIZE') === 'true' || false,
          logging: configService.get('ROUTES_DB_LOGGING') === 'true' || configService.get('NODE_ENV') === 'development',
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
