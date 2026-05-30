import { rabbitMQ } from '../connection';
import { BOOKING_EXPIRY_DELAY_QUEUE } from '../constants';

export class BookingProducer {
  static async sendExpiryJob(
    data: { bookingId: string; showId: string; seatNumber: string },
    delayMs: number,
  ) {
    const channel = await rabbitMQ.getChannel(
      BOOKING_EXPIRY_DELAY_QUEUE,
    );

    channel.sendToQueue(
      BOOKING_EXPIRY_DELAY_QUEUE,
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