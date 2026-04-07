import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireAppUserMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  calendarEvent: {
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

vi.mock("@/lib/prisma/calendar", () => ({
  calendarPrisma: prismaMock,
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/calendar/route";

describe("calendar route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET returns events for the authenticated user and month range", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-7", email: "user@example.com" },
      localUser: { id: 7, email: "user@example.com", alias: "user" },
    });
    prismaMock.calendarEvent.findMany.mockResolvedValue([
      {
        id: 1,
        title: "팀 미팅",
        description: null,
        location: "회의실",
        startsAt: new Date("2026-04-10T01:00:00.000Z"),
        endsAt: new Date("2026-04-10T02:00:00.000Z"),
        colorToken: "indigo",
        isAllDay: false,
      },
    ]);

    const response = await GET(new Request("http://localhost:3000/api/calendar?month=2026-04"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authUserId: "auth-user-7",
        }),
      })
    );
    expect(body.data.events).toHaveLength(1);
  });

  it("GET widens the month query to include local-time boundary events", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-7", email: "user@example.com" },
      localUser: { id: 7, email: "user@example.com", alias: "user" },
    });
    prismaMock.calendarEvent.findMany.mockResolvedValue([]);

    await GET(new Request("http://localhost:3000/api/calendar?month=2026-04"));

    expect(prismaMock.calendarEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authUserId: "auth-user-7",
          startsAt: {
            lt: new Date("2026-05-02T00:00:00.000Z"),
          },
          endsAt: {
            gt: new Date("2026-03-31T00:00:00.000Z"),
          },
        }),
      })
    );
  });

  it("GET rejects invalid month values", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-7", email: "user@example.com" },
      localUser: { id: 7, email: "user@example.com", alias: "user" },
    });

    const response = await GET(new Request("http://localhost:3000/api/calendar?month=2026-13"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_MONTH");
  });

  it("POST creates a calendar event for the authenticated user", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-11", email: "user@example.com" },
      localUser: { id: 11, email: "user@example.com", alias: "user" },
    });
    prismaMock.calendarEvent.create.mockResolvedValue({
      id: 5,
      title: "면담",
      description: "지도교수 면담",
      location: "본관",
      startsAt: new Date("2026-04-14T03:00:00.000Z"),
      endsAt: new Date("2026-04-14T04:00:00.000Z"),
      colorToken: "blue",
      isAllDay: false,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "면담",
          description: "지도교수 면담",
          location: "본관",
          startsAt: "2026-04-14T03:00:00.000Z",
          endsAt: "2026-04-14T04:00:00.000Z",
          colorToken: "blue",
          isAllDay: false,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(prismaMock.calendarEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authUserId: "auth-user-11",
          title: "면담",
          colorToken: "blue",
        }),
      })
    );
    expect(body.data.event.id).toBe(5);
  });

  it("PATCH updates only the authenticated user's event", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-13", email: "user@example.com" },
      localUser: { id: 13, email: "user@example.com", alias: "user" },
    });
    prismaMock.calendarEvent.findFirst.mockResolvedValue({ id: 9 });
    prismaMock.calendarEvent.update.mockResolvedValue({
      id: 9,
      title: "수정된 일정",
      description: null,
      location: null,
      startsAt: new Date("2026-04-20T01:00:00.000Z"),
      endsAt: new Date("2026-04-20T02:00:00.000Z"),
      colorToken: "emerald",
      isAllDay: false,
    });

    const response = await PATCH(
      new Request("http://localhost:3000/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: 9,
          title: "수정된 일정",
          startsAt: "2026-04-20T01:00:00.000Z",
          endsAt: "2026-04-20T02:00:00.000Z",
          colorToken: "emerald",
          isAllDay: false,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.calendarEvent.findFirst).toHaveBeenCalledWith({
      where: {
        id: 9,
        authUserId: "auth-user-13",
      },
      select: { id: true },
    });
    expect(body.data.event.title).toBe("수정된 일정");
  });

  it("DELETE removes only the authenticated user's event", async () => {
    requireAppUserMock.mockResolvedValue({
      authUser: { id: "auth-user-14", email: "user@example.com" },
      localUser: { id: 14, email: "user@example.com", alias: "user" },
    });
    prismaMock.calendarEvent.deleteMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(
      new Request("http://localhost:3000/api/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 4 }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.calendarEvent.deleteMany).toHaveBeenCalledWith({
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

    const response = await GET(new Request("http://localhost:3000/api/calendar?month=2026-04"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
