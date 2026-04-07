import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/lib/app-error.js";
import { signAccessToken } from "../src/lib/jwt.js";

const authServiceMock = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  verifyUser: vi.fn(),
  logout: vi.fn()
}));

vi.mock("../src/services/auth.service.js", () => ({
  authService: authServiceMock
}));

import { createApp } from "../src/app.js";

const app = createApp();

describe("auth routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET /health returns ok", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: "ok"
      }
    });
  });

  it("GET /metrics returns prometheus metrics", async () => {
    const response = await request(app).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.text).toContain("workspace_auth_info");
  });

  it("GET /metrics is excluded from auth HTTP traffic counters", async () => {
    await request(app).get("/health");

    const response = await request(app).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.text).toContain('workspace_auth_http_requests_total{method="GET",route="/health",status_code="200"}');
    expect(response.text).not.toContain('route="/metrics"');
  });

  it("POST /api/v1/auth/register returns 201", async () => {
    authServiceMock.register.mockResolvedValue({
      userId: "user-1",
      message: "User created successfully"
    });

    const response = await request(app).post("/api/v1/auth/register").send({
      email: "user@example.com",
      password: "password123",
      name: "홍길동"
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBe("user-1");
  });

  it("POST /api/v1/auth/register returns mapped app error", async () => {
    authServiceMock.register.mockRejectedValue(
      new AppError(409, "EMAIL_ALREADY_EXISTS", "이미 가입된 이메일입니다.")
    );

    const response = await request(app).post("/api/v1/auth/register").send({
      email: "user@example.com",
      password: "password123",
      name: "홍길동"
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "이미 가입된 이메일입니다."
      }
    });
  });

  it("POST /api/v1/auth/login sets refresh cookie", async () => {
    authServiceMock.login.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "홍길동",
        role: "USER"
      }
    });

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "user@example.com",
      password: "password123"
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBe("access-token");
    expect(response.headers["set-cookie"]?.[0]).toContain("refreshToken=refresh-token");
  });

  it("POST /api/v1/auth/refresh returns 401 when cookie is missing", async () => {
    const response = await request(app).post("/api/v1/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("REFRESH_TOKEN_MISSING");
  });

  it("POST /api/v1/auth/refresh rotates token and sets cookie", async () => {
    authServiceMock.refresh.mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token"
    });

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", ["refreshToken=old-refresh-token"]);

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBe("new-access-token");
    expect(response.headers["set-cookie"]?.[0]).toContain("refreshToken=new-refresh-token");
  });

  it("OPTIONS /api/v1/auth/refresh returns CORS headers for an allowed origin", async () => {
    const response = await request(app)
      .options("/api/v1/auth/refresh")
      .set("Origin", "https://app.workspace.p-e.kr")
      .set("Access-Control-Request-Method", "POST");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("https://app.workspace.p-e.kr");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("GET /api/v1/auth/verify validates bearer token", async () => {
    authServiceMock.verifyUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "홍길동",
      role: "USER"
    });

    const accessToken = signAccessToken({
      sub: "user-1",
      email: "user@example.com",
      name: "홍길동",
      role: "USER"
    });

    const response = await request(app)
      .get("/api/v1/auth/verify")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.isValid).toBe(true);
    expect(response.body.data.user.id).toBe("user-1");
  });

  it("POST /api/v1/auth/logout clears cookie", async () => {
    authServiceMock.logout.mockResolvedValue({
      message: "Logged out successfully"
    });

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", ["refreshToken=refresh-token"]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers["set-cookie"]?.[0]).toContain("refreshToken=");
  });
});
