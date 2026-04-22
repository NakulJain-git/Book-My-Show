import { Injectable, OnModuleInit } from '@nestjs/common';
import { rabbitMQ } from '../connection';
import { InventoryService } from '../../inventory-service.service';
import { SeatStatus } from '../../entities/seat-inventory.entity';

@Injectable()
export class BookingEventsConsumer implements OnModuleInit {
  constructor(private readonly inventoryService: InventoryService) {}

  async onModuleInit() {
    await rabbitMQ.consume('booking_events', async (msg) => {
      if (!msg) return;

      let event: any;

      try {
        event = JSON.parse(msg.content.toString());
      } catch (err) {
        console.error('[Inventory] Invalid JSON event');
        return;
      }

      const { type, showId, seatNumber } = event;

      if (!showId || !seatNumber) {
        console.error('[Inventory] Missing fields in event', event);
        return;
      }

      try {
        switch (type) {
          case 'BOOKING_CREATED':
            await this.inventoryService.updateSeat(
              showId,
              seatNumber,
              SeatStatus.HELD,
            );
            console.log(`[Inventory] ${seatNumber} → HELD`);
            break;

          case 'BOOKING_CONFIRMED':
            await this.inventoryService.updateSeat(
              showId,
              seatNumber,
              SeatStatus.BOOKED,
            );
            console.log(`[Inventory] ${seatNumber} → BOOKED`);
            break;

          case 'BOOKING_EXPIRED':
            await this.inventoryService.updateSeat(
              showId,
              seatNumber,
              SeatStatus.AVAILABLE,
            );
            console.log(`[Inventory] ${seatNumber} → AVAILABLE`);
            break;

          default:
            console.warn('[Inventory] Unknown event:', type);
        }
      } catch (err) {
        console.error('[Inventory] Error processing event', err);
      }
    });
  }
}