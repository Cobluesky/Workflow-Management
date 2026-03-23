import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

interface OAuthStatePayload {
  provider: string;
  redirectUri: string;
}

export function signOAuthState(payload: OAuthStatePayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "10m",
    issuer: env.JWT_ISSUER,
    audience: `${env.JWT_AUDIENCE}:oauth-state`
  });
}

export function verifyOAuthState(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: `${env.JWT_AUDIENCE}:oauth-state`
  }) as OAuthStatePayload;
}
