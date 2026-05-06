import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { wipeDb } from '../helpers/db.js';


const prisma = new PrismaClient();

describe('Hotel + Room schema', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // each test gets a clean slate
    await wipeDb(prisma);
    await prisma.room.deleteMany();
    await prisma.hotel.deleteMany();
  });

  it('round-trips a hotel and assigns id/uuid/timestamps', async () => {
    const created = await prisma.hotel.create({
      data: {
        slug: 'test-aspen',
        name: 'Aspen Mountain Lodge',
        city: 'Aspen',
        country: 'US',
        latitude: 39.1911,
        longitude: -106.8175,
        baseRate: 420,
      },
    });

    expect(created.id).toBeTypeOf('number');
    expect(created.uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);

    const fetched = await prisma.hotel.findUniqueOrThrow({ where: { id: created.id } });
    expect(fetched.slug).toBe('test-aspen');
    expect(Number(fetched.baseRate)).toBe(420);
  });

  it('looks up a hotel by uuid (the public identifier)', async () => {
    const created = await prisma.hotel.create({
      data: {
        slug: 'test-aspen',
        name: 'Aspen Mountain Lodge',
        city: 'Aspen',
        country: 'US',
        latitude: 39.1911,
        longitude: -106.8175,
        baseRate: 420,
      },
    });

    const byUuid = await prisma.hotel.findUnique({ where: { uuid: created.uuid } });
    expect(byUuid?.slug).toBe('test-aspen');
  });

  it('links a room to its hotel via int Foraign Key', async () => {
    const hotel = await prisma.hotel.create({
      data: {
        slug: 'test-aspen',
        name: 'Aspen Mountain Lodge',
        city: 'Aspen',
        country: 'US',
        latitude: 39.1911,
        longitude: -106.8175,
        baseRate: 420,
      },
    });

    const room = await prisma.room.create({
      data: {
        hotelId: hotel.id,
        roomNumber: '101',
        roomType: 'double',
        capacity: 2,
        baseRate: 588,
      },
    });

    expect(room.hotelId).toBe(hotel.id);
    expect(typeof room.hotelId).toBe('number');
    expect(room.roomNumber).toBe('101');
  });

  it('rejects duplicate room numbers in the same hotel', async () => {
    const hotel = await prisma.hotel.create({
      data: {
        slug: 'test-aspen',
        name: 'Aspen Mountain Lodge',
        city: 'Aspen',
        country: 'US',
        latitude: 39.1911,
        longitude: -106.8175,
        baseRate: 420,
      },
    });

    await prisma.room.create({
      data: { hotelId: hotel.id, roomNumber: '101', roomType: 'double', capacity: 2, baseRate: 588 },
    });

    await expect(
      prisma.room.create({
        data: { hotelId: hotel.id, roomNumber: '101', roomType: 'suite', capacity: 4, baseRate: 1050 },
      })
    ).rejects.toThrow();
  });
});
