import { Body, Controller, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { BookingService } from './booking-service.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import type { FastifyReply } from 'fastify';
import { handleError } from './utils/errorHandler';

@Controller('bookings')
export class BookingController {
  constructor(private bookingService: BookingService) { }

  @Post()
  async createBooking(
    @Body() booking: CreateBookingDto,
    @Res() res: FastifyReply,
  ) {
    try {
      const newBooking = await this.bookingService.createBooking(
        booking.userId,
        booking.showId,
        booking.seatNumber,
      );
      return res.status(HttpStatus.CREATED).send({
        success: true,
        message: 'Booking created successfully',
        data: { ...newBooking }
      });
    } catch (error) {
      return handleError(error, res);
    }
  }
}
