"use client";

import AppShell from "@/app/AppShell";

export default function CalendarPage() {
  return (
    <AppShell
      title="캘린더"
      description="시간표와 일정을 함께 엮는 캘린더 모듈입니다. 실제 데이터 저장소는 calendar_db를 기준으로 분리할 계획입니다."
    >
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Planned Module</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">캘린더 모듈 준비 중</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          이 모듈은 시간표와 개인 일정을 하나의 달력 시야로 묶기 위한 확장 영역입니다. 구현 시점에는
          <span className="mx-1 font-semibold text-slate-700">calendar_db</span>
          를 전용 저장소로 사용하도록 분리할 예정입니다.
        </p>
      </section>
    </AppShell>
  );
}
