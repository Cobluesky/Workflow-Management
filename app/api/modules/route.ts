import { NextResponse } from "next/server";
import { corePrisma } from "@/lib/prisma/core";
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

async function readOrInitializeModules(authUserId: string) {
  const moduleState = await corePrisma.workspaceModuleState.findUnique({
    where: { authUserId },
    select: {
      workspaceModulesInitialized: true,
    },
  });

  const storedModules = await corePrisma.workspaceModulePreference.findMany({
    where: { authUserId },
    orderBy: { position: "asc" },
    select: {
      moduleId: true,
    },
  });

  if (storedModules.length > 0) {
    return storedModules.map((module) => module.moduleId);
  }

  if (moduleState?.workspaceModulesInitialized) {
    return [];
  }

  await corePrisma.$transaction(async (tx) => {
    await tx.workspaceModulePreference.createMany({
      data: DEFAULT_ENABLED_MODULE_IDS.map((moduleId, index) => ({
        authUserId,
        moduleId,
        position: index,
      })),
    });
    await tx.workspaceModuleState.upsert({
      where: { authUserId },
      update: {
        workspaceModulesInitialized: true,
      },
      create: {
        authUserId,
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

    const enabledModuleIds = await readOrInitializeModules(appUser.authUser.id);
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

    await corePrisma.$transaction(async (tx) => {
      await tx.workspaceModulePreference.deleteMany({
        where: { authUserId: appUser.authUser.id },
      });

      if (enabledModuleIds.length > 0) {
        await tx.workspaceModulePreference.createMany({
          data: enabledModuleIds.map((moduleId, index) => ({
            authUserId: appUser.authUser.id,
            moduleId,
            position: index,
          })),
        });
      }

      await tx.workspaceModuleState.upsert({
        where: { authUserId: appUser.authUser.id },
        update: {
          workspaceModulesInitialized: true,
        },
        create: {
          authUserId: appUser.authUser.id,
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
