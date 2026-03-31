import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireAppUserMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  workspaceModulePreference: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  requireAppUser: requireAppUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, PATCH } from "@/app/api/modules/route";

describe("modules route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock)
    );
  });

  it("GET returns stored module order", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 7,
        email: "user@example.com",
        alias: "테스터",
      },
    });
    prismaMock.user.findUnique.mockResolvedValue({
      workspaceModulesInitialized: true,
    });
    prismaMock.workspaceModulePreference.findMany.mockResolvedValue([
      { moduleId: "timetable" },
      { moduleId: "tasks" },
    ]);

    const response = await GET(new Request("http://localhost:3000/api/modules"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        enabledModuleIds: ["timetable", "tasks"],
      },
    });
  });

  it("GET initializes defaults when nothing is stored", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 3,
        email: "user@example.com",
        alias: null,
      },
    });
    prismaMock.user.findUnique.mockResolvedValue({
      workspaceModulesInitialized: false,
    });
    prismaMock.workspaceModulePreference.findMany.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost:3000/api/modules"));
    const body = await response.json();

    expect(prismaMock.workspaceModulePreference.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 3, moduleId: "timetable", position: 0 },
        { userId: 3, moduleId: "mypage", position: 1 },
      ],
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        workspaceModulesInitialized: true,
      },
    });
    expect(response.status).toBe(200);
    expect(body.data.enabledModuleIds).toEqual(["timetable", "mypage"]);
  });

  it("GET preserves an intentionally empty module selection", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 9,
        email: "user@example.com",
        alias: null,
      },
    });
    prismaMock.user.findUnique.mockResolvedValue({
      workspaceModulesInitialized: true,
    });
    prismaMock.workspaceModulePreference.findMany.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost:3000/api/modules"));
    const body = await response.json();

    expect(prismaMock.workspaceModulePreference.createMany).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(body.data.enabledModuleIds).toEqual([]);
  });

  it("PATCH rejects invalid module ids", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 3,
        email: "user@example.com",
        alias: null,
      },
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/modules", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabledModuleIds: ["timetable", "unknown-module"],
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_MODULE_CONFIG");
  });

  it("PATCH stores module order for the authenticated user", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 11,
        email: "user@example.com",
        alias: null,
      },
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/modules", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabledModuleIds: ["mypage", "tasks", "timetable"],
        }),
      })
    );
    const body = await response.json();

    expect(prismaMock.workspaceModulePreference.deleteMany).toHaveBeenCalledWith({
      where: { userId: 11 },
    });
    expect(prismaMock.workspaceModulePreference.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 11, moduleId: "mypage", position: 0 },
        { userId: 11, moduleId: "tasks", position: 1 },
        { userId: 11, moduleId: "timetable", position: 2 },
      ],
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: {
        workspaceModulesInitialized: true,
      },
    });
    expect(response.status).toBe(200);
    expect(body.data.enabledModuleIds).toEqual(["mypage", "tasks", "timetable"]);
  });

  it("PATCH allows storing an empty module selection", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 21,
        email: "user@example.com",
        alias: null,
      },
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/modules", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabledModuleIds: [],
        }),
      })
    );
    const body = await response.json();

    expect(prismaMock.workspaceModulePreference.deleteMany).toHaveBeenCalledWith({
      where: { userId: 21 },
    });
    expect(prismaMock.workspaceModulePreference.createMany).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: {
        workspaceModulesInitialized: true,
      },
    });
    expect(response.status).toBe(200);
    expect(body.data.enabledModuleIds).toEqual([]);
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

    const response = await GET(new Request("http://localhost:3000/api/modules"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
