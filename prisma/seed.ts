import { PrismaClient, BookingStatus, PaymentStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const HOTELS = [
  { slug: 'aspen-mountain-lodge', name: 'Aspen Mountain Lodge', city: 'Aspen',    country: 'US', latitude: 39.1911, longitude: -106.8175, baseRate: 420 },
  { slug: 'south-beach-loft',     name: 'South Beach Loft',     city: 'Miami',    country: 'US', latitude: 25.7825, longitude:  -80.1340, baseRate: 280 },
  { slug: 'soho-townhouse',       name: 'SoHo Townhouse',       city: 'New York', country: 'US', latitude: 40.7233, longitude:  -74.0030, baseRate: 350 },
];

const ROOM_TYPES = [
  { type: 'single', capacity: 1, multiplier: 1.0 },
  { type: 'double', capacity: 2, multiplier: 1.4 },
  { type: 'suite',  capacity: 4, multiplier: 2.5 },
  { type: 'deluxe', capacity: 4, multiplier: 3.0 },
];

async function main() {
  console.log('clearing...');
  // child rows first to satisfy FKs
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.room.deleteMany();
  await prisma.hotel.deleteMany();

  console.log('hotels...');
  for (const h of HOTELS) {
    await prisma.hotel.create({ data: h });
  }

  console.log('rooms...');
  const hotels = await prisma.hotel.findMany();
  for (const hotel of hotels) {
    for (let floor = 1; floor <= 5; floor++) {
      for (let n = 1; n <= 10; n++) {
        const rt = ROOM_TYPES[(floor + n) % ROOM_TYPES.length];
        await prisma.room.create({
          data: {
            hotelId: hotel.id,
            roomNumber: `${floor}${n.toString().padStart(2, '0')}`,
            roomType: rt.type,
            capacity: rt.capacity,
            baseRate: Number(hotel.baseRate) * rt.multiplier,
          },
        });
      }
    }
  }
  const rooms = await prisma.room.findMany();
  console.log(`  ${rooms.length} rooms`);

  console.log('guests...');
  const guestData = [];
  for (let i = 0; i < 800; i++) {
    guestData.push({
      email: `g${i}_${faker.internet.username().toLowerCase()}@example.com`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
    });
  }
  await prisma.guest.createMany({ data: guestData });
  const guests = await prisma.guest.findMany();
  console.log(`  ${guests.length} guests`);

  console.log('bookings (this is the slow part)...');
  const start = new Date();
  start.setMonth(start.getMonth() - 12);
  const end = new Date();
  end.setMonth(end.getMonth() + 6);

  const bookingsData: any[] = [];
  for (const room of rooms) {
    const cursor = new Date(start);
    while (cursor < end) {
      cursor.setDate(cursor.getDate() + faker.number.int({ min: 0, max: 15 }));
      if (cursor >= end) break;

      const nights = faker.number.int({ min: 1, max: 5 });
      const checkIn = new Date(cursor);
      const checkOut = new Date(cursor);
      checkOut.setDate(checkOut.getDate() + nights);
      if (checkOut >= end) break;

      const status = pickStatus(checkIn);
      const guest = guests[faker.number.int({ min: 0, max: guests.length - 1 })];
      const ratePerNight = Number(room.baseRate) * faker.number.float({ min: 0.85, max: 1.4 });

      bookingsData.push({
        hotelId: room.hotelId,
        roomId: room.id,
        guestId: guest.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        totalAmount: Number((ratePerNight * nights).toFixed(2)),
        status,
      });

      cursor.setDate(checkOut.getDate() + faker.number.int({ min: 0, max: 3 }));
    }
  }

  // chunked because Postgres caps at ~65K bind params per statement
  const CHUNK = 1000;
  for (let i = 0; i < bookingsData.length; i += CHUNK) {
    await prisma.booking.createMany({ data: bookingsData.slice(i, i + CHUNK) });
  }
  console.log(`  ${bookingsData.length} bookings`);

  console.log('payments...');
  const paid = await prisma.booking.findMany({
    where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
    select: { id: true, totalAmount: true, status: true },
  });
  const paymentsData = paid.map((b) => ({
    bookingId: b.id,
    amount: b.totalAmount,
    status: b.status === BookingStatus.COMPLETED ? PaymentStatus.CAPTURED : PaymentStatus.AUTHORIZED,
    processedAt: new Date(),
  }));
  for (let i = 0; i < paymentsData.length; i += CHUNK) {
    await prisma.payment.createMany({ data: paymentsData.slice(i, i + CHUNK) });
  }
  console.log(`  ${paymentsData.length} payments`);

  console.log('done.');
}

function pickStatus(checkIn: Date): BookingStatus {
  const now = new Date();
  if (checkIn < now) {
    const r = Math.random();
    if (r < 0.85) return BookingStatus.COMPLETED;
    if (r < 0.97) return BookingStatus.CANCELLED;
    return BookingStatus.PENDING;
  }
  const r = Math.random();
  if (r < 0.75) return BookingStatus.CONFIRMED;
  if (r < 0.92) return BookingStatus.PENDING;
  return BookingStatus.CANCELLED;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
