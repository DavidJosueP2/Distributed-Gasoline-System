import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DriversModule } from './drivers/drivers.module';
import { getTypeOrmConfig } from './config/typeorm.config';
import { validate } from './config/env.validation';
import { LicenseTypesModule } from './license-types/license-types.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { DriverLicensesModule } from './driver-licenses/driver-licenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`, // Intenta primero con el archivo específico del entorno
        '.env', // Si no existe, usa el archivo .env principal
        '../../.env', // También busca en la raíz del proyecto
      ],
      validate, // 👈 Agrega validación
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getTypeOrmConfig,
      inject: [ConfigService],
    }),
  DriversModule,
  LicenseTypesModule,
  DiscoveryModule,
  DriverLicensesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
