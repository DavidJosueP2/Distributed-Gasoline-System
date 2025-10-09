import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Observable, lastValueFrom } from 'rxjs';
import { GrpcClientFactory } from '../../grpc/grpc-client.factory';

enum LogLevel {
  INFO = 0,
  WARN = 1,
  ERROR = 2,
  DEBUG = 3,
}

interface LogEntry {
  id?: string;
  level?: LogLevel;
  service?: string;
  message?: string;
  context?: string;
}

interface CreateLogRequest {
  log?: LogEntry;
}

interface CreateLogResponse {
  success?: boolean;
  error?: string;
}

type PublisherGrpcServiceName = 'PublisherService' | 'LoggerService';

interface LogPublisherGrpcClient {
  createLog(request: CreateLogRequest): Observable<CreateLogResponse>;
}

@Injectable()
export class LogsPublisherService implements OnModuleInit {
  private readonly logger = new Logger(LogsPublisherService.name);
  private client?: LogPublisherGrpcClient;
  private initPromise?: Promise<void>;
  private readonly grpcServiceCandidates = ['PublisherService', 'LoggerService'] as const;
  private activeServiceName?: PublisherGrpcServiceName;

  private readonly targetAppName =
    process.env.LOGS_PUBLISHER_APP_NAME ||
    process.env.PUBLISHER_APP_NAME ||
    'PUBLISHER-SERVICE';

  private readonly sourceService =
    process.env.LOGGER_SOURCE_SERVICE ||
    process.env.APP_NAME ||
    'users-srv';

  constructor(private readonly factory: GrpcClientFactory) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureClient();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown initialization error';
      this.logger.warn(`Log publisher gRPC client initialization failed: ${message}`);
    }
  }

  private async ensureClient(): Promise<void> {
    if (this.client) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const client = await this.factory.clientFor(
          this.targetAppName,
          'logger',
          'logs.proto',
        );
        const bound = this.bindGrpcClient(client);
        if (!bound) {
          throw new Error(
            `No compatible gRPC service exposed by ${this.targetAppName} (expected one of ${this.grpcServiceCandidates.join(', ')})`,
          );
        }
        this.client = bound.instance;
        this.activeServiceName = bound.name;
        this.logger.debug(
          `Log publisher gRPC client ready via ${this.targetAppName}/${this.activeServiceName}`,
        );
      })()
        .catch((error) => {
          this.client = undefined;
          this.initPromise = undefined;
          this.activeServiceName = undefined;
          throw error;
        });
    }
    await this.initPromise;
  }

  private bindGrpcClient(client: any):
    | { name: PublisherGrpcServiceName; instance: LogPublisherGrpcClient }
    | undefined {
    for (const name of this.grpcServiceCandidates) {
      try {
  const svc = client.getService(name) as LogPublisherGrpcClient;
        if (svc && typeof svc.createLog === 'function') {
          return { name, instance: svc };
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.debug(
          `gRPC service ${name} not available on ${this.targetAppName}: ${reason}`,
        );
      }
    }
    return undefined;
  }

  private formatServiceId(): string {
    return this.activeServiceName
      ? `${this.targetAppName}/${this.activeServiceName}`
      : this.targetAppName;
  }

  async log(entry: LogEntry): Promise<void> {
    try {
      await this.ensureClient();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown initialization error';
      this.logger.warn(
        `Log publisher client unavailable (${this.formatServiceId()}): ${message}`,
      );
      return;
    }

    if (!this.client) {
      this.logger.warn(`Log publisher client not initialized for ${this.formatServiceId()}`);
      return;
    }

    const payload: LogEntry = {
      ...entry,
      service: entry.service ?? this.sourceService,
      level: entry.level ?? LogLevel.INFO,
    };

    try {
      const response = await lastValueFrom(
        this.client.createLog({ log: payload }),
      );
      if (!response?.success) {
        this.logger.warn(
          `Log publisher service ${this.formatServiceId()} returned success=${response?.success ?? false} error=${response?.error ?? 'unknown'}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown publish error';
      this.logger.warn(
        `Failed to publish log entry via ${this.formatServiceId()}: ${message}`,
      );
    }
  }

  async logUserCreated(data: {
    userId: string;
    email: string;
    username: string;
    fullName: string;
    message?: string | null;
  }): Promise<void> {
    const context = JSON.stringify({
      userId: data.userId,
      email: data.email,
      username: data.username,
      fullName: data.fullName,
    });

    await this.log({
      message: data.message ?? `User ${data.email} created`,
      context,
    });
  }
}
