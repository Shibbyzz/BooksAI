import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure DATABASE_URL for session pooler compatibility
const databaseUrl = process.env.DATABASE_URL
const poolerUrl = databaseUrl?.includes('pooler') 
  ? `${databaseUrl}?pgbouncer=true&connection_limit=1&pool_timeout=30`
  : databaseUrl

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: poolerUrl
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
