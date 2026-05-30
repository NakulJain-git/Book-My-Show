import * as amqp from 'amqplib';
import {
  BOOKING_EXPIRY_QUEUE,
  BOOKING_EXPIRY_DELAY_QUEUE,
  BOOKING_EXPIRY_EXCHANGE,
} from './constants';

class RabbitMQManager {
  private connection!: amqp.Connection;
  private channels: Map<string, amqp.Channel> = new Map();
  private isConnected = false;

  private readonly RABBITMQ_URL =
    process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';

  private async createConnection() {
    if (this.isConnected) return;

    const connectWithRetry = async (attempt = 1): Promise<amqp.Connection> => {
      try {
        const conn = await amqp.connect(this.RABBITMQ_URL);

        console.log('[RABBITMQ] Connected');

        return conn;
      } catch (err) {
        const delay = Math.min(1000 * attempt * 2, 15000); // exponential backoff capped at 15s

        console.error(
          `[RABBITMQ]  Connection failed (attempt ${attempt}). Retrying in ${delay}ms...`
        );

        await new Promise((res) => setTimeout(res, delay));

        return connectWithRetry(attempt + 1);
      }
    };

    this.connection = await connectWithRetry();
    this.isConnected = true;

    this.connection.on('close', async () => {
      console.error('[RABBITMQ] Connection closed. Reconnecting...');
      this.isConnected = false;
      this.channels.clear();

      await this.createConnection();
    });

    this.connection.on('error', (err) => {
      console.error('[RABBITMQ]  Error:', err.message);
    });
  }

  async getChannel(queue: string): Promise<amqp.Channel> {
    if (this.channels.has(queue)) {
      return this.channels.get(queue)!;
    }

    await this.createConnection();

    const channel = await this.connection.createChannel();

    if (queue === BOOKING_EXPIRY_QUEUE || queue === BOOKING_EXPIRY_DELAY_QUEUE) {
      await this.setupBookingExpiry(channel);
    } else {
      await channel.assertQueue(queue, { durable: true });
    }

    this.channels.set(queue, channel);

    return channel;
  }

  async send(queue: string, message: any) {
    const channel = await this.getChannel(queue);

    channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  }

  async consume(
    queue: string,
    handler: (msg: amqp.ConsumeMessage, channel: amqp.Channel) => Promise<void>,
    prefetch = 1
  ) {
    const channel = await this.getChannel(queue);

    channel.prefetch(prefetch);

    console.log(`[RABBITMQ] Listening → ${queue}`);

    channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        try {
          await handler(msg, channel);
          channel.ack(msg);
        } catch (err) {
          console.error(`[RABBITMQ] Error in ${queue}`, err);
          channel.nack(msg, false, true);
        }
      },
      { noAck: false }
    );
  }

  private async setupBookingExpiry(channel: amqp.Channel) {
    await channel.assertExchange(
      BOOKING_EXPIRY_EXCHANGE,
      'direct',
      { durable: true },
    );

    await channel.assertQueue(BOOKING_EXPIRY_QUEUE, {
      durable: true,
    });

    await channel.bindQueue(
      BOOKING_EXPIRY_QUEUE,
      BOOKING_EXPIRY_EXCHANGE,
      BOOKING_EXPIRY_QUEUE,
    );

    await channel.assertQueue(BOOKING_EXPIRY_DELAY_QUEUE, {
      durable: true,
      deadLetterExchange: BOOKING_EXPIRY_EXCHANGE,
      deadLetterRoutingKey: BOOKING_EXPIRY_QUEUE,
    });
  }
}


export const rabbitMQ = new RabbitMQManager();