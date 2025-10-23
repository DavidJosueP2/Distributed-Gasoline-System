import { Injectable } from '@nestjs/common';
import { ClientGrpc, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { RoundRobin } from '../discovery/rr.strategy';
import { EurekaDiscovery } from '../discovery/eureka.service';

function hostOf(inst: any) {
  return inst?.ipAddr || inst?.hostName || 'localhost';
}
function portOf(p: any) {
  return typeof p === 'number' ? p : p && typeof p.$ === 'number' ? p.$ : undefined;
}
function resolvePort(inst: any) {
  const p = portOf(inst?.port) ?? portOf(inst?.securePort);
  if (typeof p !== 'number') throw new Error('Eureka instance without port');
  return p;
}

@Injectable()
export class GrpcClientFactory {
  private waitMs = Number(process.env.EUREKA_WAIT_TIMEOUT_MS || 10000);
  private protosDir = process.env.PROTO_ROOT || process.env.PROTOS_DIR || '../../protos';
  constructor(private readonly rr: RoundRobin, private readonly discovery: EurekaDiscovery) {}

  private async pick(appName: string) {
    const end = Date.now() + this.waitMs;
    while (Date.now() < end) {
      const list = this.discovery?.getInstances(appName.toUpperCase()) || [];
      if (list?.length) return this.rr.pick(appName, list);
      await new Promise((r) => setTimeout(r, 300));
      try {
        // Usar el método público fetchRegistry en lugar de acceder a la propiedad privada client
        await this.discovery?.fetchRegistry();
      } catch {}
    }
    throw new Error(`${appName} without instances`);
  }

  async clientFor(appName: string, pkg: string, proto: string): Promise<ClientGrpc> {
    const inst = await this.pick(appName);
    const url = `${hostOf(inst)}:${resolvePort(inst)}`;
    return ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: { url, package: pkg, protoPath: join(this.protosDir, proto) },
    }) as unknown as ClientGrpc;
  }
}
