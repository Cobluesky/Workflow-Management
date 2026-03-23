import { z } from "zod";
import { AppError } from "../lib/app-error.js";
import { comparePassword, hashPassword } from "../lib/password.js";
import { userRepository } from "../repositories/user.repository.js";
import { tokenService } from "./token.service.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(50)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authService = {
  async register(input: unknown) {
    const payload = registerSchema.parse(input);
    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "이미 가입된 이메일입니다.");
    }

    const passwordHash = await hashPassword(payload.password);
    const user = await userRepository.createLocalUser({
      email: payload.email,
      passwordHash,
      name: payload.name
    });

    return {
      userId: user.id,
      message: "User created successfully"
    };
  },

  async login(
    input: unknown,
    meta?: {
      userAgent?: string;
      ipAddress?: string;
    }
  ) {
    const payload = loginSchema.parse(input);
    const user = await userRepository.findByEmail(payload.email);

    if (!user || !user.passwordHash) {
      throw new AppError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    const isValidPassword = await comparePassword(payload.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    const tokens = await tokenService.issueTokens({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  },

  async refresh(refreshToken: string, meta?: { userAgent?: string; ipAddress?: string }) {
    return tokenService.rotateRefreshToken(refreshToken, meta);
  },

  async verifyUser(userId: string) {
    const user = await userRepository.findById(userId);

    if (!user || !user.isActive) {
      throw new AppError(403, "USER_NOT_ACTIVE", "유효하지 않은 사용자입니다.");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  },

  async logout(refreshToken: string) {
    await tokenService.revokeRefreshToken(refreshToken);
    return {
      message: "Logged out successfully"
    };
  }
};
