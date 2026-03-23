import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServiceMock = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  verifyUser: vi.fn(),
  logout: vi.fn()
}));

const oauthServiceMock = vi.hoisted(() => ({
  getAuthorizationUrl: vi.fn(),
  handleCallback: vi.fn()
}));

vi.mock("../src/services/auth.service.js", () => ({
  authService: authServiceMock
}));

vi.mock("../src/services/oauth.service.js", () => ({
  oauthService: oauthServiceMock
}));

import { createApp } from "../src/app.js";

const app = createApp();

describe("oauth routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET /api/v1/auth/provider/:provider redirects to provider auth url", async () => {
    oauthServiceMock.getAuthorizationUrl.mockReturnValue({
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test"
    });

    const response = await request(app).get("/api/v1/auth/provider/google");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=test"
    );
    expect(oauthServiceMock.getAuthorizationUrl).toHaveBeenCalledWith("google", undefined);
  });

  it("GET /api/v1/auth/provider/:provider returns 404 for unsupported provider", async () => {
    const response = await request(app).get("/api/v1/auth/provider/not-supported");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("UNSUPPORTED_PROVIDER");
  });

  it("GET /api/v1/auth/callback/:provider sets refresh cookie and redirects", async () => {
    oauthServiceMock.handleCallback.mockResolvedValue({
      redirectUrl: "http://localhost:3000?accessToken=access-token",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "홍길동",
        role: "USER"
      }
    });

    const response = await request(app).get(
      "/api/v1/auth/callback/google?code=oauth-code&state=signed-state"
    );

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("http://localhost:3000?accessToken=access-token");
    expect(response.headers["set-cookie"]?.[0]).toContain("refreshToken=refresh-token");
    expect(oauthServiceMock.handleCallback).toHaveBeenCalledWith(
      "google",
      "oauth-code",
      "signed-state",
      expect.objectContaining({
        ipAddress: expect.any(String)
      })
    );
  });

  it("GET /api/v1/auth/callback/:provider returns 400 when code or state is missing", async () => {
    const response = await request(app).get("/api/v1/auth/callback/google?code=oauth-code");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_OAUTH_CALLBACK");
  });
});
