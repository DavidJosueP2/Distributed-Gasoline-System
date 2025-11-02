// grpc/grpc-client.factory.ts
import { Inject, Injectable } from '@nestjs/common';
import {
  ClientGrpc,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { join } from 'path';
import { SERVICE_LOCATOR_TOKEN } from '../discovery/discovery.providers';
import type {
  ServiceLocator,
  ServiceTarget,
} from '../discovery/service-locator';

@Injectable()
export class GrpcClientFactory {
  private readonly protosDir =
    process.env.PROTOS_DIR ||
    process.env.PROTO_ROOT ||
    join(process.cwd(), 'protos');

  constructor(
    @Inject(SERVICE_LOCATOR_TOKEN) private readonly locator: ServiceLocator,
  ) {}

  private createClient(address: string, pkg: string, proto: string): ClientGrpc {
    return ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        url: address,
        package: pkg,
        protoPath: join(this.protosDir, proto),
      },
    }) as unknown as ClientGrpc;
  }

  async clientFor(
    appName: string,
    pkg: string,
    proto: string,
    options: Partial<ServiceTarget> = {},
  ): Promise<ClientGrpc> {
    const endpoint = await this.locator.pick({ appName, ...options });
    return this.createClient(endpoint.toString(), pkg, proto);
  }
}
