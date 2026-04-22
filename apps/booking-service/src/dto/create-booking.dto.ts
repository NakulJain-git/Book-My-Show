import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  showId: string;

  @IsString()
  @IsNotEmpty()
  seatNumber: string;
}