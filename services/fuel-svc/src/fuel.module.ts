import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { FuelController } from './fuel.controller';
import { FuelService } from './fuel.service';
import { DiscoveryModule } from './discovery/discovery.module';
import { GrpcClientFactory } from './grpc/grpc-client.factory';
import { RolesGuard } from './common/auth/guards/jwt.roles.guard';
import { FuelRecord } from './entities/fuel-record.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.FUEL_DB_HOST,
      port: process.env.FUEL_DB_PORT ? Number.parseInt(process.env.FUEL_DB_PORT, 10) : 5437,
      username: process.env.FUEL_DB_USER,
      password: process.env.FUEL_DB_PASS,
      database: process.env.FUEL_DB,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    JwtModule.registerAsync({
      useFactory: (): JwtModuleOptions => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN as any },
      }),
    }),
    DiscoveryModule,
    TypeOrmModule.forFeature([FuelRecord]),
  ],
  controllers: [FuelController],
  providers: [
    FuelService,
    GrpcClientFactory,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule { }
