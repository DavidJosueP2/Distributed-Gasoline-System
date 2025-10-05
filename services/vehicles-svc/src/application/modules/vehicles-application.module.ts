import { Module } from '@nestjs/common';
import { VehiclesInfraModule } from '../../infra/modules/vehicles-infra.module';
import { TransactionManager } from '../../db/prisma/transaction.manager';
import { VehicleModelService } from '../services/vehicle-model.service';
import { VehicleUnitService } from '../services/vehicle-unit.service';
import {PrismaModule} from "../../db/prisma/prisma.module";

@Module({
    imports: [
        PrismaModule,
        VehiclesInfraModule,
    ],
    providers: [
        TransactionManager,
        VehicleModelService,
        VehicleUnitService,
    ],
    exports: [
        VehicleModelService,
        VehicleUnitService,
    ],
})
export class VehiclesApplicationModule {}
