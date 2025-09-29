import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { v4 as uuid } from 'uuid';
import { CreateHelloDto } from './dto/create-hello.dto';
import { UpdateHelloDto } from './dto/update-hello.dto';
import { HelloEntity } from './types/hello.types';

@Injectable()
export class HelloService {
    private hellos: HelloEntity[] = [];

    private notFound() {
        throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'El usuario no fue encontrado' });
    }

    getOne(id: string): HelloEntity {
        const h = this.hellos.find(x => x.id === id);
        if (!h) this.notFound();
        return h!;
    }

    getAll(): HelloEntity[] {
        return this.hellos;
    }

    create(dto: CreateHelloDto): HelloEntity {
        const h: HelloEntity = { id: uuid(), ...dto };
        this.hellos.push(h);
        return h;
    }

    update(id: string, dto: UpdateHelloDto): HelloEntity {
        const i = this.hellos.findIndex(x => x.id === id);
        if (i < 0) this.notFound();
        this.hellos[i] = { ...this.hellos[i], ...dto };
        return this.hellos[i];
    }

    delete(id: string): { success: boolean } {
        const i = this.hellos.findIndex(x => x.id === id);
        if (i < 0) this.notFound();
        this.hellos.splice(i, 1);
        return { success: true };
    }
}
