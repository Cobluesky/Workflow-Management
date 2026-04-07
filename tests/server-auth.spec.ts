import { describe, beforeEach, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const timetablePrismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}));

const corePrismaMock = vi.hoisted(() => ({
  workspaceProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma/core", () => ({
  corePrisma: corePrismaMock,
}));

vi.mock("@/lib/prisma/timetable", () => ({
  timetablePrisma: timetablePrismaMock,
}));

import { ensureWorkspaceProfile, requireAppUser, syncLegacyLocalAlias } from "@/lib/server-auth";

const fetchMock = vi.fn();

function createAuthorizedRequest() {
  return new Request("http://localhost:3000/api/user", {
    headers: {
      Authorization: "Bearer test-access-token",
    },
  });
}

describe("server auth helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    timetablePrismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof timetablePrismaMock) => unknown) => callback(timetablePrismaMock)
    );
    corePrismaMock.workspaceProfile.findUnique.mockResolvedValue(null);
    corePrismaMock.workspaceProfile.create.mockImplementation(async ({ data }: any) => ({
      authUserId: data.authUserId,
      email: data.email,
      alias: data.alias ?? null,
    }));
    corePrismaMock.workspaceProfile.update.mockImplementation(async ({ where, data }: any) => ({
      authUserId: where.authUserId,
      email: data.email,
      alias: data.alias ?? null,
    }));
  });

  it("returns 401 when bearer token is missing", async () => {
    const result = await requireAppUser(new Request("http://localhost:3000/api/user"));

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("prefers authUserId mapping without touching workspace_core", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "auth-user-1",
            email: "user@example.com",
            name: "Test User",
            role: "USER",
          },
        },
      }),
    });

    timetablePrismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 1,
        authUserId: "auth-user-1",
        email: "user@example.com",
        alias: "tester",
      })
      .mockResolvedValueOnce({
        id: 1,
        authUserId: "auth-user-1",
        email: "user@example.com",
        alias: "tester",
      });

    const result = await requireAppUser(createAuthorizedRequest());

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(timetablePrismaMock.user.update).not.toHaveBeenCalled();
    expect(timetablePrismaMock.user.create).not.toHaveBeenCalled();
    expect(corePrismaMock.workspaceProfile.findUnique).not.toHaveBeenCalled();
    expect(
      (result as Awaited<ReturnType<typeof requireAppUser>> & { localUser: { authUserId: string } }).localUser
        .authUserId
    ).toBe("auth-user-1");
  });

  it("backfills authUserId using email fallback", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "auth-user-2",
            email: "user@example.com",
            name: "Test User",
            role: "USER",
          },
        },
      }),
    });

    timetablePrismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 7,
        authUserId: null,
        email: "user@example.com",
        alias: null,
      });
    timetablePrismaMock.user.update.mockResolvedValue({
      id: 7,
      authUserId: "auth-user-2",
      email: "user@example.com",
      alias: null,
    });

    const result = await requireAppUser(createAuthorizedRequest());

    expect(timetablePrismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        authUserId: "auth-user-2",
      },
      select: {
        id: true,
        authUserId: true,
        email: true,
        alias: true,
      },
    });
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(
      (result as Awaited<ReturnType<typeof requireAppUser>> & { localUser: { authUserId: string } }).localUser
        .authUserId
    ).toBe("auth-user-2");
  });

  it("creates a new local user when no mapping exists", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "auth-user-3",
            email: "new@example.com",
            name: "Test User",
            role: "USER",
          },
        },
      }),
    });

    timetablePrismaMock.user.findUnique.mockResolvedValue(null);
    timetablePrismaMock.user.create.mockResolvedValue({
      id: 11,
      authUserId: "auth-user-3",
      email: "new@example.com",
      alias: null,
    });

    const result = await requireAppUser(createAuthorizedRequest());

    expect(timetablePrismaMock.user.create).toHaveBeenCalledWith({
      data: {
        authUserId: "auth-user-3",
        email: "new@example.com",
        password: "AUTH_SERVER_MANAGED",
        alias: null,
      },
      select: {
        id: true,
        authUserId: true,
        email: true,
        alias: true,
      },
    });
    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as Awaited<ReturnType<typeof requireAppUser>> & { localUser: { id: number } }).localUser.id).toBe(11);
  });

  it("returns 409 when authUserId and email map to different local users", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "auth-user-4",
            email: "conflict@example.com",
            name: "Test User",
            role: "USER",
          },
        },
      }),
    });

    timetablePrismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 1,
        authUserId: "auth-user-4",
        email: "old@example.com",
        alias: null,
      })
      .mockResolvedValueOnce({
        id: 2,
        authUserId: null,
        email: "conflict@example.com",
        alias: null,
      });

    const result = await requireAppUser(createAuthorizedRequest());

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("LOCAL_USER_CONFLICT");
  });

  it("returns 502 when auth-server verify returns upstream error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const result = await requireAppUser(createAuthorizedRequest());

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("AUTH_SERVER_UNAVAILABLE");
  });

  it("creates a workspace profile from the legacy alias when none exists", async () => {
    const result = await ensureWorkspaceProfile({
      authUser: {
        id: "auth-user-42",
        email: "user@example.com",
        name: "Test User",
        role: "USER",
      },
      localUser: {
        id: 42,
        authUserId: "auth-user-42",
        email: "user@example.com",
        alias: "fallback-alias",
      },
    });

    expect(corePrismaMock.workspaceProfile.findUnique).toHaveBeenCalledWith({
      where: { authUserId: "auth-user-42" },
      select: {
        authUserId: true,
        email: true,
        alias: true,
      },
    });
    expect(corePrismaMock.workspaceProfile.create).toHaveBeenCalledWith({
      data: {
        authUserId: "auth-user-42",
        email: "user@example.com",
        alias: "fallback-alias",
      },
      select: {
        authUserId: true,
        email: true,
        alias: true,
      },
    });
    expect(result.alias).toBe("fallback-alias");
  });

  it("reconciles a stale core alias from the newer legacy alias", async () => {
    corePrismaMock.workspaceProfile.findUnique.mockResolvedValue({
      authUserId: "auth-user-77",
      email: "user@example.com",
      alias: "stale-core-alias",
    });

    const result = await ensureWorkspaceProfile({
      authUser: {
        id: "auth-user-77",
        email: "user@example.com",
        name: "Test User",
        role: "USER",
      },
      localUser: {
        id: 77,
        authUserId: "auth-user-77",
        email: "user@example.com",
        alias: "newer-legacy-alias",
      },
    });

    expect(corePrismaMock.workspaceProfile.update).toHaveBeenCalledWith({
      where: { authUserId: "auth-user-77" },
      data: {
        email: "user@example.com",
        alias: "newer-legacy-alias",
      },
      select: {
        authUserId: true,
        email: true,
        alias: true,
      },
    });
    expect(result.alias).toBe("newer-legacy-alias");
  });

  it("syncs the legacy local alias only when it changes", async () => {
    timetablePrismaMock.user.update.mockResolvedValue({
      alias: "core-alias",
    });

    const unchangedAlias = await syncLegacyLocalAlias(
      {
        localUser: {
          id: 7,
          authUserId: "auth-user-7",
          email: "user@example.com",
          alias: "core-alias",
        },
      },
      "core-alias"
    );

    expect(unchangedAlias).toBe("core-alias");
    expect(timetablePrismaMock.user.update).not.toHaveBeenCalled();

    const syncedAlias = await syncLegacyLocalAlias(
      {
        localUser: {
          id: 7,
          authUserId: "auth-user-7",
          email: "user@example.com",
          alias: "legacy-alias",
        },
      },
      "core-alias"
    );

    expect(timetablePrismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { alias: "core-alias" },
      select: {
        alias: true,
      },
    });
    expect(syncedAlias).toBe("core-alias");
  });
});
