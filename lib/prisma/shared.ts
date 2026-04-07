type ResolveDomainDatabaseUrlOptions = {
  allowFallback?: boolean;
};

const STORAGE_UNAVAILABLE_PRISMA_CODES = new Set([
  "P1000",
  "P1001",
  "P1003",
  "P1008",
  "P1010",
  "P1017",
  "P2021",
  "P2022",
  "P2024",
]);

export function resolveDomainDatabaseUrl(
  domainEnvKey: string,
  options: ResolveDomainDatabaseUrlOptions = {}
) {
  const explicitDatabaseUrl = process.env[domainEnvKey];

  if (explicitDatabaseUrl) {
    return explicitDatabaseUrl;
  }

  if (options.allowFallback) {
    return process.env.DATABASE_URL;
  }

  throw new Error(`Missing required database env: ${domainEnvKey}`);
}

export function isDomainStorageUnavailableError(error: unknown, domainEnvKey: string) {
  if (error instanceof Error) {
    if (error.message.includes(`Missing required database env: ${domainEnvKey}`)) {
      return true;
    }

    const unavailableMessagePatterns = [
      "Can't reach database server",
      "does not exist in the current database",
      "The table",
      "Unknown database",
      "Access denied",
    ];

    if (unavailableMessagePatterns.some((pattern) => error.message.includes(pattern))) {
      return true;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return STORAGE_UNAVAILABLE_PRISMA_CODES.has((error as { code: string }).code);
  }

  return false;
}
