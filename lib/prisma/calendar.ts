import { PrismaClient } from "@/prisma/generated/calendar";
import { resolveDomainDatabaseUrl } from "@/lib/prisma/shared";

const globalForCalendarPrisma = globalThis as typeof globalThis & {
  __calendarPrisma?: PrismaClient;
};

function createCalendarPrismaClient() {
  const databaseUrl = resolveDomainDatabaseUrl("CALENDAR_DATABASE_URL", {
    allowFallback: process.env.NODE_ENV !== "production",
  });

  if (!databaseUrl) {
    return new PrismaClient();
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

function getCalendarPrismaClient() {
  if (!globalForCalendarPrisma.__calendarPrisma) {
    globalForCalendarPrisma.__calendarPrisma = createCalendarPrismaClient();
  }

  return globalForCalendarPrisma.__calendarPrisma;
}

export const calendarPrisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const prismaClient = getCalendarPrismaClient();
    const value = prismaClient[property as keyof PrismaClient];

    if (typeof value === "function") {
      return value.bind(prismaClient);
    }

    return value;
  },
});
