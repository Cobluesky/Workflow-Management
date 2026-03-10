import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST 함수 : 데이터 저장 및 삭제
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, lessons, blockedSlots } = body;

    if (!userId) {
      return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
    }

    // 1. DB에 넣을 수 있도록 데이터 평탄화 작업
    const dbRecords: any[] = [];

    // - 실제 수업 데이터 변환
    for (const lesson of lessons) {
      for (const day of lesson.days) { // [0, 2] (월, 수) 형태로 온 것을 각각 쪼갬
        dbRecords.push({
          userId: userId,
          subjectName: lesson.subjectName,
          roomName: lesson.roomName,
          dayOfWeek: day,
          startPeriod: lesson.startPeriod,
          endPeriod: lesson.endPeriod,
          colorCode: lesson.colorCode,
        });
      }
    }

    // - 막아둔 빈칸(Blocked) 데이터 변환 ("1-0" -> 1교시 월요일)
    for (const slot of blockedSlots) {
      const [period, day] = slot.split('-');
      dbRecords.push({
        userId: userId,
        subjectName: "BLOCKED", // 막힌 칸을 구별하는 특수 키워드
        roomName: "",
        dayOfWeek: parseInt(day),
        startPeriod: parseInt(period),
        endPeriod: parseInt(period),
        colorCode: "bg-gray-100", 
      });
    }

    // 2. 트랜잭션 (안전한 저장)
    // 기존에 있던 이 유저의 시간표를 지우고, 새 데이터 덮어씌움
    await prisma.$transaction([
      prisma.lesson.deleteMany({ where: { userId: userId } }),
      prisma.lesson.createMany({ data: dbRecords })
    ]);

    return NextResponse.json({ message: "성공적으로 저장되었습니다." }, { status: 200 });

  } catch (error) {
    console.error("시간표 저장 에러:", error);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

//GET 함수 : 저장 데이터 호출
export async function GET(req: Request) {
  try {
    // 1. 요청 URL에서 유저 ID 꺼내기 (예: /api/timetable?userId=1)
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "유저 ID가 필요합니다." }, { status: 400 });
    }

    // 2. DB에서 이 유저의 모든 시간표 조각들을 가져오기
    const dbRecords = await prisma.lesson.findMany({
      where: { userId: Number(userId) },
    });

    // 3. 데이터 조립하기
    const blockedSlots = new Set<string>();
    const lessonMap = new Map<string, any>();

    dbRecords.forEach((record) => {
      // 막힌 칸(Blocked) 복구 ("1-0" 형태로 다시 조립)
      if (record.subjectName === "BLOCKED") {
        blockedSlots.add(`${record.startPeriod}-${record.dayOfWeek}`);
      } 
      // 일반 수업 묶음 복구
      else {
        // 과목명, 시간, 색상이 같으면 하나의 묶음으로 간주할 고유 키 생성
        const key = `${record.subjectName}-${record.roomName}-${record.startPeriod}-${record.endPeriod}-${record.colorCode}`;
        
        if (!lessonMap.has(key)) {
          // 처음 발견된 수업이면 새로 만듦
          lessonMap.set(key, {
            id: record.id,
            subjectName: record.subjectName,
            roomName: record.roomName,
            startPeriod: record.startPeriod,
            endPeriod: record.endPeriod,
            colorCode: record.colorCode,
            days: [record.dayOfWeek], // 요일을 배열에 담기 시작
          });
        } else {
          // 이미 있는 수업의 다른 요일 조각이면 배열에 요일만 추가
          lessonMap.get(key).days.push(record.dayOfWeek);
        }
      }
    });

    // 4. 정리된 데이터 프론트엔드로 전달
    return NextResponse.json({
      lessons: Array.from(lessonMap.values()),
      blockedSlots: Array.from(blockedSlots),
    }, { status: 200 });

  } catch (error) {
    console.error("시간표 불러오기 에러:", error);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}