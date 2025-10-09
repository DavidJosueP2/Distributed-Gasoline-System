import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersApplicationService } from '../application/services/users-application.service';
import { PrismaUserRepositoryProvider } from '../infrastructure/persistence/prisma/prisma-user.repository';
import { UsersGrpcController } from '../presentation/grpc/users.controller';
import { DiscoveryModule } from '../discovery/discovery.module';
import { GrpcClientFactory } from '../grpc/grpc-client.factory';
import { LogsPublisherService } from '../infrastructure/logging/logs-publisher.service';

@Module({
  imports: [PrismaModule, DiscoveryModule],
  controllers: [UsersGrpcController],
  providers: [
    UsersApplicationService,
    PrismaUserRepositoryProvider,
    GrpcClientFactory,
    LogsPublisherService,
  ],
})
export class UsersModule {}
