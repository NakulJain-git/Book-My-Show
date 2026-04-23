import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'http://localhost:8080/api/v1';
const SHOW_ID = 'SHOW_ID';

// SEAT TO BE TESTED FOR ALL REQUESTS
const SEAT = 'A1';

export const options = {
  vus: 100,          // 100 concurrent users
  iterations: 1000,  // total 1000 booking attempts
};

export default function () {
  const payload = JSON.stringify({
    userId: `user-${__VU}-${__ITER}`,
    showId: SHOW_ID,
    seatNumber: SEAT,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/bookings`, payload, params);

  check(res, {
    'request processed': (r) => r.status !== 0,
  });
}