import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Show {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  movieTitle!: string;

  @Column()
  startTime!: Date;
}