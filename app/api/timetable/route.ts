import { NextResponse } from "next/server";
import { timetablePrisma } from "@/lib/prisma/timetable";
import { requireAppUser } from "@/lib/server-auth";

type LessonInput = {
  id?: number;
  subjectName: string;
  roomName: string;
  days: number[];
  startPeriod: number;
  endPeriod: number;
  colorCode: string;
};

type TimetableResponseData = {
  lessons: LessonInput[];
  blockedSlots: string[];
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

function successResponse(data: TimetableResponseData, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      lessons: data.lessons,
      blockedSlots: data.blockedSlots,
    },
    { status }
  );
}

async function resolveUserId(req: Request) {
  const appUser = await requireAppUser(req);

  if (appUser instanceof NextResponse) {
    return appUser;
  }

  return appUser.localUser.id;
}

function normalizeLessons(input: unknown): LessonInput[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const normalized = input.map((lesson) => lesson as LessonInput);

  for (const lesson of normalized) {
    if (
      !lesson ||
      typeof lesson.subjectName !== "string" ||
      typeof lesson.roomName !== "string" ||
      !Array.isArray(lesson.days) ||
      typeof lesson.startPeriod !== "number" ||
      typeof lesson.endPeriod !== "number" ||
      typeof lesson.colorCode !== "string"
    ) {
      return null;
    }
  }

  return normalized;
}

function normalizeBlockedSlots(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.some((slot) => typeof slot !== "string")) {
    return null;
  }

  return input;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lessons = normalizeLessons(body?.lessons);
    const blockedSlots = normalizeBlockedSlots(body?.blockedSlots);

    if (!lessons || !blockedSlots) {
      return errorResponse("INVALID_PAYLOAD", "시간표 요청 형식이 올바르지 않습니다.", 400);
    }

    const resolvedUserId = await resolveUserId(req);

    if (resolvedUserId instanceof NextResponse) {
      return resolvedUserId;
    }

    const dbRecords: {
      userId: number;
      subjectName: string;
      roomName: string;
      dayOfWeek: number;
      startPeriod: number;
      endPeriod: number;
      colorCode: string;
    }[] = [];

    for (const lesson of lessons) {
      for (const day of lesson.days) {
        dbRecords.push({
          userId: resolvedUserId,
          subjectName: lesson.subjectName,
          roomName: lesson.roomName,
          dayOfWeek: day,
          startPeriod: lesson.startPeriod,
          endPeriod: lesson.endPeriod,
          colorCode: lesson.colorCode,
        });
      }
    }

    for (const slot of blockedSlots) {
      const [period, day] = slot.split("-");
      const parsedPeriod = Number(period);
      const parsedDay = Number(day);

      if (!Number.isInteger(parsedPeriod) || !Number.isInteger(parsedDay)) {
        return errorResponse("INVALID_BLOCKED_SLOT", "막은 시간 형식이 올바르지 않습니다.", 400);
      }

      dbRecords.push({
        userId: resolvedUserId,
        subjectName: "BLOCKED",
        roomName: "",
        dayOfWeek: parsedDay,
        startPeriod: parsedPeriod,
        endPeriod: parsedPeriod,
        colorCode: "bg-gray-100",
      });
    }

    await timetablePrisma.$transaction([
      timetablePrisma.lesson.deleteMany({ where: { userId: resolvedUserId } }),
      timetablePrisma.lesson.createMany({ data: dbRecords }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: { saved: true },
        message: "시간표가 저장되었습니다.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to save timetable", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "시간표 저장 중 오류가 발생했습니다.", 500);
  }
}

export async function GET(req: Request) {
  try {
    const resolvedUserId = await resolveUserId(req);

    if (resolvedUserId instanceof NextResponse) {
      return resolvedUserId;
    }

    const dbRecords = await timetablePrisma.lesson.findMany({
      where: { userId: resolvedUserId },
    });

    const blockedSlots = new Set<string>();
    const lessonMap = new Map<string, LessonInput>();

    dbRecords.forEach((record) => {
      if (record.subjectName === "BLOCKED") {
        blockedSlots.add(`${record.startPeriod}-${record.dayOfWeek}`);
        return;
      }

      const key = `${record.subjectName}-${record.roomName}-${record.startPeriod}-${record.endPeriod}-${record.colorCode}`;

      if (!lessonMap.has(key)) {
        lessonMap.set(key, {
          id: record.id,
          subjectName: record.subjectName,
          roomName: record.roomName,
          startPeriod: record.startPeriod,
          endPeriod: record.endPeriod,
          colorCode: record.colorCode,
          days: [record.dayOfWeek],
        });
        return;
      }

      lessonMap.get(key)?.days.push(record.dayOfWeek);
    });

    return successResponse({
      lessons: Array.from(lessonMap.values()),
      blockedSlots: Array.from(blockedSlots),
    });
  } catch (error) {
    console.error("Failed to load timetable", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "시간표를 불러오는 중 오류가 발생했습니다.", 500);
  }
}
