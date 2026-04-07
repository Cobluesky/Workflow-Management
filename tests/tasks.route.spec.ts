import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireAppUserMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  taskItem: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/server-auth", () => ({
  requireAppUser: requireAppUserMock,
}));

vi.mock("@/lib/prisma/tasks", () => ({
  tasksPrisma: prismaMock,
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/tasks/route";

describe("tasks route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET returns tasks for the authenticated user", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-7", email: "user@example.com", name: "user", role: "USER" },
      localUser: { id: 7, email: "user@example.com", alias: "user" },
    });
    prismaMock.taskItem.findMany.mockResolvedValue([
      {
        id: 1,
        title: "보고서 초안 정리",
        description: "월간 회의 전에 초안 정리",
        dueDate: new Date("2026-04-07T14:59:00.000Z"),
        status: "todo",
        priority: "high",
        createdAt: new Date("2026-04-02T01:00:00.000Z"),
        updatedAt: new Date("2026-04-02T03:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("http://localhost:3000/api/tasks"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.taskItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authUserId: "auth-user-7",
        }),
      })
    );
    expect(body.data.tasks).toHaveLength(1);
  });

  it("POST creates a task for the authenticated user", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-11", email: "user@example.com", name: "user", role: "USER" },
      localUser: { id: 11, email: "user@example.com", alias: "user" },
    });
    prismaMock.taskItem.create.mockResolvedValue({
      id: 5,
      title: "중간 발표 자료 정리",
      description: "슬라이드와 메모 확인",
      dueDate: new Date("2026-04-10T14:59:00.000Z"),
      status: "in_progress",
      priority: "medium",
      createdAt: new Date("2026-04-02T02:00:00.000Z"),
      updatedAt: new Date("2026-04-02T02:00:00.000Z"),
    });

    const response = await POST(
      new Request("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "중간 발표 자료 정리",
          description: "슬라이드와 메모 확인",
          dueDate: "2026-04-10T14:59:00.000Z",
          status: "in_progress",
          priority: "medium",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(prismaMock.taskItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authUserId: "auth-user-11",
          title: "중간 발표 자료 정리",
          status: "in_progress",
          priority: "medium",
        }),
      })
    );
    expect(body.data.task.id).toBe(5);
  });

  it("POST rejects invalid status values", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-11", email: "user@example.com", name: "user", role: "USER" },
      localUser: { id: 11, email: "user@example.com", alias: "user" },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "잘못된 상태 테스트",
          status: "blocked",
          priority: "medium",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_TASK");
  });

  it("PATCH updates only the authenticated user's task", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-13", email: "user@example.com", name: "user", role: "USER" },
      localUser: { id: 13, email: "user@example.com", alias: "user" },
    });
    prismaMock.taskItem.findFirst.mockResolvedValue({ id: 9 });
    prismaMock.taskItem.update.mockResolvedValue({
      id: 9,
      title: "수정된 작업",
      description: null,
      dueDate: null,
      status: "done",
      priority: "low",
      createdAt: new Date("2026-04-02T01:00:00.000Z"),
      updatedAt: new Date("2026-04-02T04:00:00.000Z"),
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: 9,
          title: "수정된 작업",
          dueDate: null,
          status: "done",
          priority: "low",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.taskItem.findFirst).toHaveBeenCalledWith({
      where: {
        id: 9,
        authUserId: "auth-user-13",
      },
      select: { id: true },
    });
    expect(body.data.task.status).toBe("done");
  });

  it("DELETE removes only the authenticated user's task", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-14", email: "user@example.com", name: "user", role: "USER" },
      localUser: { id: 14, email: "user@example.com", alias: "user" },
    });
    prismaMock.taskItem.deleteMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(
      new Request("http://localhost:3000/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 4 }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.taskItem.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 4,
        authUserId: "auth-user-14",
      },
    });
    expect(body.success).toBe(true);
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

    const response = await GET(new Request("http://localhost:3000/api/tasks"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
