import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/server-auth";

export async function GET(req: Request) {
  try {
    const appUser = await requireAppUser(req);

    if (appUser instanceof NextResponse) {
      return appUser;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          alias: appUser.localUser.alias,
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

    const updatedUser = await prisma.user.update({
      where: { id: appUser.localUser.id },
      data: { alias: newAlias },
      select: { alias: true },
    });

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
