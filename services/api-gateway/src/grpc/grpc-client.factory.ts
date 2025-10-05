import { Injectable } from '@nestjs/common';
import {
  ClientGrpc,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { join } from 'path';
import { EurekaService } from '../discovery/eureka.service';
import { RoundRobin } from '../discovery/lb.strategy';

function resolveHost(inst: any) {
  return inst?.ipAddr || inst?.hostName || 'localhost';
}

function portOf(p: any): number | undefined {
  if (typeof p === 'number') return p;
  if (p && typeof p.$ === 'number') return p.$;
  return undefined;
}
function resolvePort(inst: any): number {
  const p = portOf(inst?.port) ?? portOf(inst?.securePort);
  if (typeof p !== 'number') throw new Error('Eureka instance without port');
  return p;
}

@Injectable()
export class GrpcClientFactory {
  private readonly waitTimeoutMs = Number(
    process.env.EUREKA_WAIT_TIMEOUT_MS ?? 10000,
  );
  private readonly protosDir =
    process.env.PROTO_ROOT || join(process.cwd(), 'protos');

  constructor(
    private readonly eureka: EurekaService,
    private readonly rr: RoundRobin,
  ) { }

  private async waitForInstances(appName: string): Promise<any[]> {
    if (typeof (this.eureka as any).waitForInstances === 'function') {
      return (this.eureka as any).waitForInstances(appName, this.waitTimeoutMs);
    }
    const end = Date.now() + this.waitTimeoutMs;
    let delay = 250;
    while (Date.now() < end) {
      const list = this.eureka.getInstances(appName);
      if (list?.length) return list as any[];
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 150, 1000);
      try {
        await (this.eureka as any).client?.fetchRegistry?.();
      } catch { }
    }
    return [];
  }

  private build(url: string, pkg: string, proto: string): ClientGrpc {
    return ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        url,
        package: pkg,
        protoPath: join(this.protosDir, proto),
      },
    }) as unknown as ClientGrpc;
  }

  async forService(
    appName: string,
    pkg: string,
    protoFile: string,
  ): Promise<ClientGrpc> {
    const list = await this.waitForInstances(appName.toUpperCase());
    const inst = this.rr.pick<any>(appName.toUpperCase(), list);
    if (!inst) throw new Error(`${appName} without instances`);
    const url = `${resolveHost(inst)}:${resolvePort(inst)}`;
    return ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: {
        url,
        package: pkg,
        protoPath: join(this.protosDir, protoFile),
      },
    }) as unknown as ClientGrpc;
  }
}
