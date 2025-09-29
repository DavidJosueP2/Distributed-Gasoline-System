import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EurekaService } from './eureka.service';
import { RoundRobin } from './lb.strategy';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [
                '.env',
                '../../.env',
            ],
            ignoreEnvFile: false,
        }),
    ],
    providers: [EurekaService, RoundRobin],
    exports:   [EurekaService, RoundRobin],
})
export class DiscoveryModule {}
