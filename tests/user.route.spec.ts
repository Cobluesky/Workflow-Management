import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireAppUserMock = vi.hoisted(() => vi.fn());
const ensureWorkspaceProfileMock = vi.hoisted(() => vi.fn());
const syncLegacyLocalAliasMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  workspaceProfile: {
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/server-auth", () => ({
  ensureWorkspaceProfile: ensureWorkspaceProfileMock,
  requireAppUser: requireAppUserMock,
  syncLegacyLocalAlias: syncLegacyLocalAliasMock,
}));

vi.mock("@/lib/prisma/core", () => ({
  corePrisma: prismaMock,
}));

import { GET, PATCH } from "@/app/api/user/route";

describe("user route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET returns the alias from workspace_core and syncs the legacy alias", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: {
        id: "auth-user-1",
        email: "user@example.com",
      },
      localUser: {
        id: 1,
        authUserId: "auth-user-1",
        email: "user@example.com",
        alias: "legacy-alias",
      },
    });
    ensureWorkspaceProfileMock.mockResolvedValue({
      authUserId: "auth-user-1",
      email: "user@example.com",
      alias: "core-alias",
    });

    const response = await GET(new Request("http://localhost:3000/api/user"));
    const body = await response.json();

    expect(ensureWorkspaceProfileMock).toHaveBeenCalledWith({
      authUser: {
        id: "auth-user-1",
        email: "user@example.com",
      },
      localUser: {
        id: 1,
        authUserId: "auth-user-1",
        email: "user@example.com",
        alias: "legacy-alias",
      },
    });
    expect(syncLegacyLocalAliasMock).toHaveBeenCalledWith(
      {
        authUser: {
          id: "auth-user-1",
          email: "user@example.com",
        },
        localUser: {
          id: 1,
          authUserId: "auth-user-1",
          email: "user@example.com",
          alias: "legacy-alias",
        },
      },
      "core-alias"
    );
    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        alias: "core-alias",
      },
    });
  });

  it("GET falls back to the legacy alias when workspace_core is unavailable", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: {
        id: "auth-user-legacy",
        email: "user@example.com",
      },
      localUser: {
        id: 8,
        authUserId: "auth-user-legacy",
        email: "user@example.com",
        alias: "legacy-only",
      },
    });
    ensureWorkspaceProfileMock.mockRejectedValue(
      new Error("Missing required database env: WORKSPACE_CORE_DATABASE_URL")
    );

    const response = await GET(new Request("http://localhost:3000/api/user"));
    const body = await response.json();

    expect(syncLegacyLocalAliasMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        alias: "legacy-only",
      },
    });
  });

  it("PATCH rejects invalid alias", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: {
        id: "auth-user-1",
        email: "user@example.com",
      },
      localUser: {
        id: 1,
        authUserId: "auth-user-1",
        email: "user@example.com",
        alias: null,
      },
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newAlias: "" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_ALIAS");
  });

  it("PATCH upserts alias into workspace_core and syncs the legacy alias", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: {
        id: "auth-user-7",
        email: "user@example.com",
      },
      localUser: {
        id: 7,
        authUserId: "auth-user-7",
        email: "user@example.com",
        alias: "old-alias",
      },
    });
    prismaMock.workspaceProfile.upsert.mockResolvedValue({
      alias: "new-alias",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newAlias: "new-alias" }),
      })
    );
    const body = await response.json();

    expect(prismaMock.workspaceProfile.upsert).toHaveBeenCalledWith({
      where: { authUserId: "auth-user-7" },
      update: {
        email: "user@example.com",
        alias: "new-alias",
      },
      create: {
        authUserId: "auth-user-7",
        email: "user@example.com",
        alias: "new-alias",
      },
      select: { alias: true },
    });
    expect(syncLegacyLocalAliasMock).toHaveBeenCalledWith(
      {
        authUser: {
          id: "auth-user-7",
          email: "user@example.com",
        },
        localUser: {
          id: 7,
          authUserId: "auth-user-7",
          email: "user@example.com",
          alias: "old-alias",
        },
      },
      "new-alias"
    );
    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        alias: "new-alias",
      },
    });
  });

  it("PATCH falls back to the legacy alias update when workspace_core is unavailable", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: {
        id: "auth-user-legacy",
        email: "user@example.com",
      },
      localUser: {
        id: 9,
        authUserId: "auth-user-legacy",
        email: "user@example.com",
        alias: "old-alias",
      },
    });
    prismaMock.workspaceProfile.upsert.mockRejectedValue(
      new Error("Missing required database env: WORKSPACE_CORE_DATABASE_URL")
    );
    syncLegacyLocalAliasMock.mockResolvedValue("fallback-alias");

    const response = await PATCH(
      new Request("http://localhost:3000/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newAlias: "fallback-alias" }),
      })
    );
    const body = await response.json();

    expect(syncLegacyLocalAliasMock).toHaveBeenCalledWith(
      {
        authUser: {
          id: "auth-user-legacy",
          email: "user@example.com",
        },
        localUser: {
          id: 9,
          authUserId: "auth-user-legacy",
          email: "user@example.com",
          alias: "old-alias",
        },
      },
      "fallback-alias"
    );
    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        alias: "fallback-alias",
      },
    });
  });

  it("passes through auth errors", async () => {
    const authResponse = NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "액세스 토큰이 필요합니다." },
      },
      { status: 401 }
    );

    requireAppUserMock.mockResolvedValue(authResponse);

    const response = await GET(new Request("http://localhost:3000/api/user"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
