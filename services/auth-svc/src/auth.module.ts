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
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
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
