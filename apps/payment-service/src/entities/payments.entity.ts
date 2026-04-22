import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  idempotencyKey!: string;

  @Column()
  bookingId!: string;

  @Column({
    default: 'PENDING',
  })
  status!: 'PENDING' | 'SUCCESS' | 'FAILED';

  @CreateDateColumn()
  createdAt!: Date;
}