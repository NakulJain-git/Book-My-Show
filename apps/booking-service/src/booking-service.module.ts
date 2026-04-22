import { Module } from '@nestjs/common';
import { BookingService } from './booking-service.service';
import { BookingController } from './booking-service.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { RedisModule } from 'apps/booking-service/src/redis/src';
import { BookingExpiryConsumer } from './rabbitmq/consumers/booking-expiry.consumer';
import { PaymentSuccessConsumer } from './rabbitmq/consumers/payment-success.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking]),
    RedisModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingService,
    BookingExpiryConsumer,
    PaymentSuccessConsumer,
  ],
})
export class BookingModule {}