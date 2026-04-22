import { FastifyReply } from 'fastify';
import {
  BadRequestException,
    ConflictException,
    HttpException,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';

export function handleError(error: unknown, res: FastifyReply) {
  let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';

  if (error instanceof BadRequestException) {
    statusCode = HttpStatus.BAD_REQUEST;
    message = error.message;
  } else if (error instanceof ConflictException) {
    statusCode = HttpStatus.CONFLICT;
    message = error.message;
  } else if (error instanceof NotFoundException) {
    statusCode = HttpStatus.NOT_FOUND;
    message = error.message;
  } else if (error instanceof HttpException) {
    statusCode = error.getStatus();
    const response = error.getResponse();
    message =
      typeof response === 'string'
        ? response
        : (response as any)?.message || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return res.status(statusCode).send({
    success: false,
    message,
  });
}