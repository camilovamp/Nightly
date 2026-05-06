import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const paramsSchema = z.object({
  uuid: z.string().uuid(),
});

const querySchema = z.object({
  roomType: z.enum(['single', 'double', 'suite', 'deluxe']).optional(),
  minCapacity: z.coerce.number().int().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sortBy: z.enum(['price', 'capacity']).default('price'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const roomsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/hotels/:uuid/rooms', async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid path parameter' });
    }

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        error: 'invalid query parameters',
        details: query.error.flatten(),
      });
    }

    const hotel = await app.prisma.hotel.findUnique({
      where: { uuid: params.data.uuid },
      select: { id: true, uuid: true, name: true },
    });
    if (!hotel) {
      return reply.status(404).send({ error: 'hotel not found' });
    }

    const { roomType, minCapacity, maxPrice, sortBy, sortDir, page, limit } = query.data;

    const where = {
      hotelId: hotel.id,
      ...(roomType && { roomType }),
      ...(minCapacity && { capacity: { gte: minCapacity } }),
      ...(maxPrice && { baseRate: { lte: maxPrice } }),
    };

    const orderBy = sortBy === 'price'
      ? { baseRate: sortDir }
      : { capacity: sortDir };

    // Promise.all cause they're independent queries.
    const [rooms, total] = await Promise.all([
      app.prisma.room.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          uuid: true,
          roomNumber: true,
          roomType: true,
          capacity: true,
          baseRate: true,
        },
      }),
      app.prisma.room.count({ where }),
    ]);

    return {
      data: rooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      hotel: { uuid: hotel.uuid, name: hotel.name },
    };
  });
};
