"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/Providers";
import {
  DEFAULT_ENABLED_MODULE_IDS,
  getModuleByHref,
  getModuleStorageSummary,
  WORKSPACE_MODULES,
  type WorkspaceModule,
} from "@/app/moduleRegistry";

type AppShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

async function readStoredModuleIds(accessToken: string) {
  const response = await fetch("/api/modules", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load workspace modules.");
  }

  const payload = (await response.json()) as {
    success: boolean;
    data: {
      enabledModuleIds: string[];
    };
  };

  return payload.data.enabledModuleIds;
}

async function writeStoredModuleIds(accessToken: string, moduleIds: string[]) {
  const response = await fetch("/api/modules", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      enabledModuleIds: moduleIds,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save workspace modules.");
  }
}

function SidebarModuleButton({
  module,
  isActive,
  onRemove
}: {
  module: WorkspaceModule;
  isActive: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-2xl border px-3 py-3 transition-colors ${
        isActive
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Link href={module.href} className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold">{module.label}</span>
          {isActive ? (
            <span className="rounded-full bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white">현재</span>
          ) : null}
        </div>
      </Link>

      <button
        type="button"
        aria-label={`${module.label} 모듈 제거`}
        onClick={onRemove}
        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-rose-500"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" />
        </svg>
      </button>
    </div>
  );
}

export default function AppShell({ title, description, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, isLoading: isAuthLoading } = useAuth();
  const [enabledModuleIds, setEnabledModuleIds] = useState<string[]>(DEFAULT_ENABLED_MODULE_IDS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isModulesLoading, setIsModulesLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    let cancelled = false;

    async function initializeModules() {
      if (!accessToken) {
        if (!cancelled) {
          setEnabledModuleIds(DEFAULT_ENABLED_MODULE_IDS);
          setIsModulesLoading(false);
        }
        return;
      }

      setIsModulesLoading(true);

      try {
        const storedModuleIds = await readStoredModuleIds(accessToken);

        if (!cancelled) {
          setEnabledModuleIds(storedModuleIds.length > 0 ? storedModuleIds : DEFAULT_ENABLED_MODULE_IDS);
        }
      } catch {
        if (!cancelled) {
          setEnabledModuleIds(DEFAULT_ENABLED_MODULE_IDS);
        }
      } finally {
        if (!cancelled) {
          setIsModulesLoading(false);
        }
      }
    }

    initializeModules();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthLoading]);

  const enabledModules = useMemo(
    () => WORKSPACE_MODULES.filter((module) => enabledModuleIds.includes(module.id)),
    [enabledModuleIds]
  );

  const disabledModules = useMemo(
    () => WORKSPACE_MODULES.filter((module) => !enabledModuleIds.includes(module.id)),
    [enabledModuleIds]
  );

  async function persistModuleIds(nextIds: string[]) {
    if (!accessToken) {
      return;
    }

    await writeStoredModuleIds(accessToken, nextIds);
  }

  async function handleRemoveModule(moduleId: string) {
    const previousIds = enabledModuleIds;
    const nextIds = previousIds.filter((id) => id !== moduleId);
    const currentModule = getModuleByHref(pathname);

    setEnabledModuleIds(nextIds);

    try {
      await persistModuleIds(nextIds);
    } catch {
      setEnabledModuleIds(previousIds);
      return;
    }

    if (currentModule?.id === moduleId) {
      const nextModule = WORKSPACE_MODULES.find((module) => nextIds.includes(module.id));

      if (nextModule) {
        router.push(nextModule.href);
      } else {
        setIsAddModalOpen(true);
      }
    }
  }

  async function handleAddModule(moduleId: string) {
    const previousIds = enabledModuleIds;
    const nextIds = [...previousIds, moduleId];

    setEnabledModuleIds(nextIds);

    try {
      await persistModuleIds(nextIds);
    } catch {
      setEnabledModuleIds(previousIds);
      return;
    }

    setIsAddModalOpen(false);
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">My Workflow</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                모듈을 자유롭게 추가하고 제거하면서, 각 모듈이 독립적인 데이터 저장소를 갖는 워크스페이스 구조입니다.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="px-3 pb-2 pt-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Modules</p>
              </div>

              <nav className="space-y-2">
                {isModulesLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">
                    모듈 구성을 불러오는 중입니다.
                  </div>
                ) : enabledModules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">
                    활성화된 모듈이 없습니다. 아래 + 버튼으로 필요한 모듈을 추가하세요.
                  </div>
                ) : (
                  enabledModules.map((module) => (
                    <SidebarModuleButton
                      key={module.id}
                      module={module}
                      isActive={Boolean(getModuleByHref(pathname)?.id === module.id)}
                      onRemove={() => {
                        void handleRemoveModule(module.id);
                      }}
                    />
                  ))
                )}
              </nav>

              <div className="px-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 4.25a.75.75 0 01.75.75v4.25H15a.75.75 0 010 1.5h-4.25V15a.75.75 0 01-1.5 0v-4.25H5a.75.75 0 010-1.5h4.25V5a.75.75 0 01.75-.75z" />
                  </svg>
                  모듈 추가
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Signed in</p>
              <p className="mt-3 text-lg font-semibold">{user?.alias || user?.name || "워크스페이스 사용자"}</p>
              <p className="mt-1 text-sm text-slate-300">{user?.email || "로그인 후 모듈을 이용할 수 있습니다."}</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Modules</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white"
                aria-label="모듈 추가"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 4.25a.75.75 0 01.75.75v4.25H15a.75.75 0 010 1.5h-4.25V15a.75.75 0 01-1.5 0v-4.25H5a.75.75 0 010-1.5h4.25V5a.75.75 0 01.75-.75z" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {enabledModules.length === 0 ? (
                <span className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
                  활성 모듈 없음
                </span>
              ) : (
                enabledModules.map((module) => (
                  <div key={module.id} className="flex items-center rounded-full bg-slate-100 pr-1 text-sm font-medium">
                    <Link
                      href={module.href}
                      className={`whitespace-nowrap rounded-full px-4 py-2 ${
                        getModuleByHref(pathname)?.id === module.id ? "bg-indigo-600 text-white" : "text-slate-600"
                      }`}
                    >
                      {module.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRemoveModule(module.id);
                      }}
                      className="rounded-full p-2 text-slate-400"
                      aria-label={`${module.label} 모듈 제거`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <header className="mb-6 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Workspace Module</p>
            <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
              </div>
            </div>
          </header>

          {children}
        </div>
      </div>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Add Modules</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">워크스페이스에 모듈 추가</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  모듈은 사이드바에서 자유롭게 추가하거나 제거할 수 있습니다. 각 카드에는 현재 저장소와 계획 저장소를 함께
                  표시해서 구현 상태와 목표 구조를 구분합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="모달 닫기"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" />
                </svg>
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {disabledModules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                  추가 가능한 모듈이 없습니다. 이미 모든 모듈이 사이드바에 등록되어 있습니다.
                </div>
              ) : (
                disabledModules.map((module) => (
                  <div key={module.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{module.label}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{module.description}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          module.availability === "live"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {module.availability === "live" ? "Live" : "Planned"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Storage</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{getModuleStorageSummary(module)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void handleAddModule(module.id);
                        }}
                        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                      >
                        추가
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
