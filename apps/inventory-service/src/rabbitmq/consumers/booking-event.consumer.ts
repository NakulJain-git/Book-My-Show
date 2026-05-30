import { Injectable, OnModuleInit } from '@nestjs/common';
import { rabbitMQ } from '../connection';
import { InventoryService } from '../../inventory-service.service';
import { SeatStatus } from '../../entities/seat-inventory.entity';
import { BOOKING_EVENTS_QUEUE } from '../constants';
import { BookingEvent } from '../../interface/bookingEvent.interface';

@Injectable()
export class BookingEventsConsumer implements OnModuleInit {

  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  async onModuleInit() {
    await rabbitMQ.consume(
      BOOKING_EVENTS_QUEUE,
      async (msg) => {
        const event = this.parseEvent(msg.content.toString());

        if (!event) return;

        await this.handleEvent(event);
      },
    );
  }

  private parseEvent(payload: string): BookingEvent | null {
    try {
      const event = JSON.parse(payload) as BookingEvent;

      if (!event.showId || !event.seatNumber || !event.type) {
        console.log(`Invalid event payload: ${payload}`);
        return null;
      }

      return event;
    } catch {
      console.log(`Invalid JSON payload: ${payload}`);
      return null;
    }
  }

  private async handleEvent(event: BookingEvent): Promise<void> {
    const seatStatusMap: Record<BookingEvent['type'], SeatStatus> = {
      BOOKING_CREATED: SeatStatus.HELD,
      BOOKING_CONFIRMED: SeatStatus.BOOKED,
      BOOKING_EXPIRED: SeatStatus.AVAILABLE,
    };

    const newStatus = seatStatusMap[event.type];

    if (!newStatus) {
      console.log(`Unknown event type: ${event.type}`);
      return;
    }

    try {
      await this.inventoryService.updateSeat(
        event.showId,
        event.seatNumber,
        newStatus,
      );

      console.log(
        `Seat ${event.seatNumber} → ${newStatus} (${event.type})`,
      );
    } catch (error) {
      console.log(
        `Failed to process event ${event.type} for seat ${event.seatNumber}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}