import { Injectable, OnModuleInit } from '@nestjs/common';
import { BookingService } from '../../booking-service.service';
import { rabbitMQ } from '../connection';

@Injectable()
export class PaymentSuccessConsumer implements OnModuleInit {
  constructor(private readonly bookingService: BookingService) {}

  async onModuleInit() {
    await rabbitMQ.consume(
      'payment.success',
      async (msg) => {
        const event = JSON.parse(msg.content.toString());

        console.log('[RABBITMQ] payment.success', event);

        const success = await this.bookingService.confirmBooking(
          event.bookingId,
        );

        if (success) {
          console.log(`[BOOKING] CONFIRMED → ${event.bookingId}`);
        } else {
          console.log(`[BOOKING] FAILED → ${event.bookingId}`);
        }
      },
      10, // prefetch
    );
  }
}