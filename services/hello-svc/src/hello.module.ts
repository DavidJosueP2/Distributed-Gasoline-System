import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';
import { HelloService } from './hello.service';
import {GrpcClientFactory} from "./grpc/grpc-client.factory";
import {DiscoveryModule} from "./discovery/discovery.module";
import { HelloRabbitConsumer } from './rabbitmq/hello-rabbit.consumer';

@Module({
    imports: [DiscoveryModule],
    controllers: [HelloController],
    providers: [HelloService, GrpcClientFactory, HelloRabbitConsumer],
    exports: [GrpcClientFactory],
})
export class HelloModule {}
