// src/infra/grpc/grpc-client.factory.ts
import { Injectable } from '@nestjs/common';
import {
  ClientGrpc,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { join } from 'path';
import { EurekaDiscovery } from '../discovery/eureka.service';
import { RoundRobin } from '../discovery/rr.strategy';

function hostOf(inst: any) {
  return inst?.ipAddr || inst?.hostName || 'localhost';
}

function portOf(p: any) {
  return typeof p === 'number'
    ? p
    : p && typeof p.$ === 'number'
      ? p.$
      : undefined;
}

function resolvePort(inst: any) {
  const p = portOf(inst?.port) ?? portOf(inst?.securePort);
  if (typeof p !== 'number') throw new Error('Eureka instance without port');
  return p;
}

@Injectable()
export class GrpcClientFactory {
  private waitMs = Number(process.env.EUREKA_WAIT_TIMEOUT_MS || 10000);
  private protosDir = process.env.PROTOS_DIR || './protos';
  
  constructor(
    private readonly eureka: EurekaDiscovery,
    private readonly rr: RoundRobin,
  ) { }

  private async pick(appName: string) {
    const end = Date.now() + this.waitMs;
    while (Date.now() < end) {
      const list = this.eureka.getInstances(appName.toUpperCase());
      if (list?.length) return this.rr.pick(appName, list);
      await new Promise((r) => setTimeout(r, 300));
      try {
        await (this.eureka.client as any).fetchRegistry?.();
      } catch { }
    }
    throw new Error(`${appName} without instances`);
  }

  async clientFor(
    appName: string,
    pkg: string,
    proto: string,
  ): Promise<ClientGrpc> {
    const inst = await this.pick(appName);
    const url = `${hostOf(inst)}:${resolvePort(inst)}`;
    return ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: { 
        url, 
        package: pkg, 
        protoPath: join(this.protosDir, proto),
        loader: {
          longs: Number,      // Convertir int64 a Number
          enums: String,      // Usar strings para enums
          defaults: true,     // Usar valores por defecto
          arrays: true,       // Soportar arrays
          objects: true,      // Soportar objetos
          oneofs: true,       // Soportar oneofs
          keepCase: false,    // Transformar snake_case a camelCase
        },
      },
    }) as unknown as ClientGrpc;
  }
}
