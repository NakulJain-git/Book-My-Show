export interface BookingEvent {
  type: 'BOOKING_CREATED' | 'BOOKING_CONFIRMED' | 'BOOKING_EXPIRED';
  showId: string;
  seatNumber: string;
}