import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Booking, BookingStatus } from './entities/booking.entity';
import { MoreThan, QueryFailedError, DataSource,} from 'typeorm';
import { RedisService } from 'apps/booking-service/src/redis/src';
import { BookingProducer } from './rabbitmq/producers/booking.producer';
import { BOOKING_EVENTS_QUEUE, BOOKING_FAILED_QUEUE } from './rabbitmq/constants';

@Injectable()
export class BookingService {
  constructor(
    private redisService: RedisService,
    private dataSource: DataSource,
  ) {}

  async createBooking(userId: string, showId: string, seatNumber: string) {
    const lockKey = `lock:seat:${showId}:${seatNumber}`;

    // lock for 5 min
    const lockValue = await this.redisService.acquireLock(lockKey, 300);

    if (!lockValue) {
      throw new ConflictException('Seat is being processed');
    }

    try {
      const savedBooking = await this.dataSource.transaction(
        async (manager) => {
          const booking = manager.create(Booking, {
            userId,
            showId,
            seatNumber,
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          });

          return await manager.save(Booking, booking);
        },
      );

      await BookingProducer.sendExpiryJob(
        {
          bookingId: savedBooking.id,
          showId: savedBooking.showId,
          seatNumber: savedBooking.seatNumber,
        },
        5 * 60 * 1000,
      );

      await BookingProducer.publish(BOOKING_EVENTS_QUEUE, {
        type: 'BOOKING_CREATED',
        bookingId: savedBooking.id,
        showId: savedBooking.showId,
        seatNumber: savedBooking.seatNumber,
      });

      return savedBooking;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Seat already booked');
      }

      throw new InternalServerErrorException(
        'Failed to create booking',
      );
    }
  }

  async confirmBooking(bookingId: string): Promise<boolean> {
    try {
      const confirmed = await this.dataSource.transaction(
        async (manager) => {
          const booking = await manager.findOne(Booking, {
            where: {
              id: bookingId,
              status: BookingStatus.PENDING,
              expiresAt: MoreThan(new Date()),
            },
            lock: {
              mode: 'pessimistic_write',
            },
          });

          if (!booking) {
            return null;
          }

          booking.status = BookingStatus.CONFIRMED;

          await manager.save(Booking, booking);

          return booking;
        },
      );

      if (!confirmed) {
        await BookingProducer.publish(BOOKING_FAILED_QUEUE, {
          type: 'BOOKING_FAILED',
          bookingId,
          reason: 'BOOKING_EXPIRED_OR_INVALID',
        });

        return false;
      }

      /**
       * Publish AFTER transaction commit
       */
      await BookingProducer.publish(BOOKING_EVENTS_QUEUE, {
        type: 'BOOKING_CONFIRMED',
        bookingId: confirmed.id,
        showId: confirmed.showId,
        seatNumber: confirmed.seatNumber,
      });

      return true;
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to confirm booking',
      );
    }
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as any).driverError?.code === '23505'
  );
}