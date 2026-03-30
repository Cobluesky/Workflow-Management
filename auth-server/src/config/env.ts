import "dotenv/config";
import { z } from "zod";

export function normalizeEnvString(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function normalizeOrigin(origin: string) {
  const normalized = normalizeEnvString(origin);

  return normalized.replace(/\/+$/, "");
}

export function parseOriginList(value: string) {
  return normalizeEnvString(value)
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

const normalizedString = z.preprocess((value) => {
  if (typeof value === "string") {
    return normalizeEnvString(value);
  }

  return value;
}, z.string().min(1));

const normalizedOptionalString = z.preprocess((value) => {
  if (typeof value === "string") {
    return normalizeEnvString(value);
  }

  return value;
}, z.string()).optional().default("");

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: normalizedString,
  JWT_ACCESS_SECRET: normalizedString,
  JWT_REFRESH_SECRET: normalizedString,
  JWT_ISSUER: normalizedString,
  JWT_AUDIENCE: normalizedString,
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: normalizedString,
  COOKIE_SECURE: booleanFromEnv.default(true),
  CLIENT_ORIGINS: normalizedString,
  GOOGLE_CLIENT_ID: normalizedOptionalString,
  GOOGLE_CLIENT_SECRET: normalizedOptionalString,
  GOOGLE_CALLBACK_URL: normalizedOptionalString,
  KAKAO_CLIENT_ID: normalizedOptionalString,
  KAKAO_CLIENT_SECRET: normalizedOptionalString,
  KAKAO_CALLBACK_URL: normalizedOptionalString,
  GITHUB_CLIENT_ID: normalizedOptionalString,
  GITHUB_CLIENT_SECRET: normalizedOptionalString,
  GITHUB_CALLBACK_URL: normalizedOptionalString
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("환경 변수 검증 실패", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  clientOrigins: parseOriginList(parsed.data.CLIENT_ORIGINS)
};
