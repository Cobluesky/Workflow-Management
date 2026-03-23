import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { sha256 } from "../lib/hash.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { AppError } from "../lib/app-error.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";

export interface TokenIssueContext {
  userId: string;
  email: string;
  name: string;
  role: string;
  userAgent?: string;
  ipAddress?: string;
}

export const tokenService = {
  async issueTokens(context: TokenIssueContext) {
    const refreshToken = signRefreshToken({
      sub: context.userId,
      tokenId: randomUUID()
    });

    const refreshTokenHash = sha256(refreshToken);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await refreshTokenRepository.create({
      userId: context.userId,
      tokenHash: refreshTokenHash,
      expiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress
    });

    const accessToken = signAccessToken({
      sub: context.userId,
      email: context.email,
      name: context.name,
      role: context.role
    });

    return {
      accessToken,
      refreshToken
    };
  },

  async rotateRefreshToken(refreshToken: string, meta?: { userAgent?: string; ipAddress?: string }) {
    try {
      verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(403, "INVALID_REFRESH_TOKEN", "유효하지 않은 리프레시 토큰입니다.");
    }

    const currentTokenHash = sha256(refreshToken);
    const tokenRecord = await refreshTokenRepository.findByTokenHash(currentTokenHash);

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt.getTime() < Date.now()) {
      throw new AppError(403, "REFRESH_TOKEN_REVOKED", "사용할 수 없는 리프레시 토큰입니다.");
    }

    await refreshTokenRepository.revokeByTokenHash(currentTokenHash);

    return this.issueTokens({
      userId: tokenRecord.user.id,
      email: tokenRecord.user.email,
      name: tokenRecord.user.name,
      role: tokenRecord.user.role,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress
    });
  },

  async revokeRefreshToken(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    await refreshTokenRepository.revokeByTokenHash(tokenHash);
  }
};
