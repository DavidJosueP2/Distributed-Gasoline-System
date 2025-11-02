import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoundRobin } from './rr.strategy';
import { EurekaDiscovery } from './eureka.service';
import { ServiceLocatorProvider } from './discovery.providers';
import { GrpcClientFactory } from '../grpc/grpc-client.factory';

// note: we export the ServiceLocator-powered GrpcClientFactory as well.
@Module({
	imports: [ConfigModule],
	providers: [RoundRobin, EurekaDiscovery, ServiceLocatorProvider, GrpcClientFactory],
	exports: [RoundRobin, EurekaDiscovery, ServiceLocatorProvider, GrpcClientFactory],
})
export class DiscoveryModule {}
