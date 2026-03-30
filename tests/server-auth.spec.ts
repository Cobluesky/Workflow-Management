import { describe, beforeEach, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { requireAppUser } from "@/lib/server-auth";

const fetchMock = vi.fn();

function createAuthorizedRequest() {
  return new Request("http://localhost:3000/api/user", {
    headers: {
      Authorization: "Bearer test-access-token",
    },
  });
}

describe("requireAppUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock)
    );
  });

  it("returns 401 when bearer token is missing", async () => {
    const result = await requireAppUser(new Request("http://localhost:3000/api/user"));

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("prefers authUserId mapping when local user already exists", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "auth-user-1",
            email: "user@example.com",
            name: "홍길동",
            role: "USER",
          },
        },
      }),
    });

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 1,
        authUserId: "auth-user-1",
        email: "user@example.com",
        alias: "테스터",
      })
      .mockResolvedValueOnce({
        id: 1,
        authUserId: "auth-user-1",
        email: "user@example.com",
        alias: "테스터",
      });

    const result = await requireAppUser(createAuthorizedRequest());

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect((result as Awaited<ReturnType<typeof requireAppUser>> & { localUser: { authUserId: string } }).localUser.authUserId).toBe(
      "auth-user-1"
    );
  });

  it("backfills authUserId using email fallback", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "auth-user-2",
            email: "user@example.com",
            name: "홍길동",
            role: "USER",
          },
        },
      }),
    });

    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 7,
        authUserId: null,
        email: "user@example.com",
        alias: null,
      });
    prismaMock.user.update.mockResolvedValue({
      id: 7,
      authUserId: "auth-user-2",
      email: "user@example.com",
      alias: null,
    });

    const result = await requireAppUser(createAuthorizedRequest());

    expect(prismaMock.user.update).toHaveBeenCalledWith({
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
    expect((result as Awaited<ReturnType<typeof requireAppUser>> & { localUser: { authUserId: string } }).localUser.authUserId).toBe(
      "auth-user-2"
    );
  });

  it("creates a new local user when no mapping exists", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "auth-user-3",
            email: "new@example.com",
            name: "홍길동",
            role: "USER",
          },
        },
      }),
    });

    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 11,
      authUserId: "auth-user-3",
      email: "new@example.com",
      alias: null,
    });

    const result = await requireAppUser(createAuthorizedRequest());

    expect(prismaMock.user.create).toHaveBeenCalledWith({
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
            name: "홍길동",
            role: "USER",
          },
        },
      }),
    });

    prismaMock.user.findUnique
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
});
