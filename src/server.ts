import Fastify, { FastifyInstance } from 'fastify';
import { logger } from './plugins/logger.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: 1_048_576,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
