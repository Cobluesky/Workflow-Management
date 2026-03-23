import { AuthProvider } from "@prisma/client";
import { env } from "./env.js";

export interface OAuthProviderConfig {
  name: AuthProvider;
  authorizeUrl: string;
  tokenUrl: string;
  callbackUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
}

export type SupportedOAuthProvider = "google" | "kakao" | "github";

const providers: Record<SupportedOAuthProvider, OAuthProviderConfig> = {
  google: {
    name: AuthProvider.GOOGLE,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    callbackUrl: env.GOOGLE_CALLBACK_URL,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    scope: "openid email profile"
  },
  kakao: {
    name: AuthProvider.KAKAO,
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    callbackUrl: env.KAKAO_CALLBACK_URL,
    clientId: env.KAKAO_CLIENT_ID,
    clientSecret: env.KAKAO_CLIENT_SECRET,
    scope: "profile_nickname account_email"
  },
  github: {
    name: AuthProvider.GITHUB,
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    callbackUrl: env.GITHUB_CALLBACK_URL,
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    scope: "read:user user:email"
  }
};

export function isSupportedOAuthProvider(value: string): value is SupportedOAuthProvider {
  return value in providers;
}

export function getOAuthProviderConfig(provider: string) {
  if (!isSupportedOAuthProvider(provider)) {
    return null;
  }

  return providers[provider];
}
