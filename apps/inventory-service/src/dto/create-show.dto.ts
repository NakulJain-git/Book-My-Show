import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class CreateShowDto {
  @IsString()
  movieTitle!: string;

  @Type(() => Date)
  @IsDate()
  startTime!: Date;
}