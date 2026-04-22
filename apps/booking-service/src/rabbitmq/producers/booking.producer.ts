import { rabbitMQ } from '../connection';
import { EXPIRY_QUEUE, PROCESS_QUEUE } from '../constants';

export class BookingProducer {
  static async sendExpiryJob(
    data: { bookingId: string; showId: string; seatNumber: string },
    delayMs: number,
  ) {
    const channel = await rabbitMQ.getChannel(EXPIRY_QUEUE);

    await channel.assertQueue(PROCESS_QUEUE, { durable: true });

    await channel.assertQueue(EXPIRY_QUEUE, {
      durable: true,
    });

    channel.sendToQueue(
      EXPIRY_QUEUE,
      Buffer.from(JSON.stringify(data)),
      {
        persistent: true,
        expiration: delayMs.toString(),
      },
    );
  }

  static async publish(queue: string, data: any) {
    await rabbitMQ.send(queue, data);
  }
}