"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/app/AppShell";
import { useAuth } from "@/app/Providers";

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

type TaskItem = {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
};

type TaskFormState = {
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
};

const STATUS_META: Record<TaskStatus, { label: string; accent: string }> = {
  todo: {
    label: "할 일",
    accent: "border-slate-200 bg-slate-50 text-slate-700",
  },
  in_progress: {
    label: "진행 중",
    accent: "border-amber-200 bg-amber-50 text-amber-700",
  },
  done: {
    label: "완료",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

const PRIORITY_META: Record<TaskPriority, { label: string; badge: string }> = {
  low: {
    label: "낮음",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
  },
  medium: {
    label: "보통",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  },
  high: {
    label: "높음",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

function createDefaultForm(): TaskFormState {
  return {
    title: "",
    description: "",
    dueDate: "",
    status: "todo",
    priority: "medium",
  };
}

function toLocalDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDateLabel(value: string | null) {
  if (!value) {
    return "마감일 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function compareTaskItems(left: TaskItem, right: TaskItem) {
  if (left.dueDate && right.dueDate) {
    const dueDateCompare = left.dueDate.localeCompare(right.dueDate);

    if (dueDateCompare !== 0) {
      return dueDateCompare;
    }
  } else if (left.dueDate) {
    return -1;
  } else if (right.dueDate) {
    return 1;
  }

  return right.updatedAt.localeCompare(left.updatedAt);
}

function normalizeTaskForm(formState: TaskFormState) {
  const title = formState.title.trim();
  const description = formState.description.trim();

  if (!title) {
    return { error: "작업 제목을 입력해 주세요." };
  }

  return {
    payload: {
      title,
      description: description || null,
      dueDate: formState.dueDate ? new Date(`${formState.dueDate}T23:59:00`).toISOString() : null,
      status: formState.status,
      priority: formState.priority,
    },
  };
}

export default function TaskModule() {
  const { accessToken, isLoading } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<TaskFormState>(() => createDefaultForm());

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!accessToken) {
      setTasks([]);
      return;
    }

    let cancelled = false;

    async function loadTasks() {
      setIsTasksLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/tasks", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const body = (await response.json()) as {
          success: boolean;
          data?: { tasks: TaskItem[] };
          error?: { message: string };
        };

        if (!response.ok || !body.success) {
          throw new Error(body.error?.message || "할 일 목록을 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setTasks((body.data?.tasks ?? []).sort(compareTaskItems));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "할 일 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsTasksLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isLoading]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [task.title, task.description ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [searchQuery, statusFilter, tasks]);

  const groupedTasks = useMemo(() => {
    return STATUS_ORDER.reduce<Record<TaskStatus, TaskItem[]>>(
      (groups, status) => {
        groups[status] = filteredTasks.filter((task) => task.status === status).sort(compareTaskItems);
        return groups;
      },
      {
        todo: [],
        in_progress: [],
        done: [],
      }
    );
  }, [filteredTasks]);

  const summary = useMemo(() => {
    const todayKey = toLocalDateKey(new Date().toISOString());

    return {
      total: tasks.length,
      dueToday: tasks.filter((task) => task.dueDate && toLocalDateKey(task.dueDate) === todayKey && task.status !== "done").length,
      completed: tasks.filter((task) => task.status === "done").length,
    };
  }, [tasks]);

  function openCreateModal() {
    setEditingTaskId(null);
    setFormState(createDefaultForm());
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  function openEditModal(task: TaskItem) {
    setEditingTaskId(task.id);
    setFormState({
      title: task.title,
      description: task.description ?? "",
      dueDate: task.dueDate ? toLocalDateKey(task.dueDate) : "",
      status: task.status,
      priority: task.priority,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  async function handleSaveTask() {
    if (!accessToken) {
      setErrorMessage("로그인 후 할 일 모듈을 사용할 수 있습니다.");
      return;
    }

    const normalized = normalizeTaskForm(formState);

    if ("error" in normalized) {
      setErrorMessage(normalized.error ?? "입력값을 다시 확인해 주세요.");
      return;
    }

    const response = await fetch("/api/tasks", {
      method: editingTaskId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(
        editingTaskId
          ? {
              id: editingTaskId,
              ...normalized.payload,
            }
          : normalized.payload
      ),
    });

    const body = (await response.json()) as {
      success: boolean;
      data?: { task: TaskItem };
      error?: { message: string };
    };

    const savedTask = body.data?.task;

    if (!response.ok || !body.success || !savedTask) {
      setErrorMessage(body.error?.message ?? "할 일을 저장하지 못했습니다.");
      return;
    }

    setTasks((current) => {
      const nextTasks = editingTaskId
        ? current.map((task) => (task.id === savedTask.id ? savedTask : task))
        : [...current, savedTask];

      return nextTasks.sort(compareTaskItems);
    });
    setIsModalOpen(false);
    setErrorMessage(null);
  }

  async function handleDeleteTask() {
    if (!accessToken || !editingTaskId) {
      return;
    }

    const response = await fetch("/api/tasks", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id: editingTaskId }),
    });

    const body = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };

    if (!response.ok || !body.success) {
      setErrorMessage(body.error?.message ?? "할 일을 삭제하지 못했습니다.");
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== editingTaskId));
    setIsModalOpen(false);
    setErrorMessage(null);
  }

  return (
    <AppShell
      title="할 일"
      description="마감 일정과 개인 작업 흐름을 관리하는 태스크 모듈입니다. 현재는 앱 DB를 사용하고, 이후 tasks_db로 분리할 수 있게 경계를 잡아둔 상태입니다."
    >
      <div className="flex flex-col gap-6">
        <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">이번 주 작업 흐름</h2>
              <p className="text-sm font-medium text-slate-500">진행 중인 일과 마감 일정을 한 화면에서 정리하세요.</p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-300 active:scale-95"
            >
              + 새 작업
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-sm font-medium text-slate-500">전체 작업</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-sm font-medium text-amber-700">오늘 마감</p>
              <p className="mt-2 text-3xl font-bold text-amber-800">{summary.dueToday}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
              <p className="text-sm font-medium text-emerald-700">완료</p>
              <p className="mt-2 text-3xl font-bold text-emerald-800">{summary.completed}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                전체
              </button>
              {STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    statusFilter === status
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {STATUS_META[status].label}
                </button>
              ))}
            </div>

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="제목이나 메모 검색"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 lg:max-w-xs"
            />
          </div>
        </section>

        {isTasksLoading ? (
          <section className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center text-sm font-medium text-slate-400 shadow-sm">
            할 일 목록을 불러오는 중입니다.
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-3">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_META[status].accent}`}>
                    {STATUS_META[status].label}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">{groupedTasks[status].length}</span>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {groupedTasks[status].length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-400">
                      표시할 작업이 없습니다.
                    </div>
                  ) : (
                    groupedTasks[status].map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openEditModal(task)}
                        className="group flex w-full flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-base font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
                            {task.title}
                          </p>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${PRIORITY_META[task.priority].badge}`}>
                            {PRIORITY_META[task.priority].label}
                          </span>
                        </div>

                        {task.description ? (
                          <p className="line-clamp-3 text-sm leading-6 text-slate-500">{task.description}</p>
                        ) : null}

                        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                          <span>{formatDueDateLabel(task.dueDate)}</span>
                          <span>{STATUS_META[task.status].label}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {errorMessage && !isModalOpen ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 shadow-sm">
            {errorMessage}
          </section>
        ) : null}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">{editingTaskId ? "작업 수정" : "새 작업 추가"}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="할 일 편집 닫기"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {errorMessage ? (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
                  {errorMessage}
                </div>
              ) : null}

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500">제목</label>
                  <input
                    value={formState.title}
                    onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="작업 제목을 입력하세요"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">상태</label>
                    <select
                      value={formState.status}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          status: event.target.value as TaskStatus,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_META[status].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">우선순위</label>
                    <select
                      value={formState.priority}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          priority: event.target.value as TaskPriority,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    >
                      {(Object.keys(PRIORITY_META) as TaskPriority[]).map((priority) => (
                        <option key={priority} value={priority}>
                          {PRIORITY_META[priority].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500">마감일</label>
                  <input
                    type="date"
                    value={formState.dueDate}
                    onChange={(event) => setFormState((current) => ({ ...current, dueDate: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500">메모</label>
                  <textarea
                    value={formState.description}
                    onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[120px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="세부 작업 내용이나 체크 포인트를 남겨두세요"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                {editingTaskId ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteTask();
                    }}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100"
                  >
                    삭제
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition-all hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveTask();
                  }}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-95"
                >
                  {editingTaskId ? "저장하기" : "만들기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
