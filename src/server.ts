import Fastify from 'fastify';
import { env } from './config/env.js';
import { logger } from './plugins/logger.js';

const app = Fastify({
  loggerInstance: logger,
  trustProxy: true,
});

app.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info({ port: env.PORT }, 'server started');
  } catch (err) {
    logger.fatal({ err }, 'server failed to start');
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'shutdown initiated');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
