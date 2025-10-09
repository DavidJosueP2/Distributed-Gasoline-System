import { Module } from '@nestjs/common';
import { RoundRobin } from './rr.strategy';
import { EurekaDiscovery } from './eureka.service';

// note: we export the RoundRobin and EurekaDiscovery for client factories
@Module({ providers: [RoundRobin, EurekaDiscovery], exports: [RoundRobin, EurekaDiscovery] })
export class DiscoveryModule {}
