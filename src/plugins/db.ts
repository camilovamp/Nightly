import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

const dbPlugin: FastifyPluginAsync = async (app) => {
  const prisma = new PrismaClient({
    log: app.log.level === 'debug' ? ['query', 'error', 'warn'] : ['error'],
  });

  await prisma.$connect();
  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

export default fp(dbPlugin, { name: 'prisma' });

//Without this, app.prisma would be unknown to TypeScript even though it works at runtime.
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
