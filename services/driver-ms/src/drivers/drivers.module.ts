import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { DriversGrpcController } from './drivers.grpc.controller';
import { DriversHttpController } from './drivers.http.controller';
import { DriverTransformService } from './driver-transform.service';
import { Driver } from './entities/driver.entity';
import { DriverLicense } from './entities/driver-license.entity';
import { LicenseTypesModule } from '../license-types/license-types.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { UsersGrpcClient } from './users-grpc.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, DriverLicense]),
    LicenseTypesModule,
    DiscoveryModule,
  ],
  controllers: [
    DriversController,
    DriversGrpcController,
    DriversHttpController,
  ],
  providers: [DriversService, DriverTransformService, UsersGrpcClient],
  exports: [DriversService],
})
export class DriversModule {}
