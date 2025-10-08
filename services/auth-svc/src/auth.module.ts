import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
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
      url: process.env.AUTH_DATABASE_URL || undefined,
      host: process.env.AUTH_DB_HOST || process.env.POSTGRES_HOST,
      port: process.env.AUTH_DB_PORT
        ? parseInt(process.env.AUTH_DB_PORT, 10)
        : process.env.POSTGRES_PORT
        ? parseInt(process.env.POSTGRES_PORT, 10)
        : 5432,
      username: process.env.AUTH_DB_USER || process.env.POSTGRES_USER,
      password: process.env.AUTH_DB_PASS || process.env.POSTGRES_PASSWORD,
      database:
        process.env.AUTH_DB_NAME ||
        process.env.AUTH_DB ||
        process.env.POSTGRES_DB ||
        'auth',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // solo para desarrollo
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
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
