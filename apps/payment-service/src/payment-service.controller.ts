import {
  Controller,
  Post,
  Res,
  HttpStatus,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payment-service.service';
import { handleError } from './utils/errorHandler';
import type { FastifyReply } from 'fastify';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Post('initiate')
  async initiatePayment(
    @Body() body: { bookingId: string; idempotencyKey: string },
    @Res() res: FastifyReply
  ) {
    try {
      if (!body.idempotencyKey) {
        throw new BadRequestException('idempotencyKey is required');
      }

      const result = await this.paymentsService.initiatePayment(
        body.bookingId,
        body.idempotencyKey,
      );

      return res.status(HttpStatus.CREATED).send({
        success: true,
        message: result?.message || 'Payment initiated',
        data: result
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  @Post('webhook')
  async handleWebhook(
    @Body() body: { idempotencyKey: string },
    @Res() res: FastifyReply
  ) {
    try {
      if (!body.idempotencyKey) {
        throw new BadRequestException(
          'idempotencyKey is required',
        );
      }

      const result = await this.paymentsService.handleWebhook(
        body.idempotencyKey,
      );

      return res.status(HttpStatus.OK).send({
        success: true,
        message: result.message,
        data: result,
      });
      
    } catch (error) {
      handleError(error, res);
    }
  }
}