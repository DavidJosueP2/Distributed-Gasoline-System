import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Eureka } from 'eureka-js-client';
import type { EurekaClient } from 'eureka-js-client';

@Injectable()
export class EurekaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Eureka;

  constructor(private readonly config: ConfigService) {
    const base = (this.config.get('EUREKA_BASE_PATH') ?? '/eureka').replace(
      /\/$/,
      '',
    );
    const host = this.config.get('EUREKA_HOST') || 'localhost'; // en docker: 'eureka'
    const port = Number(this.config.get('EUREKA_PORT', 8761));

    this.client = new Eureka({
      instance: {
        app: 'API-GATEWAY-LOOKUP',
        instanceId: `API-GATEWAY-LOOKUP:${process.env.HOSTNAME || 'lookup'}`,
        hostName: process.env.HOSTNAME || 'lookup',
        ipAddr: process.env.HOSTNAME || 'lookup',
        port: { $: 0, '@enabled': false },
        vipAddress: 'API-GATEWAY-LOOKUP',
        dataCenterInfo: {
          '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
          name: 'MyOwn',
        },
      },
      eureka: {
        host,
        port,
        servicePath: `${base}/apps/`,
        fetchRegistry: true,
        registerWithEureka: false,
      },
    });
  }

  onModuleInit() {
    this.client.start();
  }
  onModuleDestroy() {
    this.client.stop();
  }

  getInstances(appId: string): EurekaClient.EurekaInstanceConfig[] {
    return (
      (this.client.getInstancesByAppId((appId || '').toUpperCase()) as any) ||
      []
    );
  }

  async waitForInstances(
    appId: string,
    timeoutMs = 5000,
  ): Promise<EurekaClient.EurekaInstanceConfig[]> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const list = this.getInstances(appId);
      if (list.length > 0) return list;
      await new Promise((r) => setTimeout(r, 400));
      try {
        await (this.client as any).fetchRegistry();
      } catch (err: any) {
        console.warn('[eureka] fetchRegistry failed:', err?.message);
      }
    }
    return [];
  }
}
