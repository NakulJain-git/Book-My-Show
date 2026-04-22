// inventory.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatInventory } from './entities/seat-inventory.entity';
import { InventoryService } from './inventory-service.service';
import { InventoryController } from './inventory-service.controller';
import { BookingEventsConsumer } from './rabbitmq/consumers/booking-event.consumer';
import { Show } from './entities/show.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SeatInventory,Show])],
  providers: [InventoryService, BookingEventsConsumer],
  controllers: [InventoryController],
})
export class InventoryModule {}