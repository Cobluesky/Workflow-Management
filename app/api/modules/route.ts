import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/server-auth";
import { DEFAULT_ENABLED_MODULE_IDS, WORKSPACE_MODULES } from "@/app/moduleRegistry";

type ModulesResponseData = {
  enabledModuleIds: string[];
};

const VALID_MODULE_IDS = new Set(WORKSPACE_MODULES.map((module) => module.id));

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

function successResponse(data: ModulesResponseData, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

function normalizeModuleIds(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.some((moduleId) => typeof moduleId !== "string")) {
    return null;
  }

  const uniqueModuleIds = Array.from(new Set(input));

  if (uniqueModuleIds.some((moduleId) => !VALID_MODULE_IDS.has(moduleId))) {
    return null;
  }

  return uniqueModuleIds;
}

async function readOrInitializeModules(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      workspaceModulesInitialized: true,
    },
  });

  const storedModules = await prisma.workspaceModulePreference.findMany({
    where: { userId },
    orderBy: { position: "asc" },
    select: {
      moduleId: true,
    },
  });

  if (storedModules.length > 0) {
    return storedModules.map((module) => module.moduleId);
  }

  if (user?.workspaceModulesInitialized) {
    return [];
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceModulePreference.createMany({
      data: DEFAULT_ENABLED_MODULE_IDS.map((moduleId, index) => ({
        userId,
        moduleId,
        position: index,
      })),
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        workspaceModulesInitialized: true,
      },
    });
  });

  return DEFAULT_ENABLED_MODULE_IDS;
}

export async function GET(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const enabledModuleIds = await readOrInitializeModules(appUser.localUser.id);
    return successResponse({ enabledModuleIds });
  } catch (error) {
    console.error("Failed to load workspace modules", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "모듈 구성을 불러오는 중 오류가 발생했습니다.", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const body = await req.json();
    const enabledModuleIds = normalizeModuleIds(body?.enabledModuleIds);

    if (!enabledModuleIds) {
      return errorResponse("INVALID_MODULE_CONFIG", "모듈 구성 형식이 올바르지 않습니다.", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.workspaceModulePreference.deleteMany({
        where: { userId: appUser.localUser.id },
      });

      if (enabledModuleIds.length > 0) {
        await tx.workspaceModulePreference.createMany({
          data: enabledModuleIds.map((moduleId, index) => ({
            userId: appUser.localUser.id,
            moduleId,
            position: index,
          })),
        });
      }

      await tx.user.update({
        where: { id: appUser.localUser.id },
        data: {
          workspaceModulesInitialized: true,
        },
      });
    });

    return successResponse({ enabledModuleIds });
  } catch (error) {
    console.error("Failed to update workspace modules", error);
    return errorResponse("INTERNAL_SERVER_ERROR", "모듈 구성을 저장하는 중 오류가 발생했습니다.", 500);
  }
}
