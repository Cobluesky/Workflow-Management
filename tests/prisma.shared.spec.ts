import { afterEach, describe, expect, it } from "vitest";
import { resolveDomainDatabaseUrl } from "@/lib/prisma/shared";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  CALENDAR_DATABASE_URL: process.env.CALENDAR_DATABASE_URL,
};

afterEach(() => {
  if (ORIGINAL_ENV.NODE_ENV === undefined) {
    Reflect.deleteProperty(process.env, "NODE_ENV");
  } else {
    Object.assign(process.env, {
      NODE_ENV: ORIGINAL_ENV.NODE_ENV,
    });
  }

  if (ORIGINAL_ENV.DATABASE_URL === undefined) {
    Reflect.deleteProperty(process.env, "DATABASE_URL");
  } else {
    process.env.DATABASE_URL = ORIGINAL_ENV.DATABASE_URL;
  }

  if (ORIGINAL_ENV.CALENDAR_DATABASE_URL === undefined) {
    Reflect.deleteProperty(process.env, "CALENDAR_DATABASE_URL");
  } else {
    process.env.CALENDAR_DATABASE_URL = ORIGINAL_ENV.CALENDAR_DATABASE_URL;
  }
});

describe("resolveDomainDatabaseUrl", () => {
  it("returns the explicit domain database URL when present", () => {
    process.env.CALENDAR_DATABASE_URL = "mysql://calendar-db";
    process.env.DATABASE_URL = "mysql://app-db";

    expect(resolveDomainDatabaseUrl("CALENDAR_DATABASE_URL")).toBe("mysql://calendar-db");
  });

  it("falls back to DATABASE_URL when allowed", () => {
    Reflect.deleteProperty(process.env, "CALENDAR_DATABASE_URL");
    process.env.DATABASE_URL = "mysql://app-db";

    expect(
      resolveDomainDatabaseUrl("CALENDAR_DATABASE_URL", {
        allowFallback: true,
      })
    ).toBe("mysql://app-db");
  });

  it("throws when the split database URL is missing and fallback is disabled", () => {
    Reflect.deleteProperty(process.env, "CALENDAR_DATABASE_URL");
    process.env.DATABASE_URL = "mysql://app-db";

    expect(() => resolveDomainDatabaseUrl("CALENDAR_DATABASE_URL")).toThrow(
      "Missing required database env: CALENDAR_DATABASE_URL"
    );
  });
});
