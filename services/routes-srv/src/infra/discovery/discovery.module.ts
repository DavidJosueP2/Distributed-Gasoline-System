// src/infra/discovery/discovery.module.ts
import { Module } from '@nestjs/common';
import { EurekaDiscovery } from './eureka.service';
import { RoundRobin } from './rr.strategy';

@Module({
  providers: [EurekaDiscovery, RoundRobin],
  exports: [EurekaDiscovery, RoundRobin],
})
export class DiscoveryModule {}
