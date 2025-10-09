// types/eureka-js-client.d.ts

declare module 'eureka-js-client' {
  interface EurekaDataCenterInfo {
    '@class': string;
    name: string;
  }

  interface EurekaInstanceConfig {
    app: string;
    instanceId: string;
    hostName: string;
    ipAddr: string;
    port: { $: number; '@enabled': boolean };
    vipAddress?: string;
    dataCenterInfo: EurekaDataCenterInfo;
  }

  interface EurekaClientConfig {
    host: string;
    port: number;
    servicePath: string;
  }

  export interface EurekaConfig {
    instance: EurekaInstanceConfig;
    eureka: EurekaClientConfig;
  }

  export class Eureka {
    constructor(config: EurekaConfig);
    start(callback?: (error?: Error) => void): void;
    stop(callback?: () => void): void;
  }
}
