import { Module } from '@nestjs/common';
import { VehiclesGrpcModule } from './presentation/modules/vehicles-grpc.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule.forRoot({ 
            isGlobal: true, 
            envFilePath: ['.env', '../../.env'] // Busca primero en el hijo, luego en el padre
        }),
        VehiclesGrpcModule,
    ],
})
export class AppModule {}
