"use client";

import AppShell from "@/app/AppShell";

export default function TasksPage() {
  return (
    <AppShell
      title="할 일"
      description="과제와 개인 업무를 관리하는 태스크 모듈입니다. 실제 데이터 저장소는 tasks_db를 기준으로 분리할 계획입니다."
    >
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Planned Module</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">할 일 모듈 준비 중</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          수업별 과제, 개인 체크리스트, 마감일 관리를 하나의 흐름으로 다루기 위한 모듈입니다. 구현 시점에는
          <span className="mx-1 font-semibold text-slate-700">tasks_db</span>
          를 독립 저장소로 두고 시간표 모듈과 느슨하게 연동할 예정입니다.
        </p>
      </section>
    </AppShell>
  );
}
