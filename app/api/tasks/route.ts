import { NextResponse } from "next/server";
import { tasksPrisma } from "@/lib/prisma/tasks";
import { requireAppUser } from "@/lib/server-auth";

const VALID_STATUSES = new Set(["todo", "in_progress", "done"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high"]);

type TaskInput = {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status?: string;
  priority?: string;
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

function normalizeTaskInput(input: unknown) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const payload = input as TaskInput;
  const title = payload.title?.trim();
  const description = payload.description?.trim() || null;
  const status = payload.status ?? "todo";
  const priority = payload.priority ?? "medium";

  if (!title || title.length > 120) {
    return null;
  }

  if (description && description.length > 1000) {
    return null;
  }

  if (!VALID_STATUSES.has(status) || !VALID_PRIORITIES.has(priority)) {
    return null;
  }

  let dueDate: Date | null = null;

  if (payload.dueDate) {
    dueDate = new Date(payload.dueDate);

    if (Number.isNaN(dueDate.valueOf())) {
      return null;
    }
  }

  return {
    title,
    description,
    dueDate,
    status,
    priority,
  };
}

export async function GET(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const tasks = await tasksPrisma.taskItem.findMany({
      where: {
        authUserId: appUser.authUser.id,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          tasks,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load tasks", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to load tasks.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const payload = normalizeTaskInput(await req.json());

    if (!payload) {
      return errorResponse("INVALID_TASK", "Task payload is invalid.", 400);
    }

    const createdTask = await tasksPrisma.taskItem.create({
      data: {
        authUserId: appUser.authUser.id,
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        status: payload.status,
        priority: payload.priority,
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          task: createdTask,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create task", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to create task.", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const body = (await req.json()) as { id?: number } & TaskInput;
    const taskId = Number(body.id);
    const payload = normalizeTaskInput(body);

    if (!Number.isInteger(taskId) || taskId <= 0 || !payload) {
      return errorResponse("INVALID_TASK", "Task payload is invalid.", 400);
    }

    const existingTask = await tasksPrisma.taskItem.findFirst({
      where: {
        id: taskId,
        authUserId: appUser.authUser.id,
      },
      select: { id: true },
    });

    if (!existingTask) {
      return errorResponse("TASK_NOT_FOUND", "Task could not be found.", 404);
    }

    const updatedTask = await tasksPrisma.taskItem.update({
      where: { id: taskId },
      data: {
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        status: payload.status,
        priority: payload.priority,
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          task: updatedTask,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update task", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to update task.", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const body = (await req.json()) as { id?: number };
    const taskId = Number(body.id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return errorResponse("INVALID_TASK_ID", "Task id is invalid.", 400);
    }

    const deletedTask = await tasksPrisma.taskItem.deleteMany({
      where: {
        id: taskId,
        authUserId: appUser.authUser.id,
      },
    });

    if (deletedTask.count === 0) {
      return errorResponse("TASK_NOT_FOUND", "Task could not be found.", 404);
    }

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete task", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "Failed to delete task.", 500);
  }
}
