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
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.AUTH_DB,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // solo para desarrollo
    }),
    TypeOrmModule.forFeature([VerificationToken]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
    }),
    DiscoveryModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GrpcClientFactory, {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },],
})
export class AuthModule { }
