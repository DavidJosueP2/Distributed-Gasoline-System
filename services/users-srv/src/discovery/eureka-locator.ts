import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EurekaDiscovery } from './eureka.service';
import { RoundRobin } from './rr.strategy';
import {
  ServiceEndpoint,
  ServiceLocator,
  ServiceTarget,
} from './service-locator';

@Injectable()
export class EurekaLocator implements ServiceLocator {
  private readonly waitTimeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly eureka: EurekaDiscovery,
    private readonly rr: RoundRobin,
  ) {
    this.waitTimeoutMs = Number(
      this.config.get('EUREKA_WAIT_TIMEOUT_MS') ??
        process.env.EUREKA_WAIT_TIMEOUT_MS ??
        10000,
    );
  }

  private async waitForInstances(appId: string): Promise<any[]> {
    if (typeof (this.eureka as any).waitForInstances === 'function') {
      return (this.eureka as any).waitForInstances(appId, this.waitTimeoutMs);
    }
    const end = Date.now() + this.waitTimeoutMs;
    while (Date.now() < end) {
      const list = this.eureka.getInstances(appId);
      if (list?.length) return list as any[];
      await new Promise((resolve) => setTimeout(resolve, 400));
      try {
        await (this.eureka as any).client?.fetchRegistry?.();
      } catch {}
    }
    return [];
  }

  private resolvePort(instance: any): number {
    const port = this.extractPort(instance?.port) ?? this.extractPort(instance?.securePort);
    if (typeof port !== 'number') {
      throw new Error(
        `Eureka instance without port for ${instance?.app || 'unknown app'}`,
      );
    }
    return port;
  }

  private extractPort(port: any): number | undefined {
    if (typeof port === 'number') return port;
    if (port && typeof port.$ === 'number') return port.$;
    return undefined;
  }

  private resolveHost(instance: any): string {
    return instance?.ipAddr || instance?.hostName || 'localhost';
  }

  async pick(target: ServiceTarget): Promise<ServiceEndpoint> {
    const appId = target.appName?.toUpperCase();
    const list = await this.waitForInstances(appId);
    const picked = this.rr.pick<any>(appId, list);
    if (!picked) {
      throw new Error(`No instances registered for ${target.appName}`);
    }
    const host = this.resolveHost(picked);
    const port = this.resolvePort(picked);
    return new ServiceEndpoint(host, port, {
      source: 'eureka',
      appId,
    });
  }
}
