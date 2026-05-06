import Fastify, { FastifyInstance } from 'fastify';
import { logger } from './plugins/logger.js';
import dbPlugin from './plugins/db.js';
import { roomsRoutes } from './routes/rooms.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: 1_048_576,
  });

  app.register(dbPlugin);
  app.register(roomsRoutes);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
