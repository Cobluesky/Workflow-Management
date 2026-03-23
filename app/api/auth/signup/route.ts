import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "REMOVED",
        message: "Legacy local signup route has been removed. Use the auth server register API instead.",
      },
    },
    { status: 410 }
  );
}
