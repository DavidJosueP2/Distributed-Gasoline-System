import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';
import { HelloService } from './hello.service';
import {GrpcClientFactory} from "./grpc/grpc-client.factory";
import {DiscoveryModule} from "./discovery/discovery.module";

@Module({
    imports: [DiscoveryModule],
    controllers: [HelloController],
    providers: [HelloService, GrpcClientFactory],
    exports: [GrpcClientFactory],
})
export class HelloModule {}
