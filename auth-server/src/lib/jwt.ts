import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AccessTokenClaims {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export interface RefreshTokenClaims {
  sub: string;
  tokenId: string;
}

export interface JwtPayload extends AccessTokenClaims {
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export function signAccessToken(payload: AccessTokenClaims) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
}

export function signRefreshToken(payload: RefreshTokenClaims) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  }) as JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  }) as RefreshTokenClaims;
}
