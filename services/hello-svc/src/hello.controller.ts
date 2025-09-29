import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { HelloService } from './hello.service';
import {CreateHelloDto} from "./dto/create-hello.dto";
import {UpdateHelloDto} from "./dto/update-hello.dto";


@Controller()
export class HelloController {
    constructor(private readonly service: HelloService) {}

    @GrpcMethod('HelloService', 'GetHello')
    getHello(data: { id: string }) {
        return this.service.getOne(data.id);
    }

    @GrpcMethod('HelloService', 'GetAllHellos')
    getAll() {
        return { items: this.service.getAll() };
    }

    @GrpcMethod('HelloService', 'CreateHello')
    createHello(data: CreateHelloDto) {
        return this.service.create(data);
    }

    @GrpcMethod('HelloService', 'UpdateHello')
    updateHello(data: UpdateHelloDto) {
        return this.service.update(data.id, data);
    }

    @GrpcMethod('HelloService', 'DeleteHello')
    deleteHello(data: { id: string }) {
        return this.service.delete(data.id);
    }
}
