import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payment-service.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiatePayment(
    @Body() body: { bookingId: string; idempotencyKey: string },
  ) {
    if (!body.idempotencyKey) {
      throw new BadRequestException('idempotencyKey is required');
    }

    const result = await this.paymentsService.initiatePayment(
      body.bookingId,
      body.idempotencyKey,
    );

    return {
      success: true,
      message: result?.message || 'Payment initiated',
      status: result?.status,
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: { transactionId: string }) {
    const result = await this.paymentsService.handleWebhook(
      body.transactionId,
    );
    return {
      success: true,
      message: result.message,
    };
  }
}