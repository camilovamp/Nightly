import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';

const prisma = new PrismaClient();

describe('GET /hotels/:uuid/rooms', () => {
  let app: FastifyInstance;
  let hotelUuid: string;
  let hotelId: number;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    await prisma.$connect();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.room.deleteMany();
    await prisma.hotel.deleteMany();

    const hotel = await prisma.hotel.create({
      data: {
        slug: 'test-hotel',
        name: 'Test Hotel',
        city: 'Aspen',
        country: 'US',
        latitude: 39.1911,
        longitude: -106.8175,
        baseRate: 400,
      },
    });
    hotelUuid = hotel.uuid;
    hotelId = hotel.id;

    const otherHotel = await prisma.hotel.create({
      data: {
        slug: 'other-hotel',
        name: 'Other Hotel',
        city: 'Miami',
        country: 'US',
        latitude: 25.78,
        longitude: -80.13,
        baseRate: 300,
      },
    });

    await prisma.room.createMany({
      data: [
        { hotelId, roomNumber: '101', roomType: 'single', capacity: 1, baseRate: 100 },
        { hotelId, roomNumber: '102', roomType: 'double', capacity: 2, baseRate: 200 },
        { hotelId, roomNumber: '103', roomType: 'double', capacity: 2, baseRate: 250 },
        { hotelId, roomNumber: '104', roomType: 'suite',  capacity: 4, baseRate: 500 },
        { hotelId, roomNumber: '105', roomType: 'deluxe', capacity: 4, baseRate: 700 },
      ],
    });

    await prisma.room.create({
      data: { hotelId: otherHotel.id, roomNumber: '201', roomType: 'single', capacity: 1, baseRate: 80 },
    });
  });

  it('returns only the rooms for the requested hotel', async () => {
    const res = await app.inject({ method: 'GET', url: `/hotels/${hotelUuid}/rooms` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(5);
    expect(body.pagination.total).toBe(5);
  });

  it('returns 404 for an unknown hotel uuid', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/hotels/00000000-0000-0000-0000-000000000000/rooms`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for a malformed uuid in the path', async () => {
    const res = await app.inject({ method: 'GET', url: `/hotels/not-a-uuid/rooms` });
    expect(res.statusCode).toBe(400);
  });

  it('filters by roomType', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/hotels/${hotelUuid}/rooms?roomType=double`,
    });
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data.every((r: any) => r.roomType === 'double')).toBe(true);
  });

  it('filters by minCapacity', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/hotels/${hotelUuid}/rooms?minCapacity=4`,
    });
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data.every((r: any) => r.capacity >= 4)).toBe(true);
  });

  it('filters by maxPrice', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/hotels/${hotelUuid}/rooms?maxPrice=300`,
    });
    const body = res.json();
    expect(body.data).toHaveLength(3);
  });

  it('sorts by price descending', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/hotels/${hotelUuid}/rooms?sortBy=price&sortDir=desc`,
    });
    const body = res.json();
    const prices = body.data.map((r: any) => Number(r.baseRate));
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it('paginates correctly (page 2 of limit 2)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/hotels/${hotelUuid}/rooms?limit=2&page=2&sortBy=price&sortDir=asc`,
    });
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.totalPages).toBe(3);

    expect(body.data.map((r: any) => Number(r.baseRate))).toEqual([250, 500]);
  });

  it('rejects a sortBy column not in the whitelist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/hotels/${hotelUuid}/rooms?sortBy=base_rate;DROP TABLE rooms`,
    });
    expect(res.statusCode).toBe(400);
  });

  it('does not expose internal int id in the response', async () => {
    const res = await app.inject({ method: 'GET', url: `/hotels/${hotelUuid}/rooms` });
    const body = res.json();
    for (const room of body.data) {
      expect(room).not.toHaveProperty('id');
      expect(room).toHaveProperty('uuid');
    }
  });
});
