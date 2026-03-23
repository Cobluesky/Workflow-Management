import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/lib/app-error.js";

const userRepositoryMock = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  createLocalUser: vi.fn()
}));

const passwordMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn()
}));

const tokenServiceMock = vi.hoisted(() => ({
  issueTokens: vi.fn(),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn()
}));

vi.mock("../src/repositories/user.repository.js", () => ({
  userRepository: userRepositoryMock
}));

vi.mock("../src/lib/password.js", () => passwordMock);

vi.mock("../src/services/token.service.js", () => ({
  tokenService: tokenServiceMock
}));

import { authService } from "../src/services/auth.service.js";

describe("authService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("register rejects duplicate email", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue({ id: "existing-user" });

    await expect(
      authService.register({
        email: "user@example.com",
        password: "password123",
        name: "홍길동"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "EMAIL_ALREADY_EXISTS"
    });
  });

  it("register creates local user", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);
    passwordMock.hashPassword.mockResolvedValue("hashed-password");
    userRepositoryMock.createLocalUser.mockResolvedValue({ id: "user-1" });

    const result = await authService.register({
      email: "user@example.com",
      password: "password123",
      name: "홍길동"
    });

    expect(passwordMock.hashPassword).toHaveBeenCalledWith("password123");
    expect(userRepositoryMock.createLocalUser).toHaveBeenCalledWith({
      email: "user@example.com",
      passwordHash: "hashed-password",
      name: "홍길동"
    });
    expect(result.userId).toBe("user-1");
  });

  it("login rejects invalid credentials", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({
        email: "user@example.com",
        password: "password123"
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS"
    });
  });

  it("login returns access and refresh tokens", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
      name: "홍길동",
      role: "USER"
    });
    passwordMock.comparePassword.mockResolvedValue(true);
    tokenServiceMock.issueTokens.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });

    const result = await authService.login({
      email: "user@example.com",
      password: "password123"
    });

    expect(passwordMock.comparePassword).toHaveBeenCalledWith("password123", "hashed-password");
    expect(tokenServiceMock.issueTokens).toHaveBeenCalledWith({
      userId: "user-1",
      email: "user@example.com",
      name: "홍길동",
      role: "USER",
      userAgent: undefined,
      ipAddress: undefined
    });
    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
  });

  it("verifyUser rejects inactive user", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: "user-1",
      isActive: false
    });

    await expect(authService.verifyUser("user-1")).rejects.toMatchObject({
      statusCode: 403,
      code: "USER_NOT_ACTIVE"
    });
  });

  it("refresh delegates to tokenService", async () => {
    tokenServiceMock.rotateRefreshToken.mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token"
    });

    const result = await authService.refresh("refresh-token");

    expect(tokenServiceMock.rotateRefreshToken).toHaveBeenCalledWith("refresh-token", undefined);
    expect(result.accessToken).toBe("new-access-token");
  });

  it("logout delegates token revocation", async () => {
    tokenServiceMock.revokeRefreshToken.mockResolvedValue(undefined);

    const result = await authService.logout("refresh-token");

    expect(tokenServiceMock.revokeRefreshToken).toHaveBeenCalledWith("refresh-token");
    expect(result.message).toBe("Logged out successfully");
  });
});
