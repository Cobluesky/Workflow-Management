import { PrismaClient } from "@/prisma/generated/timetable";
import { resolveDomainDatabaseUrl } from "@/lib/prisma/shared";

const globalForTimetablePrisma = globalThis as typeof globalThis & {
  __timetablePrisma?: PrismaClient;
};

function createTimetablePrismaClient() {
  const databaseUrl = resolveDomainDatabaseUrl("TIMETABLE_DATABASE_URL", {
    allowFallback: true,
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

export const timetablePrisma =
  globalForTimetablePrisma.__timetablePrisma ?? createTimetablePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForTimetablePrisma.__timetablePrisma = timetablePrisma;
}
