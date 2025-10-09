import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PublisherService, LogEntryDto } from './publisher.service';

interface CreateLogRequest {
  log?: LogEntryDto;
}

interface CreateLogResponse {
  success: boolean;
  error?: string;
}

@Controller()
export class PublisherController {
  private readonly logger = new Logger(PublisherController.name);

  constructor(private readonly svc: PublisherService) {}

  @GrpcMethod('PublisherService', 'CreateLog')
  @GrpcMethod('LoggerService', 'CreateLog')
  async createLog(data: CreateLogRequest = {}): Promise<CreateLogResponse> {
    try {
      if (!data.log) {
        throw new Error('Missing log payload');
      }
      await this.svc.publishLog(data.log);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to publish log: ${message}`);
      return { success: false, error: message };
    }
  }
}
