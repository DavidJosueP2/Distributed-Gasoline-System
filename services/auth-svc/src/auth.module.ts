import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import { AuthController } from './auth.controller';
import { DiscoveryModule } from './discovery/discovery.module';
import { RolesGuard } from './common/auth/guards/jwt.roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationToken } from './entities/verification-token.entity';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // SSL Configuration para Azure PostgreSQL
        const sslEnabled = configService.get<string>('DB_SSL') === 'true' ||
                           configService.get<string>('DB_SSL_MODE') === 'require' ||
                           configService.get<string>('AUTH_DB_SSL_MODE') === 'require';

        const sslRejectUnauthorized = configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';

        return {
          type: 'postgres' as const,
          host: configService.get<string>('AUTH_DB_HOST') || configService.get<string>('DB_HOST', 'localhost'),
          port: parseInt(configService.get<string>('AUTH_DB_PORT', '5432'), 10),
          username: configService.get<string>('AUTH_DB_USER') || configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('AUTH_DB_PASS') || configService.get<string>('DB_PASSWORD', 'admin'),
          database: configService.get<string>('AUTH_DB_NAME') || configService.get<string>('AUTH_DB') || configService.get<string>('DB_NAME', 'auth'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true' || false,
          logging: configService.get<string>('NODE_ENV') === 'development',
          // SSL Configuration (OBLIGATORIO en Azure)
          ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : false,
        };
      },
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h') },
      }),
      inject: [ConfigService],
    }),
    DiscoveryModule,
    // Provide the repository for VerificationToken so AuthService can inject it
    TypeOrmModule.forFeature([VerificationToken]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GrpcClientFactory,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule { }
