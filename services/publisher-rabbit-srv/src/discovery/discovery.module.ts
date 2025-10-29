import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EurekaDiscovery } from './eureka.service';
import { RoundRobin } from './rr.strategy';
import { ServiceLocatorProvider } from './discovery.providers';

@Module({
  imports: [ConfigModule],
  providers: [EurekaDiscovery, RoundRobin, ServiceLocatorProvider],
  exports: [EurekaDiscovery, RoundRobin, ServiceLocatorProvider],
})
export class DiscoveryModule {}
