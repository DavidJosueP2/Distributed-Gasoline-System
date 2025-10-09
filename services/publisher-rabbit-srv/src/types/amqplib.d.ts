// types/amqplib.d.ts
import { Connection, ConfirmChannel } from 'amqplib';

// Extiende Connection para que TypeScript reconozca createConfirmChannel
export type ConfirmConnection = Connection & {
  createConfirmChannel(): Promise<ConfirmChannel>;
    close(): Promise<void>; 
};
