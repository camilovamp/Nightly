import { PrismaClient } from '@prisma/client';

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
  await prisma.room.deleteMany();
  await prisma.hotel.deleteMany();

  console.log('hotels...');
  for (const h of HOTELS) {
    await prisma.hotel.create({ data: h });
  }

  console.log('rooms...');
  const hotels = await prisma.hotel.findMany();
  let roomCount = 0;
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
        roomCount++;
      }
    }
  }
  console.log(`  ${roomCount} rooms`);
  console.log('done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
