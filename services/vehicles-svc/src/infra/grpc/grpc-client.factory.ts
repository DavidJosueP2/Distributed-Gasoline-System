import { Injectable } from '@nestjs/common';
import { ClientGrpc, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { EurekaDiscovery } from '../discovery/eureka.service';
import { RoundRobin } from '../discovery/rr.strategy';

function hostOf(inst: any): string {
  return inst.ipAddr || inst.hostName || '127.0.0.1';
}

function resolvePort(inst: any): number {
  const p = inst.port?.$ || inst.port || 50058;
  return Number(p);
}

@Injectable()
export class GrpcClientFactory {
  private readonly protosDir =
    process.env.PROTO_ROOT ||
    process.env.PROTOS_DIR ||
    join(process.cwd(), 'protos');

  constructor(
    private readonly eureka: EurekaDiscovery,
    private readonly rr: RoundRobin,
  ) {}

  private build(address: string, pkg: string, proto: string): ClientGrpc {
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
  ): Promise<ClientGrpc> {
    const instances = this.eureka.getInstances(appName.toUpperCase());
    if (!instances || instances.length === 0) {
      throw new Error(`No instances found for ${appName}`);
    }
    const instance = this.rr.pick(appName, instances);
    const address = `${hostOf(instance)}:${resolvePort(instance)}`;
    return this.build(address, pkg, proto);
  }
}

