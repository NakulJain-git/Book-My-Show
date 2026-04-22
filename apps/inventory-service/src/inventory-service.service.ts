import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Show } from './entities/show.entity';
import { SeatInventory, SeatStatus } from './entities/seat-inventory.entity';
import { CreateShowDto } from './dto/create-show.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Show)
    private readonly showRepo: Repository<Show>,

    @InjectRepository(SeatInventory)
    private readonly seatRepo: Repository<SeatInventory>,
  ) { }

  // Create Show + Seed Seats
  async createShow(data: CreateShowDto) {
    try {
      const existing = await this.showRepo.findOne({
        where: {
          movieTitle: data.movieTitle,
          startTime: new Date(data.startTime),
        },
      });

      if (existing) {
        throw new ConflictException('Show already exists');
      }

      const show = this.showRepo.create({
        movieTitle: data.movieTitle,
        startTime: new Date(data.startTime),
      });

      const savedShow = await this.showRepo.save(show);

      await this.seedSeats(savedShow.id);

      return savedShow;
    } catch (err) {
      throw err;
    }
  }

  // Seed seats for a show
  async seedSeats(showId: string) {
    const seats: Partial<SeatInventory>[] = [];

    const rows = ['A', 'B', 'C', 'D', 'E'];
    const seatsPerRow = 10;

    for (const row of rows) {
      for (let i = 1; i <= seatsPerRow; i++) {
        seats.push({
          showId,
          seatNumber: `${row}${i}`,
          status: SeatStatus.AVAILABLE,
        });
      }
    }

    await this.seatRepo.insert(seats);
  }

  // Get all shows
  async getAllShows() {
    return this.showRepo.find({
      order: { startTime: 'ASC' },
    });
  }

  // Get single show
  async getShow(showId: string) {
    const show = await this.showRepo.findOne({
      where: { id: showId },
    });

    if (!show) {
      throw new NotFoundException('Show not found');
    }

    return show;
  }

  // Get all seats
  async getSeatsByShow(showId: string) {
    return this.seatRepo.find({
      where: { showId },
      order: { seatNumber: 'ASC' },
    });
  }

  // Available seats only
  async getAvailableSeats(showId: string) {
    return this.seatRepo.find({
      where: {
        showId,
        status: SeatStatus.AVAILABLE,
      },
      order: { seatNumber: 'ASC' },
    });
  }

  // Seat summary 
  async getSeatSummary(showId: string) {
    const seats = await this.seatRepo.find({
      where: { showId },
    });

    return seats.reduce(
      (acc, seat) => {
        acc.total++;

        switch (seat.status) {
          case SeatStatus.AVAILABLE:
            acc.available++;
            break;
          case SeatStatus.HELD:
            acc.held++;
            break;
          case SeatStatus.BOOKED:
            acc.booked++;
            break;
        }

        return acc;
      },
      {
        total: 0,
        available: 0,
        held: 0,
        booked: 0,
      },
    );
  }

  // Update seat status
  async updateSeat(
    showId: string,
    seatNumber: string,
    status: SeatStatus,
  ) {
    if (!showId || !seatNumber) {
      console.error('[Inventory] Invalid updateSeat input', {
        showId,
        seatNumber,
        status,
      });
      return;
    }

    await this.seatRepo.upsert(
      {
        showId,
        seatNumber,
        status,
      },
      ['showId', 'seatNumber'],
    );
  }
}