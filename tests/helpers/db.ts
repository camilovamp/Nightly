import { PrismaClient } from '@prisma/client';

// Wipe all tables in dependency order (children before parents).
// Phase 3b will replace this with per-file Testcontainers DBs.
export async function wipeDb(prisma: PrismaClient) {
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.room.deleteMany();
  await prisma.hotel.deleteMany();
}
