import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Eureka } from 'eureka-js-client';

// Descubre servicios.
@Injectable()
export class EurekaDiscovery implements OnModuleInit, OnModuleDestroy {
  client: Eureka;
  constructor() {
    const base = (process.env.EUREKA_BASE_PATH || '/eureka').replace(/\/$/, '');
    this.client = new Eureka({
      // Usado solo para cumplir con el esquema de la configuracion.
      instance: {
        app: `${process.env.APP_NAME || 'LOOKUP'}`,
        instanceId: `${process.env.APP_NAME || 'LOOKUP'}:${process.env.REGISTER_HOST || 'lookup'}`,
        hostName: process.env.REGISTER_HOST || 'lookup',
        ipAddr: process.env.REGISTER_HOST || 'lookup',
        port: { $: 0, '@enabled': false },
        vipAddress: process.env.APP_NAME || 'LOOKUP',
        dataCenterInfo: {
          '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
          name: 'MyOwn',
        },
      },
      eureka: {
        host: process.env.EUREKA_HOST || 'localhost',
        port: Number(process.env.EUREKA_PORT || 8761),
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

  // Nombre de un servicio
  getInstances(appId: string) {
    return (
      (this.client.getInstancesByAppId((appId || '').toUpperCase()) as any) ||
      []
    );
  }
}
