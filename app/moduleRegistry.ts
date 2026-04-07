export type WorkspaceModule = {
  id: string;
  label: string;
  href: string;
  description: string;
  availability: "live" | "planned";
  defaultEnabled?: boolean;
  currentDatabase: string | null;
  plannedDatabase?: string;
};

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  {
    id: "timetable",
    label: "시간표",
    href: "/",
    description: "주간 수업과 개인 일정을 관리하는 기본 모듈",
    availability: "live",
    defaultEnabled: true,
    currentDatabase: "timetable_db"
  },
  {
    id: "mypage",
    label: "마이페이지",
    href: "/mypage",
    description: "계정 정보와 별명을 관리하는 사용자 설정 모듈",
    availability: "live",
    defaultEnabled: true,
    currentDatabase: "timetable_db",
    plannedDatabase: "profile_db"
  },
  {
    id: "calendar",
    label: "캘린더",
    href: "/calendar",
    description: "월간 일정과 개인 이벤트를 관리하는 모듈",
    availability: "live",
    defaultEnabled: false,
    currentDatabase: "timetable_db",
    plannedDatabase: "calendar_db"
  },
  {
    id: "tasks",
    label: "할 일",
    href: "/tasks",
    description: "개인 작업과 마감 일정을 관리하는 모듈",
    availability: "live",
    defaultEnabled: false,
    currentDatabase: "timetable_db",
    plannedDatabase: "tasks_db"
  },
  {
    id: "projects",
    label: "프로젝트",
    href: "/projects",
    description: "프로젝트별 보드와 자료를 관리하는 모듈",
    availability: "planned",
    currentDatabase: null,
    plannedDatabase: "projects_db"
  }
];

export const DEFAULT_ENABLED_MODULE_IDS = WORKSPACE_MODULES.filter(
  (module) => module.defaultEnabled
).map((module) => module.id);

export function getModuleByHref(pathname: string) {
  return WORKSPACE_MODULES.find((module) =>
    module.href === "/" ? pathname === "/" : pathname.startsWith(module.href)
  );
}

export function getModuleStorageSummary(module: WorkspaceModule) {
  if (module.currentDatabase && module.plannedDatabase && module.currentDatabase !== module.plannedDatabase) {
    return `현재 ${module.currentDatabase} · 계획 ${module.plannedDatabase}`;
  }

  if (module.currentDatabase) {
    return `현재 ${module.currentDatabase}`;
  }

  if (module.plannedDatabase) {
    return `계획 ${module.plannedDatabase}`;
  }

  return "저장소 미정";
}
