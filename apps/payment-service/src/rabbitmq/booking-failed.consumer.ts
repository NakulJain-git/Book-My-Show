import { Injectable, OnModuleInit } from '@nestjs/common';
import { PaymentsService } from '../payment-service.service';
import { rabbitMQ } from '../rabbitmq/connection';

@Injectable()
export class BookingFailedConsumer implements OnModuleInit {
  constructor(private paymentService: PaymentsService) {}

  async onModuleInit() {
    await rabbitMQ.consume('booking.failed', async (msg) => {
      const event = JSON.parse(msg.content.toString());

      console.log('[RABBITMQ] booking.failed', event);

      await this.paymentService.handleRefund(event.bookingId);
    });
  }
}