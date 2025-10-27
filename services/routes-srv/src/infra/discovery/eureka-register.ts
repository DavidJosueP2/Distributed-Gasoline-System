// src/infra/discovery/eureka-register.ts
import { EurekaDiscovery } from './eureka.service';

export function registerInEureka(): EurekaDiscovery {
  const eureka = new EurekaDiscovery();
  eureka.client.start();
  return eureka;
}
