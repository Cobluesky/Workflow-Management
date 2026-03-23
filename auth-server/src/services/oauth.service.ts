import { AuthProvider } from "@prisma/client";
import { env } from "../config/env.js";
import { getOAuthProviderConfig, type SupportedOAuthProvider } from "../config/oauth.js";
import { AppError } from "../lib/app-error.js";
import { signOAuthState, verifyOAuthState } from "../lib/oauth-state.js";
import { userRepository } from "../repositories/user.repository.js";
import { tokenService } from "./token.service.js";

interface OAuthUserProfile {
  provider: AuthProvider;
  providerAccountId: string;
  email: string;
  name: string;
}

function resolveRedirectUri(redirectUri?: string) {
  const fallback = env.clientOrigins[0];

  if (!redirectUri) {
    return fallback;
  }

  let parsed: URL;

  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new AppError(400, "INVALID_REDIRECT_URI", "유효하지 않은 redirectUri 입니다.");
  }

  if (!env.clientOrigins.includes(parsed.origin)) {
    throw new AppError(400, "INVALID_REDIRECT_URI", "허용되지 않은 redirectUri 입니다.");
  }

  return parsed.toString();
}

async function exchangeCodeForAccessToken(provider: SupportedOAuthProvider, code: string) {
  const config = getOAuthProviderConfig(provider);

  if (!config) {
    throw new AppError(404, "UNSUPPORTED_PROVIDER", "지원하지 않는 OAuth 공급자입니다.");
  }

  if (!config.clientId || !config.clientSecret || !config.callbackUrl) {
    throw new AppError(500, "OAUTH_NOT_CONFIGURED", "OAuth 공급자 설정이 완료되지 않았습니다.");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.callbackUrl
  });

  if (provider !== "github") {
    params.set("grant_type", "authorization_code");
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!response.ok) {
    throw new AppError(502, "OAUTH_TOKEN_EXCHANGE_FAILED", "OAuth 토큰 교환에 실패했습니다.");
  }

  const payload = await response.json();
  const accessToken = payload.access_token as string | undefined;

  if (!accessToken) {
    throw new AppError(502, "OAUTH_TOKEN_EXCHANGE_FAILED", "OAuth 액세스 토큰이 없습니다.");
  }

  return accessToken;
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthUserProfile> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new AppError(502, "OAUTH_PROFILE_FETCH_FAILED", "Google 사용자 정보를 가져오지 못했습니다.");
  }

  const payload = await response.json();

  if (!payload.sub || !payload.email) {
    throw new AppError(502, "OAUTH_PROFILE_INVALID", "Google 사용자 정보가 올바르지 않습니다.");
  }

  return {
    provider: AuthProvider.GOOGLE,
    providerAccountId: String(payload.sub),
    email: String(payload.email),
    name: String(payload.name || payload.email)
  };
}

async function fetchKakaoProfile(accessToken: string): Promise<OAuthUserProfile> {
  const response = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new AppError(502, "OAUTH_PROFILE_FETCH_FAILED", "Kakao 사용자 정보를 가져오지 못했습니다.");
  }

  const payload = await response.json();
  const email = payload?.kakao_account?.email as string | undefined;
  const name = payload?.kakao_account?.profile?.nickname as string | undefined;

  if (!payload.id || !email) {
    throw new AppError(502, "OAUTH_PROFILE_INVALID", "Kakao 계정 이메일을 확인할 수 없습니다.");
  }

  return {
    provider: AuthProvider.KAKAO,
    providerAccountId: String(payload.id),
    email,
    name: name || email
  };
}

