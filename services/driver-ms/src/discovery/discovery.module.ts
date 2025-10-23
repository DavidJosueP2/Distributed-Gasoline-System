import { Module } from '@nestjs/common';
import { RoundRobin } from './rr.strategy';
import { EurekaDiscovery } from './eureka.service';
import { GrpcClientFactory } from '../grpc/grpc-client.factory';

// note: we export the RoundRobin, EurekaDiscovery and GrpcClientFactory for client factories
@Module({
	providers: [RoundRobin, EurekaDiscovery, GrpcClientFactory],
	exports: [RoundRobin, EurekaDiscovery, GrpcClientFactory],
})
export class DiscoveryModule {}
