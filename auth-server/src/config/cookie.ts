import type { CookieOptions } from "express";
import { env } from "./env.js";
import { REFRESH_COOKIE_NAME } from "./constants.js";

export function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    domain: env.COOKIE_DOMAIN,
    path: "/",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  };
}

export function clearRefreshCookie(res: {
  clearCookie: (name: string, options: CookieOptions) => void;
}) {
  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
}
