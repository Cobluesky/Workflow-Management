import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireAppUserMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  workspaceModuleState: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
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

vi.mock("@/lib/prisma/core", () => ({
  corePrisma: prismaMock,
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
      authUser: {
        id: "auth-user-7",
        email: "user@example.com",
      },
      localUser: {
        id: 7,
        email: "user@example.com",
        alias: "테스터",
      },
    });
    prismaMock.workspaceModuleState.findUnique.mockResolvedValue({
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
      authUser: {
        id: "auth-user-3",
        email: "user@example.com",
      },
      localUser: {
        id: 3,
        email: "user@example.com",
        alias: null,
      },
    });
    prismaMock.workspaceModuleState.findUnique.mockResolvedValue({
      workspaceModulesInitialized: false,
    });
    prismaMock.workspaceModulePreference.findMany.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost:3000/api/modules"));
    const body = await response.json();

    expect(prismaMock.workspaceModulePreference.createMany).toHaveBeenCalledWith({
      data: [
        { authUserId: "auth-user-3", moduleId: "timetable", position: 0 },
        { authUserId: "auth-user-3", moduleId: "mypage", position: 1 },
      ],
    });
    expect(prismaMock.workspaceModuleState.upsert).toHaveBeenCalledWith({
      where: { authUserId: "auth-user-3" },
      update: {
        workspaceModulesInitialized: true,
      },
      create: {
        authUserId: "auth-user-3",
        workspaceModulesInitialized: true,
      },
    });
    expect(response.status).toBe(200);
    expect(body.data.enabledModuleIds).toEqual(["timetable", "mypage"]);
  });

  it("GET preserves an intentionally empty module selection", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: {
        id: "auth-user-9",
        email: "user@example.com",
      },
      localUser: {
        id: 9,
        email: "user@example.com",
        alias: null,
      },
    });
    prismaMock.workspaceModuleState.findUnique.mockResolvedValue({
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
      authUser: {
        id: "auth-user-3",
        email: "user@example.com",
      },
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
      authUser: {
        id: "auth-user-11",
        email: "user@example.com",
      },
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
      where: { authUserId: "auth-user-11" },
    });
    expect(prismaMock.workspaceModulePreference.createMany).toHaveBeenCalledWith({
      data: [
        { authUserId: "auth-user-11", moduleId: "mypage", position: 0 },
        { authUserId: "auth-user-11", moduleId: "tasks", position: 1 },
        { authUserId: "auth-user-11", moduleId: "timetable", position: 2 },
      ],
    });
    expect(prismaMock.workspaceModuleState.upsert).toHaveBeenCalledWith({
      where: { authUserId: "auth-user-11" },
      update: {
        workspaceModulesInitialized: true,
      },
      create: {
        authUserId: "auth-user-11",
        workspaceModulesInitialized: true,
      },
    });
    expect(response.status).toBe(200);
    expect(body.data.enabledModuleIds).toEqual(["mypage", "tasks", "timetable"]);
  });

  it("PATCH allows storing an empty module selection", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: {
        id: "auth-user-21",
        email: "user@example.com",
      },
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
      where: { authUserId: "auth-user-21" },
    });
    expect(prismaMock.workspaceModulePreference.createMany).not.toHaveBeenCalled();
    expect(prismaMock.workspaceModuleState.upsert).toHaveBeenCalledWith({
      where: { authUserId: "auth-user-21" },
      update: {
        workspaceModulesInitialized: true,
      },
      create: {
        authUserId: "auth-user-21",
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
