import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireAppUserMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/server-auth", () => ({
  requireAppUser: requireAppUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, PATCH } from "@/app/api/user/route";

describe("user route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET returns current alias", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 1,
        email: "user@example.com",
        alias: "테스터",
      },
    });

    const response = await GET(new Request("http://localhost:3000/api/user"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        alias: "테스터",
      },
    });
  });

  it("PATCH rejects invalid alias", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 1,
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

  it("PATCH updates alias for authenticated user", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 7,
        email: "user@example.com",
        alias: null,
      },
    });
    prismaMock.user.update.mockResolvedValue({
      alias: "새별명",
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newAlias: "새별명" }),
      })
    );
    const body = await response.json();

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { alias: "새별명" },
      select: { alias: true },
    });
    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        alias: "새별명",
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
