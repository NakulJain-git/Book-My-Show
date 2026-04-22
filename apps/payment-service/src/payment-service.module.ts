import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payments.entity';
import { PaymentsService } from './payment-service.service';
import { PaymentsController } from './payment-service.controller';
import { BookingFailedConsumer } from './rabbitmq/booking-failed.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  providers: [PaymentsService,BookingFailedConsumer],
  controllers: [PaymentsController],
})
export class PaymentsModule {}