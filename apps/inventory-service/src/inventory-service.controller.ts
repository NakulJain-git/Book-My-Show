import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { InventoryService } from './inventory-service.service';
import { CreateShowDto } from './dto/create-show.dto';
import { handleError } from './utils/errorHandler';

@Controller('shows')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  async createShow(
    @Body() body: CreateShowDto,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.inventoryService.createShow(body);

      return res.status(HttpStatus.CREATED).send({
        success: true,
        message: 'Show created successfully',
        data: result,
      });
    } catch (error) {
      return handleError(error, res);
    }
  }

  @Get()
  async getAllShows(@Res() res: FastifyReply) {
    try {
      const result = await this.inventoryService.getAllShows();

      return res.status(HttpStatus.OK).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(error, res);
    }
  }

  @Get(':showId')
  async getShow(
    @Param('showId') showId: string,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.inventoryService.getShow(showId);

      return res.status(HttpStatus.OK).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(error, res);
    }
  }

  @Get(':showId/seats')
  async getSeats(
    @Param('showId') showId: string,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.inventoryService.getSeatsByShow(showId);

      return res.status(HttpStatus.OK).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(error, res);
    }
  }

  @Get(':showId/seats/available')
  async getAvailableSeats(
    @Param('showId') showId: string,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.inventoryService.getAvailableSeats(showId);

      return res.status(HttpStatus.OK).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(error, res);
    }
  }

  @Get(':showId/summary')
  async getSeatSummary(
    @Param('showId') showId: string,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.inventoryService.getSeatSummary(showId);

      return res.status(HttpStatus.OK).send({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(error, res);
    }
  }
}