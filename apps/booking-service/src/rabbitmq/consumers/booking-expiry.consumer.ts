import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../entities/booking.entity';
import { BookingProducer } from '../producers/booking.producer';
import { rabbitMQ } from '../connection';
import { BOOKING_EVENTS_QUEUE, BOOKING_EXPIRY_QUEUE } from '../constants';

@Injectable()
export class BookingExpiryConsumer implements OnModuleInit {
  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
  ) { }

  async onModuleInit() {
    await rabbitMQ.consume(BOOKING_EXPIRY_QUEUE, async (msg) => {
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
        await BookingProducer.publish(BOOKING_EVENTS_QUEUE, {
          type: 'BOOKING_EXPIRED',
          bookingId: booking.id,
          showId: booking.showId,
          seatNumber: booking.seatNumber,
        });
        console.log(`[BOOKING] EXPIRED → ${data.bookingId}`);
      }
    });
  }
}