import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const { userId, newAlias } = await req.json();

    if (!userId || !newAlias) {
      return NextResponse.json({ message: "필수 정보 누락" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: Number(userId) },
      data: { alias: newAlias },
    });

    return NextResponse.json({ message: "닉네임 변경 성공" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
}