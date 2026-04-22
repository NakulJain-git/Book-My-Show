import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payments.entity';
import { rabbitMQ } from './rabbitmq/connection';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
  ) {}

  async initiatePayment(bookingId: string, key: string) {
    const existing = await this.paymentRepo.findOne({
      where: { idempotencyKey: key },
    });

    if (existing) {
      if (existing.bookingId !== bookingId) {
        throw new ConflictException('Key reused with different booking');
      }

      return {
        status: existing.status,
        message: 'Idempotent response',
      };
    }

    try {
      const payment = this.paymentRepo.create({
        bookingId,
        idempotencyKey: key,
        status: 'PENDING',
      });

      const saved = await this.paymentRepo.save(payment);

      return {
        status: saved.status,
        message: 'Payment initiated',
      };
    } catch (err) {
      const retry = await this.paymentRepo.findOne({
        where: { idempotencyKey: key },
      });

      if (retry) {
        return {
          status: retry.status,
          message: 'Idempotent response (race handled)',
        };
      }
      throw err;
    }
  }

  async handleWebhook(idempotencyKey: string) {
    const payment = await this.paymentRepo.findOne({
      where: { idempotencyKey },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // idempotent webhook
    if (payment.status === 'SUCCESS') {
      return { message: 'Already processed' };
    }

    payment.status = 'SUCCESS';
    await this.paymentRepo.save(payment);

    try {
      // Direct publish (no producer)
      await rabbitMQ.publish('payment.success', {
        bookingId: payment.bookingId,
        paymentId: payment.id,
        status: 'SUCCESS',
      });

      return { message: 'Payment success + booking confirmed' };
    } catch (err) {
      console.error('[RABBITMQ] Publish failed', err);

      payment.status = 'FAILED';
      await this.paymentRepo.save(payment);

      return { message: 'Booking failed → refund logic later' };
    }
  }

  async handleRefund(bookingId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { bookingId },
    });

    if (!payment) {
      console.log('[REFUND] Payment not found');
      return;
    }

    if (payment.status === 'FAILED') {
      console.log('[REFUND] Already handled');
      return;
    }

    payment.status = 'FAILED'; // simulate refund
    await this.paymentRepo.save(payment);

    console.log(`[REFUND] Refunded for booking ${bookingId}`);
  }
}