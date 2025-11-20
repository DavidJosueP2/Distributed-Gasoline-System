import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import { AuthController } from './auth.controller';
import { DiscoveryModule } from './discovery/discovery.module';
import { RolesGuard } from './common/auth/guards/jwt.roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationToken } from './entities/verification-token.entity';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    // Prefer a full DATABASE URL if provided (works well with docker-compose and local mapped ports)
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.AUTH_DB_HOST || process.env.DB_HOST,
      port: process.env.AUTH_DB_PORT ? Number.parseInt(process.env.AUTH_DB_PORT, 10) : 5432,
      username: process.env.AUTH_DB_USER || process.env.DB_USERNAME,
      password: process.env.AUTH_DB_PASS || process.env.DB_PASSWORD,
      database: process.env.AUTH_DB_NAME || process.env.AUTH_DB || process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.DB_SYNCHRONIZE === 'true' || false,
      // SSL Configuration for Azure PostgreSQL
      ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL_MODE === 'require'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false,
    }),
    JwtModule.registerAsync({
      useFactory: (): JwtModuleOptions => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN as any },
      }),
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
