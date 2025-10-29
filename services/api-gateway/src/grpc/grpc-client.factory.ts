import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ClientGrpc,
    ClientProxyFactory,
    Transport,
} from '@nestjs/microservices';
import { join } from 'path';
import type { ServiceLocator, ServiceTarget } from '../discovery/service-locator';
import { SERVICE_LOCATOR_TOKEN } from '../discovery/discovery.providers';

@Injectable()
export class GrpcClientFactory {
    private readonly protosDir: string;

    constructor(
        private readonly config: ConfigService,
        @Inject(SERVICE_LOCATOR_TOKEN) private readonly locator: ServiceLocator,
    ) {
        this.protosDir =
            this.config.get<string>('PROTO_ROOT') ??
            this.config.get<string>('PROTOS_DIR') ??
            process.env.PROTO_ROOT ??
            process.env.PROTOS_DIR ??
            join(process.cwd(), 'protos');
    }

    private build(address: string, pkg: string, proto: string): ClientGrpc {
        return ClientProxyFactory.create({
            transport: Transport.GRPC,
            options: {
                url: address,
                package: pkg,
                protoPath: join(this.protosDir, proto),
                loader: {
                    longs: Number,
                    enums: String,
                    defaults: false,
                    oneofs: true,
                },
            },
        }) as unknown as ClientGrpc;
    }

    async forService(
        appName: string,
        pkg: string,
        protoFile: string,
        options: Partial<ServiceTarget> = {},
    ): Promise<ClientGrpc> {
        const target: ServiceTarget = {
            appName,
            ...options,
        };
        const endpoint = await this.locator.pick(target);
        return this.build(endpoint.toString(), pkg, protoFile);
    }
}
