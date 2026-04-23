# 🎬 BookMyShow Microservices Backend (NestJS + Event-Driven Architecture)

A **scalable, event-driven microservices backend system** inspired by BookMyShow, built using **NestJS, Redis, RabbitMQ, PostgreSQL, Docker, and Nginx**.

This project demonstrates real-world backend system design concepts like:
- Distributed systems
- Event-driven architecture
- Concurrency control
- Seat locking with Redis
- Eventual consistency
- Microservices communication via message queues

---

## 📌 System Architecture

<img width="1344" height="705" alt="architecture" src="https://github.com/user-attachments/assets/1d2ae6a6-20e8-4370-9f56-b2e965803baa" />

---

## 🧱 Tech Stack

- **Backend Framework:** NestJS (Node.js)
- **Database:** PostgreSQL (TypeORM)
- **Cache / Locking:** Redis (Distributed Locks)
- **Message Broker:** RabbitMQ (Event-driven communication)
- **Reverse Proxy:** Nginx
- **Containerization:** Docker & Docker Compose

---

## 🧩 Microservices Overview

### 1. 🎟️ Booking Service
**Port:** `3001`

Responsible for:
- Creating bookings (`POST /bookings`)
- Checking seat availability
- Acquiring Redis distributed locks (`seat-level locking`)
- Publishing booking events
- Handling booking expiry (5-minute window)
- Consuming payment success events

**Key Features:**
- Redis lock: `lock:seat:{showId}:{seatNumber}`
- Prevents double booking under concurrency
- Publishes:
  - `BOOKING_CREATED`
  - `BOOKING_CONFIRMED`
  - `BOOKING_EXPIRED`

---

### 2. 🎬 Inventory Service
**Port:** `3003`

Responsible for:
- Managing shows and seat inventory
- Creating shows (`POST /shows`)
- Listing shows (`GET /shows`)
- Updating seat states

**Consumes Events:**
- `BOOKING_CREATED` → Marks seat as **HELD**
- `BOOKING_CONFIRMED` → Marks seat as **BOOKED**
- `BOOKING_EXPIRED` → Frees seat

---

### 3. 💳 Payment Service
**Port:** `3002`

Responsible for:
- Payment initiation (`POST /payments/initiate`)
- Payment webhook handling
- Idempotent payment processing
- Refund handling (via failed bookings)

**Consumes:**
- `BOOKING_FAILED`

**Publishes:**
- `payment.success`

---

## 🔄 Event-Driven Communication (RabbitMQ)

### Queues Used:
- `booking_events` → Booking lifecycle events
- `payment.success` → Payment confirmation events
- `booking.failed` → Failure handling / refunds
- `EXPIRY_QUEUE` → Delayed booking expiration
- `PROCESS_QUEUE` → Final expiry processing

---

## ⚙️ Core Workflows

### 🎟️ Booking Flow

1. User creates booking → `POST /bookings`
2. Redis lock acquired for seat
3. Booking stored as **PENDING**
4. `BOOKING_CREATED` event published
5. Inventory service marks seat as **HELD**
6. User initiates payment
7. Payment success triggers `payment.success`
8. Booking service confirms booking
9. Seat marked as **BOOKED**

---

### ⏳ Booking Expiry Flow (5 min window)

1. Booking created
2. Delayed message sent to `EXPIRY_QUEUE`
3. After timeout → processed in `PROCESS_QUEUE`
4. If not confirmed → booking marked **EXPIRED**
5. Seat is released

---

### 💳 Payment Flow

1. Payment initiated with idempotency key
2. Payment processed
3. Webhook triggers success event
4. `payment.success` emitted
5. Booking service confirms booking

---

## 🔐 Concurrency Handling

### ✔ Redis Distributed Locking
Used to prevent multiple users booking the same seat:
lock:seat:{showId}:{seatNumber}

- Uses `SET NX EX`
- TTL-based automatic release
- Ensures single active booking per seat

---

### ✔ PostgreSQL ACID Guarantees
- Row-level locking for consistency
- Prevents race conditions at DB level
- Ensures transactional integrity

---

## 🗄️ Databases Per Service

| Service           | Database        |
|------------------|----------------|
| Booking Service   | booking_db     |
| Payment Service   | payment_db     |
| Inventory Service | inventory_db   |

---

## 🐳 Docker Setup

### Start Entire System

```bash
docker-compose up --build
```

## Main Components


PostgreSQL (shared DB server)


Redis (distributed lock manager)


RabbitMQ (message broker)


Booking Service


Payment Service


Inventory Service


Nginx (API Gateway)



## 🌐 Nginx Gateway
All services are exposed via:
http://localhost:8080
Routes:


/bookings → Booking Service


/payments → Payment Service


/shows → Inventory Service



## ⚙️ Environment Variables
Each service uses:
DB_HOST=postgresDB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=<service_db>
REDIS_HOST=redis
REDIS_PORT=6379
RABBITMQ_URL=amqp://rabbitmq:5672

## 🚀 Key Design Patterns Used


✔ Event-Driven Architecture


✔ Distributed Locking (Redis)


✔ Idempotency (Payments)


✔ Eventual Consistency


✔ CQRS-style separation (commands vs events)


✔ Delayed messaging for expiry logic


✔ Microservices isolation per domain


## 👨‍💻 Author
Built by Nakul Jain
GitHub: NakulJain-git
