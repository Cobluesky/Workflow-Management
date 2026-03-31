"use client";

import AppShell from "@/app/AppShell";

export default function ProjectsPage() {
  return (
    <AppShell
      title="프로젝트"
      description="장기 프로젝트와 산출물을 추적하는 모듈입니다. 실제 데이터 저장소는 projects_db를 기준으로 분리할 계획입니다."
    >
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Planned Module</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">프로젝트 모듈 준비 중</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          장기 일정, 담당자, 결과물을 한곳에서 관리하기 위한 모듈입니다. 구현 시점에는
          <span className="mx-1 font-semibold text-slate-700">projects_db</span>
          를 별도 저장소로 두고 워크스페이스 전반과 연동할 예정입니다.
        </p>
      </section>
    </AppShell>
  );
}
