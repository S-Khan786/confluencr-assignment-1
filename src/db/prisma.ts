import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple PrismaClient instances in development / hot reload
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = globalThis.prismaGlobal ?? new PrismaClient({
  log: process.env.NODE_ENV === 'test' ? [] : ['warn', 'error']
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
