import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import amqp, { ConfirmChannel } from 'amqplib';
import { ConfirmConnection } from '../types/amqplib';
import { LoggerService } from '../logger.service';

const RABBIT_CANDIDATES = [
  process.env.RABBITMQ_URL,
  process.env.RABBITMQ_HOST ? `amqp://guest:guest@${process.env.RABBITMQ_HOST}:5672` : undefined,
  'amqp://guest:guest@localhost:5672',
  'amqp://guest:guest@rabbitmq:5672',
].filter(Boolean) as string[];

const EXCHANGE = process.env.LOGS_EXCHANGE || 'logs.exchange';
const ROUTING_KEY = process.env.LOGS_ROUTING_KEY || 'logs.created';
const QUEUE_NAME = process.env.LOGGER_QUEUE || 'logger.logs.queue';
const LOG_INDEX = process.env.LOGS_INDEX || 'app-logs';

@Injectable()
export class LogsRabbitConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogsRabbitConsumer.name);
  private conn?: ConfirmConnection;
  private channel?: ConfirmChannel;

  constructor(private readonly logService: LoggerService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => undefined);
    await this.conn?.close().catch(() => undefined);
  }

  private async connect() {
    let lastError: unknown;

    for (const candidate of RABBIT_CANDIDATES) {
      try {
        // Cast seguro para que TS reconozca createConfirmChannel y close
        this.conn = (await amqp.connect(candidate)) as unknown as ConfirmConnection;

        this.channel = await this.conn.createConfirmChannel();

        // Declaración de exchange y cola
        await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
        const { queue } = await this.channel.assertQueue(QUEUE_NAME, { durable: true });
        await this.channel.bindQueue(queue, EXCHANGE, ROUTING_KEY);

        // Consumir mensajes
        await this.channel.consume(queue, (msg) => this.handleMessage(msg), { noAck: false });

        this.logger.log(`Listening for logs on ${candidate} queue ${queue}`);
        return;

      } catch (error) {
        lastError = error;
        this.logger.error(
          `Failed to connect to ${candidate}: ${error instanceof Error ? error.message : error}`
        );

        // Cierre seguro solo si existen
        await this.channel?.close().catch(() => undefined);
        await this.conn?.close().catch(() => undefined);

        this.channel = undefined;
        this.conn = undefined;
      }
    }

    throw lastError ?? new Error('Unable to establish RabbitMQ connection for logger consumer');
  }

  private async handleMessage(msg: amqp.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const content = msg.content.toString();
      const payload = JSON.parse(content);
      this.logger.debug(`Received log message: ${content}`);
      await this.logService.logToElastic(LOG_INDEX, payload);
      this.channel?.ack(msg);
    } catch (error) {
      this.logger.error('Failed to process log message', error as Error);
      this.channel?.nack(msg, false, false);
    }
  }
}
