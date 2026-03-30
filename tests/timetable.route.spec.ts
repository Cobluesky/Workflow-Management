import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireAppUserMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  lesson: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  requireAppUser: requireAppUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET, POST } from "@/app/api/timetable/route";

describe("timetable route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.$transaction.mockResolvedValue([]);
  });

  it("POST rejects invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lessons: "invalid", blockedSlots: [] }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_PAYLOAD");
  });

  it("POST saves timetable using authenticated user", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 3,
        email: "user@example.com",
        alias: "테스터",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 999,
          lessons: [
            {
              subjectName: "자료구조",
              roomName: "A101",
              days: [1, 3],
              startPeriod: 1,
              endPeriod: 2,
              colorCode: "bg-blue-200 text-blue-900",
            },
          ],
          blockedSlots: ["6-2"],
        }),
      })
    );
    const body = await response.json();

    expect(prismaMock.lesson.deleteMany).toHaveBeenCalledWith({
      where: { userId: 3 },
    });
    expect(prismaMock.lesson.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 3,
          subjectName: "자료구조",
          roomName: "A101",
          dayOfWeek: 1,
          startPeriod: 1,
          endPeriod: 2,
          colorCode: "bg-blue-200 text-blue-900",
        },
        {
          userId: 3,
          subjectName: "자료구조",
          roomName: "A101",
          dayOfWeek: 3,
          startPeriod: 1,
          endPeriod: 2,
          colorCode: "bg-blue-200 text-blue-900",
        },
        {
          userId: 3,
          subjectName: "BLOCKED",
          roomName: "",
          dayOfWeek: 2,
          startPeriod: 6,
          endPeriod: 6,
          colorCode: "bg-gray-100",
        },
      ],
    });
    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { saved: true },
      message: "시간표가 저장되었습니다.",
    });
  });

  it("GET loads and aggregates timetable", async () => {
    requireAppUserMock.mockResolvedValue({
      localUser: {
        id: 3,
        email: "user@example.com",
        alias: "테스터",
      },
    });
    prismaMock.lesson.findMany.mockResolvedValue([
      {
        id: 10,
        userId: 3,
        subjectName: "자료구조",
        roomName: "A101",
        dayOfWeek: 1,
        startPeriod: 1,
        endPeriod: 2,
        colorCode: "bg-blue-200 text-blue-900",
      },
      {
        id: 11,
        userId: 3,
        subjectName: "자료구조",
        roomName: "A101",
        dayOfWeek: 3,
        startPeriod: 1,
        endPeriod: 2,
        colorCode: "bg-blue-200 text-blue-900",
      },
      {
        id: 12,
        userId: 3,
        subjectName: "BLOCKED",
        roomName: "",
        dayOfWeek: 2,
        startPeriod: 6,
        endPeriod: 6,
        colorCode: "bg-gray-100",
      },
    ]);

    const response = await GET(new Request("http://localhost:3000/api/timetable"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.lessons).toEqual([
      {
        id: 10,
        subjectName: "자료구조",
        roomName: "A101",
        startPeriod: 1,
        endPeriod: 2,
        colorCode: "bg-blue-200 text-blue-900",
        days: [1, 3],
      },
    ]);
    expect(body.data.blockedSlots).toEqual(["6-2"]);
    expect(body.lessons).toEqual(body.data.lessons);
    expect(body.blockedSlots).toEqual(body.data.blockedSlots);
  });

  it("passes through auth errors when user resolution fails", async () => {
    const authResponse = NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "액세스 토큰이 필요합니다." },
      },
      { status: 401 }
    );

    requireAppUserMock.mockResolvedValue(authResponse);

    const response = await GET(new Request("http://localhost:3000/api/timetable"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
