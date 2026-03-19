import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. 입력값 확인
    if (!email || !password) {
      return NextResponse.json(
        { message: "이메일과 비밀번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 2. 이미 가입된 이메일인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "이미 가입된 이메일입니다." },
        { status: 409 }
      );
    }

    // 3. 비밀번호 암호화 (소금치기 10번)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. DB에 유저 저장
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: "회원가입이 완료되었습니다." },
      { status: 201 }
    );
  } catch (error) {
    console.error("회원가입 에러:", error);
    return NextResponse.json(
      { message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}