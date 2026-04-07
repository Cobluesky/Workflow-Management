import { PrismaClient } from "@/prisma/generated/tasks";
import { resolveDomainDatabaseUrl } from "@/lib/prisma/shared";

const globalForTasksPrisma = globalThis as typeof globalThis & {
  __tasksPrisma?: PrismaClient;
};

function createTasksPrismaClient() {
  const databaseUrl = resolveDomainDatabaseUrl("TASKS_DATABASE_URL", {
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

function getTasksPrismaClient() {
  if (!globalForTasksPrisma.__tasksPrisma) {
    globalForTasksPrisma.__tasksPrisma = createTasksPrismaClient();
  }

  return globalForTasksPrisma.__tasksPrisma;
}

export const tasksPrisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const prismaClient = getTasksPrismaClient();
    const value = prismaClient[property as keyof PrismaClient];

    if (typeof value === "function") {
      return value.bind(prismaClient);
    }

    return value;
  },
});
