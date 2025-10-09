// import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// import * as amqp from 'amqplib';

// const rabbitCandidates = [
//   process.env.RABBITMQ_URL,
//   process.env.RABBITMQ_HOST ? `amqp://guest:guest@${process.env.RABBITMQ_HOST}:5672` : undefined,
//   'amqp://guest:guest@localhost:5672',
//   'amqp://guest:guest@rabbitmq:5672',
// ].filter(Boolean) as string[];
// const EXCHANGE = process.env.OUTBOX_EXCHANGE || 'service.events';
// const ROUTING_KEY = 'user.created';

// @Injectable()
// export class HelloRabbitConsumer implements OnModuleInit, OnModuleDestroy {
//   // Use `any` to avoid type incompatibilities with different amqplib versions
//   private conn: any;
//   private ch: any;

//   async onModuleInit() {
//     let lastError: unknown;
//     for (const candidate of rabbitCandidates) {
//       try {
//         this.conn = (await amqp.connect(candidate)) as any;
//         console.log(`[HELLO-SVC] Connected to RabbitMQ: ${candidate}`);
//         lastError = undefined;
//         break;
//       } catch (err) {
//         lastError = err;
//         console.error(`[HELLO-SVC] RabbitMQ connection failed for ${candidate}:`, err instanceof Error ? err.message : err);
//       }
//     }

//     if (!this.conn) {
//       console.error('[HELLO-SVC] RabbitMQ consumer failed to start - all connection attempts exhausted');
//       if (lastError) {
//         console.error(lastError);
//       }
//       return;
//     }

//     try {
//       this.ch = await this.conn.createChannel();
//       await this.ch.assertExchange(EXCHANGE, 'topic', { durable: true });
//       const q = await this.ch.assertQueue('', { exclusive: true });
//       await this.ch.bindQueue(q.queue, EXCHANGE, ROUTING_KEY);
//       await this.ch.consume(q.queue, (msg: any) => {
//         if (!msg) return;
//         try {
//           const content = msg.content.toString();
//           const parsed = JSON.parse(content);
//           const message =
//             parsed?.message ??
//             parsed?.payload?.message ??
//             parsed?.user?.message ??
//             parsed?.payload?.user?.message ??
//             null;
//           const debugPayload = process.env.HELLO_DEBUG_PAYLOAD === '1';
//           if (message) {
//             console.log(`[HELLO-SVC] se recepto message: ${message}`);
//           } else if (debugPayload) {
//             console.log('[HELLO-SVC] received user.created event payload:', parsed);
//           } else {
//             console.log('[HELLO-SVC] received user.created event');
//           }
//           this.ch?.ack(msg);
//         } catch (err) {
//           console.error('[HELLO-SVC] failed to process message', err);
//           this.ch?.nack(msg, false, false);
//         }
//       });
//       console.log('[HELLO-SVC] RabbitMQ consumer started for user.created');
//     } catch (err) {
//       console.error('[HELLO-SVC] RabbitMQ consumer failed to start', err);
//     }
//   }

//   async onModuleDestroy() {
//     try {
//       await this.ch?.close();
//       await this.conn?.close();
//     } catch {}
//   }
// }
