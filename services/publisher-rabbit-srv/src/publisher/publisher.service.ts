import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connect, ConfirmChannel } from 'amqplib';
import { ConfirmConnection } from '../types/amqplib';

const logger = new Logger('PublisherService');

export interface LogEntryDto {
  id?: string;
  level?: string | number;
  service?: string;
  message?: string;
  context?: string;
}

@Injectable()
export class PublisherService implements OnModuleInit, OnModuleDestroy {
  private conn?: ConfirmConnection;
  private channel?: ConfirmChannel;
  private readonly exchange = process.env.LOGS_EXCHANGE || process.env.OUTBOX_EXCHANGE || 'logs.exchange';
  private readonly routingKey = process.env.LOGS_ROUTING_KEY || 'logs.created';
  private readonly rabbitCandidates = [
    process.env.RABBITMQ_URL,
    this.buildRabbitMQUrl(),
    'amqp://guest:guest@localhost:5672',
    'amqp://guest:guest@rabbitmq:5672',
  ].filter(Boolean) as string[];
  private readonly ready: Promise<void>;
  private readyResolve!: () => void;

  constructor() {
    this.ready = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
  }

  private buildRabbitMQUrl(): string | undefined {
    const host = process.env.RABBITMQ_HOST;
    const port = process.env.RABBITMQ_PORT || '5672';
    const username = process.env.RABBITMQ_USERNAME || 'guest';
    const password = process.env.RABBITMQ_PASSWORD || 'guest';

    if (!host) return undefined;

    return `amqp://${username}:${password}@${host}:${port}`;
  }

  async onModuleInit() {
    try {
      this.conn = await this.createRabbitConnection() as ConfirmConnection;
      this.channel = await this.conn.createConfirmChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      logger.log(`Publisher ready. Exchange: ${this.exchange}, routing: ${this.routingKey}`);
      this.readyResolve();
    } catch (error) {
      logger.error('Failed to initialize RabbitMQ connection', error as Error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => undefined);
    await this.conn?.close().catch(() => undefined);
  }

  private async createRabbitConnection(): Promise<ConfirmConnection> {
    let lastError: unknown;
    for (const candidate of this.rabbitCandidates) {
      try {
        // Cast seguro usando unknown
        const conn = await connect(candidate) as unknown as ConfirmConnection;
        logger.log(`Connected to RabbitMQ using ${candidate}`);
        return conn;
      } catch (err) {
        lastError = err;
        logger.warn(`Failed to connect to RabbitMQ using ${candidate}: ${err instanceof Error ? err.message : err}`);
      }
    }

    throw lastError ?? new Error('Unable to connect to RabbitMQ: no candidates succeeded');
  }

  async publishLog(entry: LogEntryDto) {
    await this.ready;
    if (!this.channel) throw new Error('RabbitMQ channel not available');

    const payload = {
      ...entry,
      id: entry.id ?? undefined,
      timestamp: new Date().toISOString(),
    };

    const message = Buffer.from(JSON.stringify(payload));
    this.channel.publish(this.exchange, this.routingKey, message, { persistent: true });
    await this.channel.waitForConfirms();
    logger.debug(`Published log message for service ${entry.service ?? 'unknown'}`);
  }
}
