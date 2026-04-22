import * as amqp from 'amqplib';

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
          `[RABBITMQ] Connection failed (attempt ${attempt}). Retrying in ${delay}ms...`
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
      console.error('[RABBITMQ] Error:', err.message);
    });
  }

  async getChannel(queue: string): Promise<amqp.Channel> {
    if (this.channels.has(queue)) {
      return this.channels.get(queue)!;
    }

    await this.createConnection();

    const channel = await this.connection.createChannel();

    await channel.assertQueue(queue, { durable: true });

    this.channels.set(queue, channel);

    return channel;
  }

  async publish(queue: string, message: any) {
    const channel = await this.getChannel(queue);

    console.log(`[RABBITMQ] Publishing → ${queue}`, message);

    channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  }

  async consume(
    queue: string,
    handler: (msg: amqp.ConsumeMessage) => Promise<void>,
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
          await handler(msg);
          channel.ack(msg);
        } catch (err) {
          console.error(`[RABBITMQ] Error in ${queue}`, err);
          channel.nack(msg, false, true);
        }
      },
      { noAck: false }
    );
  }
}

export const rabbitMQ = new RabbitMQManager();