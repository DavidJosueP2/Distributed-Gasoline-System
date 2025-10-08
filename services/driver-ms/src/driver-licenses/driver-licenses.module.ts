import { Module } from '@nestjs/common';
import { DriverLicensesService } from './driver-licenses.service';
import { DriverLicensesController } from './driver-licenses.http.controller';
import { DriverLicensesGrpcController } from './driver-licenses.grpc.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverLicense } from './entities/driver-license.entity';
import { Driver } from 'src/drivers/entities/driver.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DriverLicense, Driver])],
  controllers: [DriverLicensesController, DriverLicensesGrpcController],
  providers: [DriverLicensesService],
  exports: [DriverLicensesService],
})
export class DriverLicensesModule {}
