import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EurekaService } from './eureka.service';
import { RoundRobin } from './lb.strategy';
import { ServiceLocatorProvider } from './discovery.providers';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '../../.env'],
        }),
    ],
    providers: [EurekaService, RoundRobin, ServiceLocatorProvider],
    exports: [EurekaService, RoundRobin, ServiceLocatorProvider],
})
export class DiscoveryModule {}
