import { NextResponse } from "next/server";
import { corePrisma } from "@/lib/prisma/core";
import { ensureWorkspaceProfile, requireAppUser, syncLegacyLocalAlias } from "@/lib/server-auth";

export async function GET(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const workspaceProfile = await ensureWorkspaceProfile(appUser);
    await syncLegacyLocalAlias(appUser, workspaceProfile.alias);

    return NextResponse.json(
      {
        success: true,
        data: {
          alias: workspaceProfile.alias,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to load user profile." },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    const { newAlias } = await req.json();

    if (!newAlias || typeof newAlias !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ALIAS", message: "Alias is required." },
        },
        { status: 400 }
      );
    }

    const updatedUser = await corePrisma.workspaceProfile.upsert({
      where: { authUserId: appUser.authUser.id },
      update: {
        email: appUser.authUser.email,
        alias: newAlias,
      },
      create: {
        authUserId: appUser.authUser.id,
        email: appUser.authUser.email,
        alias: newAlias,
      },
      select: { alias: true },
    });
    await syncLegacyLocalAlias(appUser, updatedUser.alias);

    return NextResponse.json(
      {
        success: true,
        data: {
          alias: updatedUser.alias,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to update alias." },
      },
      { status: 500 }
    );
  }
}