async function fetchGithubProfile(accessToken: string): Promise<OAuthUserProfile> {
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "workspace-auth-server"
    }
  });

  if (!userResponse.ok) {
    throw new AppError(502, "OAUTH_PROFILE_FETCH_FAILED", "GitHub 사용자 정보를 가져오지 못했습니다.");
  }

  const userPayload = await userResponse.json();
  let email = userPayload.email as string | null | undefined;

  if (!email) {
    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "workspace-auth-server"
      }
    });

    if (!emailResponse.ok) {
      throw new AppError(502, "OAUTH_PROFILE_FETCH_FAILED", "GitHub 이메일 정보를 가져오지 못했습니다.");
    }

    const emails = (await emailResponse.json()) as Array<{
      email: string;
      primary?: boolean;
      verified?: boolean;
    }>;

    email =
      emails.find((item) => item.primary && item.verified)?.email ??
      emails.find((item) => item.verified)?.email;
  }

  if (!userPayload.id || !email) {
    throw new AppError(502, "OAUTH_PROFILE_INVALID", "GitHub 계정 이메일을 확인할 수 없습니다.");
  }

  return {
    provider: AuthProvider.GITHUB,
    providerAccountId: String(userPayload.id),
    email,
    name: String(userPayload.name || userPayload.login || email)
  };
}

async function fetchOAuthUserProfile(provider: SupportedOAuthProvider, accessToken: string) {
  switch (provider) {
    case "google":
      return fetchGoogleProfile(accessToken);
    case "kakao":
      return fetchKakaoProfile(accessToken);
    case "github":
      return fetchGithubProfile(accessToken);
  }
}

export const oauthService = {
  getAuthorizationUrl(provider: SupportedOAuthProvider, redirectUri?: string) {
    const config = getOAuthProviderConfig(provider);

    if (!config) {
      throw new AppError(404, "UNSUPPORTED_PROVIDER", "지원하지 않는 OAuth 공급자입니다.");
    }

    if (!config.clientId || !config.callbackUrl) {
      throw new AppError(500, "OAUTH_NOT_CONFIGURED", "OAuth 공급자 설정이 완료되지 않았습니다.");
    }

    const resolvedRedirectUri = resolveRedirectUri(redirectUri);
    const state = signOAuthState({
      provider,
      redirectUri: resolvedRedirectUri
    });

    const authorizationUrl = new URL(config.authorizeUrl);
    authorizationUrl.searchParams.set("client_id", config.clientId);
    authorizationUrl.searchParams.set("redirect_uri", config.callbackUrl);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", config.scope);
    authorizationUrl.searchParams.set("state", state);

    if (provider === "github") {
      authorizationUrl.searchParams.set("allow_signup", "true");
    }

    return {
      authorizationUrl: authorizationUrl.toString()
    };
  },

  async handleCallback(
    provider: SupportedOAuthProvider,
    code: string,
    stateToken: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ) {
    let statePayload: { provider: string; redirectUri: string };

    try {
      statePayload = verifyOAuthState(stateToken);
    } catch {
      throw new AppError(400, "INVALID_OAUTH_STATE", "유효하지 않은 OAuth state 입니다.");
    }

    if (statePayload.provider !== provider) {
      throw new AppError(400, "INVALID_OAUTH_STATE", "OAuth state의 공급자 정보가 일치하지 않습니다.");
    }

    const accessToken = await exchangeCodeForAccessToken(provider, code);
    const profile = await fetchOAuthUserProfile(provider, accessToken);
    const existingAccount = await userRepository.findOAuthAccount(profile.provider, profile.providerAccountId);

    let user = existingAccount?.user ?? (await userRepository.findByEmail(profile.email));

    if (!user) {
      user = await userRepository.createOAuthUser({
        email: profile.email,
        name: profile.name,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId
      });
    }

    if (!existingAccount) {
      const linkedAccount = await userRepository.findOAuthAccount(profile.provider, profile.providerAccountId);

      if (!linkedAccount) {
        try {
          await userRepository.linkOAuthAccount({
            userId: user.id,
            provider: profile.provider,
            providerAccountId: profile.providerAccountId
          });
        } catch {
          // Ignore duplicate-link race and continue with the authenticated user.
        }
      }
    }

    const tokens = await tokenService.issueTokens({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress
    });

    const redirectUrl = new URL(statePayload.redirectUri);
    redirectUrl.searchParams.set("accessToken", tokens.accessToken);

    return {
      redirectUrl: redirectUrl.toString(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }
};
