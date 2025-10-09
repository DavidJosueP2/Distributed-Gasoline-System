import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseTypesService } from './license-types.service';
import { LicenseTypesController } from './license-types.controller';
import { LicenseTypesGrpcController } from './license-types.grpc.controller';
import { LicenseTypesHttpController } from './license-types.http.controller';
import { LicenseType } from './entities/license-type.entity';
import { LicenseInclude } from './entities/license-include.entity';
import { DiscoveryModule } from '../discovery/discovery.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LicenseType, LicenseInclude]), // 👈 ESTA LÍNEA ES CLAVE
    DiscoveryModule,
  ],
  controllers: [LicenseTypesController, LicenseTypesGrpcController, LicenseTypesHttpController],
  providers: [LicenseTypesService],
  exports: [LicenseTypesService],
})
export class LicenseTypesModule {}
