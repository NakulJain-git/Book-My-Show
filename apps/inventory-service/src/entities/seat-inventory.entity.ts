import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  BOOKED = 'BOOKED',
}

@Entity()
@Index(['showId', 'seatNumber'], { unique: true })
export class SeatInventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  showId!: string;

  @Column()
  seatNumber!: string;

  @Column({
    type: 'enum',
    enum: SeatStatus,
    default: SeatStatus.AVAILABLE,
  })
  status!: SeatStatus;
}