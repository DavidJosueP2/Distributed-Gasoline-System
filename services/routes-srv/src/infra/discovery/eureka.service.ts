// src/infra/discovery/eureka.service.ts
import { Injectable } from '@nestjs/common';
import * as Eureka from 'eureka-js-client';

@Injectable()
export class EurekaDiscovery {
  public client: Eureka.Eureka;

  constructor() {
    const eurekaConfig = {
      instance: {
        app: process.env.ROUTES_APP_NAME || 'ROUTES-SERVICE',
        hostName: process.env.EUREKA_INSTANCE_HOSTNAME || 'localhost',
        ipAddr: process.env.EUREKA_INSTANCE_IP || '127.0.0.1',
        port: {
          $: Number(process.env.ROUTES_GRPC_PORT || 50053),
          '@enabled': true,
        },
        vipAddress: process.env.ROUTES_APP_NAME || 'ROUTES-SERVICE',
        dataCenterInfo: {
          '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
          name: 'MyOwn',
        },
      },
      eureka: {
        host: process.env.EUREKA_HOST || 'localhost',
        port: Number(process.env.EUREKA_PORT || 8761),
        servicePath: '/eureka/apps/',
        maxRetries: 3,
        requestRetryDelay: 2000,
      },
    };

    this.client = new Eureka.Eureka(eurekaConfig);
  }

  getInstances(appName: string): any[] {
    return this.client.getInstancesByAppId(appName);
  }
}
