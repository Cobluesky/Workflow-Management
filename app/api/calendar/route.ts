import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/server-auth";

const VALID_COLOR_TOKENS = new Set(["indigo", "blue", "emerald", "amber", "rose", "violet"]);

type CalendarEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  colorToken?: string;
  isAllDay?: boolean;
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

function normalizeMonthRange(monthValue: string | null) {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) {
    return null;
  }

  const [year, month] = monthValue.split("-").map(Number);

  if (!year || !month || month < 1 || month > 12) {
    return null;
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  // Query one extra UTC day on both sides so events created from local dates near
  // month boundaries do not disappear when the server stores them as UTC.
  const queryStart = new Date(start);
  queryStart.setUTCDate(queryStart.getUTCDate() - 1);

  const queryEnd = new Date(end);
  queryEnd.setUTCDate(queryEnd.getUTCDate() + 1);

  return { start, end, queryStart, queryEnd };
}

function normalizeEventInput(input: unknown): (CalendarEventInput & { startsAtDate: Date; endsAtDate: Date }) | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const payload = input as CalendarEventInput;
  const title = payload.title?.trim();
  const description = payload.description?.trim() || null;
  const location = payload.location?.trim() || null;
  const startsAtDate = new Date(payload.startsAt);
  const endsAtDate = new Date(payload.endsAt);
  const colorToken = payload.colorToken ?? "indigo";
  const isAllDay = payload.isAllDay ?? false;

  if (!title || title.length > 80) {
    return null;
  }

  if (description && description.length > 500) {
    return null;
  }

  if (location && location.length > 120) {
    return null;
  }

  if (Number.isNaN(startsAtDate.valueOf()) || Number.isNaN(endsAtDate.valueOf())) {
    return null;
  }

  if (startsAtDate >= endsAtDate) {
    return null;
  }

  if (!VALID_COLOR_TOKENS.has(colorToken)) {
    return null;
  }

  if (typeof isAllDay !== "boolean") {
    return null;
  }

  return {
    title,
    description,
    location,
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    startsAtDate,
    endsAtDate,
    colorToken,
    isAllDay,
  };
}

export async function GET(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const url = new URL(req.url);
    const range = normalizeMonthRange(url.searchParams.get("month"));

    if (!range) {
      return errorResponse("INVALID_MONTH", "month must follow YYYY-MM format.", 400);
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: appUser.localUser.id,
        startsAt: {
          lt: range.queryEnd,
        },
        endsAt: {
          gt: range.queryStart,
        },
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startsAt: true,
        endsAt: true,
        colorToken: true,
        isAllDay: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          events,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load calendar events", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to load calendar events.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const payload = normalizeEventInput(await req.json());

    if (!payload) {
      return errorResponse("INVALID_EVENT", "Calendar event payload is invalid.", 400);
    }

    const createdEvent = await prisma.calendarEvent.create({
      data: {
        userId: appUser.localUser.id,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        startsAt: payload.startsAtDate,
        endsAt: payload.endsAtDate,
        colorToken: payload.colorToken,
        isAllDay: payload.isAllDay,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startsAt: true,
        endsAt: true,
        colorToken: true,
        isAllDay: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          event: createdEvent,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create calendar event", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to create calendar event.", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const body = (await req.json()) as { id?: number } & CalendarEventInput;
    const eventId = Number(body.id);
    const payload = normalizeEventInput(body);

    if (!Number.isInteger(eventId) || eventId <= 0 || !payload) {
      return errorResponse("INVALID_EVENT", "Calendar event payload is invalid.", 400);
    }

    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        userId: appUser.localUser.id,
      },
      select: { id: true },
    });

    if (!existingEvent) {
      return errorResponse("CALENDAR_EVENT_NOT_FOUND", "Calendar event could not be found.", 404);
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        title: payload.title,
        description: payload.description,
        location: payload.location,
        startsAt: payload.startsAtDate,
        endsAt: payload.endsAtDate,
        colorToken: payload.colorToken,
        isAllDay: payload.isAllDay,
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startsAt: true,
        endsAt: true,
        colorToken: true,
        isAllDay: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          event: updatedEvent,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update calendar event", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to update calendar event.", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const body = (await req.json()) as { id?: number };
    const eventId = Number(body.id);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return errorResponse("INVALID_EVENT_ID", "Calendar event id is invalid.", 400);
    }

    const deletedEvent = await prisma.calendarEvent.deleteMany({
      where: {
        id: eventId,
        userId: appUser.localUser.id,
      },
    });

    if (deletedEvent.count === 0) {
      return errorResponse("CALENDAR_EVENT_NOT_FOUND", "Calendar event could not be found.", 404);
    }

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete calendar event", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to delete calendar event.", 500);
  }
}
