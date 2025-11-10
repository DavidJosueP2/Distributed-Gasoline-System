import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { getEurekaConfig, normalizeBasePath } from '../utils/eureka-helper';
import { Eureka } from 'eureka-js-client';

@Injectable()
export class EurekaDiscovery implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EurekaDiscovery.name);
  private client: Eureka;

  constructor() {
    const {
      host: eurekaHost,
      port: eurekaPort,
      basePath: eurekaBasePath,
      waitTimeoutMs,
      serviceUrl
    } = getEurekaConfig();

    const APP_NAME = process.env.APP_NAME || 'LOOKUP';
    const REGISTER_HOST = process.env.REGISTER_HOST || 'lookup';
    const basePath = normalizeBasePath(eurekaBasePath);

    this.logger.log(`Initializing Eureka discovery for: ${APP_NAME}`);
    this.logger.log(`Eureka server: ${serviceUrl}`);

    this.client = new Eureka({
      instance: {
        app: APP_NAME,
        instanceId: `${APP_NAME}:${REGISTER_HOST}`,
        hostName: REGISTER_HOST,
        ipAddr: REGISTER_HOST,
        port: { 
          '$': 0, 
          '@enabled': false 
        },
        vipAddress: APP_NAME,
        dataCenterInfo: { 
          '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo', 
          name: 'MyOwn' 
        },
      },
      eureka: {
        host: eurekaHost,
        port: eurekaPort,
        servicePath: `${basePath}/apps/`,
        fetchRegistry: true,
        registerWithEureka: false,
        maxRetries: 3,
        requestRetryDelay: 2000,
        requestTimeout: waitTimeoutMs,
      },
    });

    this.setupShutdownHooks();
  }

  async onModuleInit() {
    try {
      this.client.start();
      this.logger.log('Eureka discovery client started successfully');
    } catch (error) {
      this.logger.error('Failed to start Eureka discovery client:', error);
    }
  }

  async onModuleDestroy() {
    try {
      this.client.stop();
      this.logger.log('Eureka discovery client stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping Eureka discovery client:', error);
    }
  }

  private setupShutdownHooks() {
    const stop = () => {
      try {
        this.client.stop();
        this.logger.log('Eureka discovery client stopped via signal');
      } catch (error) {
        this.logger.error('Error during Eureka client shutdown:', error);
      }
    };

    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  }

  getInstances(appId: string): any[] {
    if (!appId) {
      this.logger.warn('getInstances called with empty appId');
      return [];
    }

    try {
      const instances = this.client.getInstancesByAppId(appId.toUpperCase()) as any[];
      return instances || [];
    } catch (error) {
      this.logger.error(`Error getting instances for appId: ${appId}`, error);
      return [];
    }
  }

  getAllApps(): string[] {
    try {
      const apps = this.client.getApps();
      if (apps && Array.isArray(apps)) {
        return apps.map((app: any) => app.name || app.app) || [];
      }
      return [];
    } catch (error) {
      this.logger.error('Error getting all apps from Eureka:', error);
      return [];
    }
  }

  isEurekaClientReady(): boolean {
    return this.client && this.client.getInstancesByAppId !== undefined;
  }

  async fetchRegistry(): Promise<void> {
    try {
      if (this.client && typeof (this.client as any).fetchRegistry === 'function') {
        await (this.client as any).fetchRegistry();
      }
    } catch (error) {
      this.logger.debug('Error fetching registry:', error);
    }
  }
}