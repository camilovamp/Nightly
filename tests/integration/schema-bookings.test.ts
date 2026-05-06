import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, BookingStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

describe('Booking domain schema', () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });

  beforeEach(async () => {
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.outboxEvent.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.guest.deleteMany();
    await prisma.room.deleteMany();
    await prisma.hotel.deleteMany();
  });

  async function makeHotelWithRoom() {
    const hotel = await prisma.hotel.create({
      data: {
        slug: 'sx-test',
        name: 'SX Test',
        city: 'Aspen',
        country: 'US',
        latitude: 39.19,
        longitude: -106.81,
        baseRate: 400,
      },
    });
    const room = await prisma.room.create({
      data: { hotelId: hotel.id, roomNumber: '101', roomType: 'double', capacity: 2, baseRate: 580 },
    });
    return { hotel, room };
  }

  it('creates a guest with int PK and uuid', async () => {
    const guest = await prisma.guest.create({
      data: { email: 'a@example.com', firstName: 'Alice', lastName: 'Anderson' },
    });
    expect(typeof guest.id).toBe('number');
    expect(guest.uuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('creates a booking linking hotel, room, and guest', async () => {
    const { hotel, room } = await makeHotelWithRoom();
    const guest = await prisma.guest.create({
      data: { email: 'a@example.com', firstName: 'Alice', lastName: 'Anderson' },
    });

    const booking = await prisma.booking.create({
      data: {
        hotelId: hotel.id,
        roomId: room.id,
        guestId: guest.id,
        checkInDate: new Date('2026-06-01'),
        checkOutDate: new Date('2026-06-04'),
        totalAmount: 1740,
        status: BookingStatus.CONFIRMED,
      },
    });
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
    expect(Number(booking.totalAmount)).toBe(1740);
  });

  it('creates a payment linked to a booking', async () => {
    const { hotel, room } = await makeHotelWithRoom();
    const guest = await prisma.guest.create({
      data: { email: 'a@example.com', firstName: 'Alice', lastName: 'Anderson' },
    });
    const booking = await prisma.booking.create({
      data: {
        hotelId: hotel.id,
        roomId: room.id,
        guestId: guest.id,
        checkInDate: new Date('2026-06-01'),
        checkOutDate: new Date('2026-06-04'),
        totalAmount: 1740,
      },
    });

    const payment = await prisma.payment.create({
      data: { bookingId: booking.id, amount: 1740, status: PaymentStatus.AUTHORIZED },
    });
    expect(payment.status).toBe(PaymentStatus.AUTHORIZED);
    expect(payment.currency).toBe('USD');
  });

  it('rejects duplicate idempotency keys for the same endpoint', async () => {
    await prisma.idempotencyKey.create({
      data: {
        key: 'abc123',
        endpoint: 'POST /bookings',
        responseStatus: 201,
        responseBody: { ok: true },
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });

    await expect(
      prisma.idempotencyKey.create({
        data: {
          key: 'abc123',
          endpoint: 'POST /bookings',
          responseStatus: 201,
          responseBody: { ok: true },
          expiresAt: new Date(Date.now() + 86400_000),
        },
      })
    ).rejects.toThrow();
  });

  it('allows the same idempotency key for different endpoints', async () => {
    await prisma.idempotencyKey.create({
      data: {
        key: 'abc123',
        endpoint: 'POST /bookings',
        responseStatus: 201,
        responseBody: { ok: true },
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });

    const second = await prisma.idempotencyKey.create({
      data: {
        key: 'abc123',
        endpoint: 'POST /payments',
        responseStatus: 201,
        responseBody: { ok: true },
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });
    expect(second.id).toBeDefined();
  });

  it('stores outbox events with json payload and nullable processedAt', async () => {
    const event = await prisma.outboxEvent.create({
      data: {
        aggregateType: 'booking',
        aggregateId: 'some-uuid',
        eventType: 'booking.confirmed',
        payload: { bookingUuid: 'some-uuid', amount: 1740 },
      },
    });
    expect(event.processedAt).toBeNull();
    expect(event.payload).toEqual({ bookingUuid: 'some-uuid', amount: 1740 });
  });
});
