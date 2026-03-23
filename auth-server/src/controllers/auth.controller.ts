import type { Request, Response } from "express";
import { clearRefreshCookie, getRefreshCookieOptions } from "../config/cookie.js";
import { REFRESH_COOKIE_NAME } from "../config/constants.js";
import { isSupportedOAuthProvider } from "../config/oauth.js";
import { AppError } from "../lib/app-error.js";
import { authService } from "../services/auth.service.js";
import { oauthService } from "../services/oauth.service.js";

function getClientMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip
  };
}

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      data: result
    });
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body, getClientMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user
      }
    });
  },

  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      throw new AppError(401, "REFRESH_TOKEN_MISSING", "리프레시 토큰이 없습니다.");
    }

    const result = await authService.refresh(refreshToken, getClientMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken
      }
    });
  },

  async verify(req: Request, res: Response) {
    if (!req.auth?.sub) {
      throw new AppError(401, "UNAUTHORIZED", "인증 정보가 없습니다.");
    }

    const user = await authService.verifyUser(req.auth.sub);

    return res.status(200).json({
      success: true,
      data: {
        isValid: true,
        user
      }
    });
  },

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      data: {
        message: "Logged out successfully"
      }
    });
  },

  async provider(req: Request, res: Response) {
    const provider = String(req.params.provider);

    if (!isSupportedOAuthProvider(provider)) {
      throw new AppError(404, "UNSUPPORTED_PROVIDER", "지원하지 않는 OAuth 공급자입니다.");
    }

    const redirectUri = typeof req.query.redirectUri === "string" ? req.query.redirectUri : undefined;
    const result = oauthService.getAuthorizationUrl(provider, redirectUri);

    return res.redirect(result.authorizationUrl);
  },

  async callback(req: Request, res: Response) {
    const provider = String(req.params.provider);
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;

    if (!isSupportedOAuthProvider(provider)) {
      throw new AppError(404, "UNSUPPORTED_PROVIDER", "지원하지 않는 OAuth 공급자입니다.");
    }

    if (!code || !state) {
      throw new AppError(400, "INVALID_OAUTH_CALLBACK", "OAuth callback 파라미터가 올바르지 않습니다.");
    }

    const result = await oauthService.handleCallback(provider, code, state, getClientMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

    return res.redirect(result.redirectUrl);
  }
};
