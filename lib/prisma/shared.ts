type ResolveDomainDatabaseUrlOptions = {
  allowFallback?: boolean;
};

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
