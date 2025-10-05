import { Module } from '@nestjs/common';
import { VehiclesApplicationModule } from '../../application/modules/vehicles-application.module';
import { VehicleModelsController } from '../grpc/vehicle-models.controller';
import { VehicleUnitsController } from '../grpc/vehicle-units.controller';

@Module({
    imports: [VehiclesApplicationModule],
    controllers: [VehicleModelsController, VehicleUnitsController],
})
export class VehiclesGrpcModule {}
