import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../entities/booking.entity';
import { PROCESS_QUEUE } from '../constants';
import { rabbitMQ } from '../connection';

@Injectable()
export class BookingExpiryConsumer implements OnModuleInit {
  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
  ) {}

  async onModuleInit() {
    await rabbitMQ.consume(PROCESS_QUEUE, async (msg) => {
      const data = JSON.parse(msg.content.toString());

      console.log('[RABBITMQ] Expiry', data);

      if (!data?.bookingId) return;

      const booking = await this.bookingRepo.findOne({
        where: { id: data.bookingId },
      });

      if (!booking) return;

      if (booking.status === BookingStatus.PENDING) {
        booking.status = BookingStatus.EXPIRED;
        await this.bookingRepo.save(booking);

        console.log(`[BOOKING] EXPIRED → ${data.bookingId}`);
      }
    });
  }
}