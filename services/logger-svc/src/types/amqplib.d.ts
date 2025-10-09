// types/amqplib.d.ts
import { Connection, ConfirmChannel } from 'amqplib';

/**
 * ConfirmConnection extiende Connection para que TypeScript
 * reconozca createConfirmChannel() y close().
 */
export type ConfirmConnection = Connection & {
  createConfirmChannel(): Promise<ConfirmChannel>;
  close(): Promise<void>;
};
