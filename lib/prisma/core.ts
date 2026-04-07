import { PrismaClient } from "@/prisma/generated/workspace-core";
import { resolveDomainDatabaseUrl } from "@/lib/prisma/shared";

const globalForCorePrisma = globalThis as typeof globalThis & {
  __workspaceCorePrisma?: PrismaClient;
};

function createCorePrismaClient() {
  const databaseUrl = resolveDomainDatabaseUrl("WORKSPACE_CORE_DATABASE_URL", {
    allowFallback: process.env.NODE_ENV !== "production",
  });

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

function getCorePrismaClient() {
  if (!globalForCorePrisma.__workspaceCorePrisma) {
    globalForCorePrisma.__workspaceCorePrisma = createCorePrismaClient();
  }

  return globalForCorePrisma.__workspaceCorePrisma;
}

export const corePrisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const prismaClient = getCorePrismaClient();
    const value = prismaClient[property as keyof PrismaClient];

    if (typeof value === "function") {
      return value.bind(prismaClient);
    }

    return value;
  },
});
