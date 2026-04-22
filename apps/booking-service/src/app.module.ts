import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'apps/booking-service/src/redis/src';
import { typeOrmConfig } from './config/typeorm.config';
import { BookingModule } from './booking-service.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: typeOrmConfig,
    }),
    RedisModule,
    BookingModule,
  ],
})
export class AppModule {}
