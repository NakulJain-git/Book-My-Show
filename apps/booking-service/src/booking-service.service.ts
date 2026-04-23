import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Repository, In, MoreThan } from 'typeorm';
import { RedisService } from 'apps/booking-service/src/redis/src';
import { BookingProducer } from './rabbitmq/producers/booking.producer';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    private redisService: RedisService,
  ) {}

  async createBooking(userId: string, showId: string, seatNumber: string) {
    const lockKey = `lock:seat:${showId}:${seatNumber}`;
    const lockValue = await this.redisService.acquireLock(lockKey, 300);

    if (!lockValue) {
      throw new ConflictException('Seat is being processed');
    }

    try {
      const booking = this.bookingRepo.create({
        userId,
        showId,
        seatNumber,
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const saved = await this.bookingRepo.save(booking);

      await BookingProducer.sendExpiryJob(
        {
          bookingId: saved.id,
          showId: saved.showId,
          seatNumber: saved.seatNumber,
        },
        5 * 60 * 1000,
      );

      await BookingProducer.publish('booking_events', {
        type: 'BOOKING_CREATED',
        bookingId: saved.id,
        showId: saved.showId,
        seatNumber: saved.seatNumber,
      });

      return saved;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Seat already booked');
      }
      throw err;
    }
  }

  async confirmBooking(bookingId: string) {
    const booking = await this.bookingRepo.findOne({
      where: {
        id: bookingId,
        status: BookingStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!booking) return false;

    booking.status = BookingStatus.CONFIRMED;
    await this.bookingRepo.save(booking);

    await BookingProducer.publish('booking_events', {
      type: 'BOOKING_CONFIRMED',
      bookingId: booking.id,
      showId: booking.showId,
      seatNumber: booking.seatNumber,
    });

    return true;
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return (err as any).code === '23505';
  }
  return false;
}