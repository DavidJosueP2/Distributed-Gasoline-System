import { Module } from '@nestjs/common';
import { VehiclesGrpcModule } from './presentation/modules/vehicles-grpc.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
        VehiclesGrpcModule,
    ],
})
export class AppModule {}
