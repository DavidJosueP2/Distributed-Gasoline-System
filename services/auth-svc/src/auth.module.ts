import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import { AuthController } from './auth.controller';
import { DiscoveryModule } from './discovery/discovery.module';
import { RolesGuard } from './common/auth/guards/jwt.roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DiscoveryModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GrpcClientFactory, {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },],
})
export class AuthModule { }
