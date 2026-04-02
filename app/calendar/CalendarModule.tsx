"use client";

import { useEffect, useState } from "react";
import AppShell from "@/app/AppShell";
import { useAuth } from "@/app/Providers";

type CalendarEvent = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  colorToken: string;
  isAllDay: boolean;
};

type EventFormState = {
  title: string;
  description: string;
  location: string;
  date: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  colorToken: string;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLOR_STYLES: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
};
const COLOR_OPTIONS = Object.keys(COLOR_STYLES);

function formatMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateKey(value: string) {
  return formatDateKey(new Date(value));
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function buildCalendarDays(currentMonth: Date) {
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date,
      dateKey: formatDateKey(date),
      isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
      isToday: formatDateKey(date) === formatDateKey(new Date()),
    };
  });
}

function createDefaultForm(date: Date): EventFormState {
  return {
    title: "",
    description: "",
    location: "",
    date: formatDateKey(date),
    startsAt: "09:00",
    endsAt: "10:00",
    isAllDay: false,
    colorToken: "indigo",
  };
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function formatTimeLabel(value: string, isAllDay: boolean) {
  if (isAllDay) {
    return "종일";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildIsoDate(dateValue: string, timeValue: string, isAllDay: boolean, boundary: "start" | "end") {
  if (isAllDay) {
    const suffix = boundary === "start" ? "T00:00:00" : "T23:59:00";
    return new Date(`${dateValue}${suffix}`);
  }

  return new Date(`${dateValue}T${timeValue}:00`);
}

function normalizeFormToPayload(formState: EventFormState) {
  const title = formState.title.trim();
  const description = formState.description.trim();
  const location = formState.location.trim();
  const startsAt = buildIsoDate(formState.date, formState.startsAt, formState.isAllDay, "start");
  const endsAt = buildIsoDate(formState.date, formState.endsAt, formState.isAllDay, "end");

  if (!title) {
    return { error: "일정 제목을 입력해 주세요." };
  }

  if (startsAt >= endsAt) {
    return { error: "종료 시간이 시작 시간보다 뒤여야 합니다." };
  }

  return {
    payload: {
      title,
      description: description || null,
      location: location || null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      colorToken: formState.colorToken,
      isAllDay: formState.isAllDay,
    },
  };
}

export default function CalendarModule() {
  const { accessToken, isLoading } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [formState, setFormState] = useState<EventFormState>(() => createDefaultForm(new Date()));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!accessToken) {
      setEvents([]);
      return;
    }

    let cancelled = false;

    async function loadEvents() {
      setIsCalendarLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/calendar?month=${formatMonthKey(currentMonth)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const body = (await response.json()) as {
          success: boolean;
          data?: { events: CalendarEvent[] };
          error?: { message: string };
        };

        if (!response.ok || !body.success) {
          throw new Error(body.error?.message || "캘린더 일정을 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setEvents(body.data?.events ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "캘린더 일정을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsCalendarLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentMonth, isLoading]);

  const calendarDays = buildCalendarDays(currentMonth);
  const selectedEvents = events
    .filter((event) => toLocalDateKey(event.startsAt) === selectedDateKey)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  function openCreateModal(date: Date) {
    setEditingEventId(null);
    setFormState(createDefaultForm(date));
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  function openEditModal(event: CalendarEvent) {
    const startsAt = new Date(event.startsAt);
    const endsAt = new Date(event.endsAt);

    setEditingEventId(event.id);
    setFormState({
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      date: formatDateKey(startsAt),
      startsAt: `${String(startsAt.getHours()).padStart(2, "0")}:${String(startsAt.getMinutes()).padStart(2, "0")}`,
      endsAt: `${String(endsAt.getHours()).padStart(2, "0")}:${String(endsAt.getMinutes()).padStart(2, "0")}`,
      isAllDay: event.isAllDay,
      colorToken: event.colorToken,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  }

  async function handleSaveEvent() {
    if (!accessToken) {
      setErrorMessage("로그인 후 캘린더를 사용할 수 있습니다.");
      return;
    }

    const normalized = normalizeFormToPayload(formState);

    if ("error" in normalized) {
      setErrorMessage(normalized.error ?? "일정 입력값을 다시 확인해 주세요.");
      return;
    }

    const response = await fetch("/api/calendar", {
      method: editingEventId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(
        editingEventId
          ? {
              id: editingEventId,
              ...normalized.payload,
            }
          : normalized.payload
      ),
    });

    const body = (await response.json()) as {
      success: boolean;
      data?: { event: CalendarEvent };
      error?: { message: string };
    };

    const savedEvent = body.data?.event;

    if (!response.ok || !body.success || !savedEvent) {
      setErrorMessage(body.error?.message ?? "일정을 저장하지 못했습니다.");
      return;
    }

    setEvents((current) => {
      if (editingEventId) {
        return current.map((event) => (event.id === savedEvent.id ? savedEvent : event));
      }

      return [...current, savedEvent].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    });
    setSelectedDateKey(toLocalDateKey(savedEvent.startsAt));
    setIsModalOpen(false);
    setErrorMessage(null);
  }

  async function handleDeleteEvent() {
    if (!accessToken || !editingEventId) {
      return;
    }

    const response = await fetch("/api/calendar", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id: editingEventId }),
    });

    const body = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };

    if (!response.ok || !body.success) {
      setErrorMessage(body.error?.message ?? "일정을 삭제하지 못했습니다.");
      return;
    }

    setEvents((current) => current.filter((event) => event.id !== editingEventId));
    setIsModalOpen(false);
    setErrorMessage(null);
  }

  return (
    <AppShell
      title="캘린더"
      description="월간 일정과 개인 이벤트를 관리하는 캘린더 모듈입니다. 현재는 앱 DB를 사용하고, 이후 calendar_db로 분리할 수 있게 경계를 잡아둔 상태입니다."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Calendar</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">{formatMonthTitle(currentMonth)}</h2>
              <p className="mt-2 text-sm text-slate-500">날짜를 눌러 일정 추가, 기존 일정을 눌러 수정할 수 있습니다.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                다음
              </button>
              <button
                type="button"
                onClick={() => openCreateModal(new Date())}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                일정 추가
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarDays.map(({ date, dateKey, isCurrentMonth, isToday }) => {
              const dayEvents = events
                .filter((event) => toLocalDateKey(event.startsAt) === dateKey)
                .sort((left, right) => left.startsAt.localeCompare(right.startsAt));

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(dateKey);
                    openCreateModal(date);
                  }}
                  className={`min-h-[140px] rounded-2xl border p-3 text-left transition-colors ${
                    selectedDateKey === dateKey
                      ? "border-indigo-200 bg-indigo-50/70"
                      : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                  } ${!isCurrentMonth ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday ? "bg-indigo-600 text-white" : "text-slate-700"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{dayEvents.length > 0 ? `${dayEvents.length}건` : ""}</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setSelectedDateKey(dateKey);
                          openEditModal(event);
                        }}
                        className={`rounded-xl border px-2 py-2 text-xs ${COLOR_STYLES[event.colorToken] ?? COLOR_STYLES.indigo}`}
                      >
                        <p className="truncate font-semibold">{event.title}</p>
                        <p className="mt-1 truncate opacity-80">{formatTimeLabel(event.startsAt, event.isAllDay)}</p>
                      </div>
                    ))}
                    {dayEvents.length > 3 ? <p className="text-xs font-medium text-slate-400">+ {dayEvents.length - 3}개 더 보기</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Selected Date</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
              {new Intl.DateTimeFormat("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "long",
              }).format(parseDateKey(selectedDateKey))}
            </h3>
            <p className="mt-2 text-sm text-slate-500">선택한 날짜의 개인 일정을 빠르게 확인하고 수정할 수 있습니다.</p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Daily Agenda</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">일정 목록</h3>
              </div>
              <button
                type="button"
                onClick={() => openCreateModal(parseDateKey(selectedDateKey))}
                className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                선택 날짜에 추가
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {isCalendarLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                  캘린더 일정을 불러오는 중입니다.
                </div>
              ) : selectedEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
                  선택한 날짜에 등록된 일정이 없습니다.
                </div>
              ) : (
                selectedEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openEditModal(event)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-left transition-colors hover:border-indigo-200 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{event.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatTimeLabel(event.startsAt, event.isAllDay)} - {formatTimeLabel(event.endsAt, event.isAllDay)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${COLOR_STYLES[event.colorToken] ?? COLOR_STYLES.indigo}`}>
                        {event.colorToken}
                      </span>
                    </div>
                    {event.location ? <p className="mt-3 text-sm text-slate-500">{event.location}</p> : null}
                    {event.description ? <p className="mt-2 text-sm leading-6 text-slate-500">{event.description}</p> : null}
                  </button>
                ))
              )}
            </div>
          </section>

          {errorMessage ? (
            <section className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
              {errorMessage}
            </section>
          ) : null}
        </aside>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Calendar Event</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{editingEventId ? "일정 수정" : "새 일정 추가"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="일정 편집 닫기"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M4.22 4.22a.75.75 0 011.06 0L10 8.94l4.72-4.72a.75.75 0 111.06 1.06L11.06 10l4.72 4.72a.75.75 0 11-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 01-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 010-1.06z" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Title</label>
                <input
                  value={formState.title}
                  onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-300"
                  placeholder="예: 팀 미팅"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Date</label>
                  <input
                    type="date"
                    value={formState.date}
                    onChange={(event) => setFormState((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-300"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={formState.isAllDay}
                    onChange={(event) => setFormState((current) => ({ ...current, isAllDay: event.target.checked }))}
                  />
                  종일 일정
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Start</label>
                  <input
                    type="time"
                    value={formState.startsAt}
                    disabled={formState.isAllDay}
                    onChange={(event) => setFormState((current) => ({ ...current, startsAt: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-300 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">End</label>
                  <input
                    type="time"
                    value={formState.endsAt}
                    disabled={formState.isAllDay}
                    onChange={(event) => setFormState((current) => ({ ...current, endsAt: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-300 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Location</label>
                <input
                  value={formState.location}
                  onChange={(event) => setFormState((current) => ({ ...current, location: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-300"
                  placeholder="예: 중앙도서관 3층"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Description</label>
                <textarea
                  value={formState.description}
                  onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-indigo-300"
                  placeholder="일정 메모를 남겨두세요."
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((colorToken) => (
                    <button
                      key={colorToken}
                      type="button"
                      onClick={() => setFormState((current) => ({ ...current, colorToken }))}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold ${COLOR_STYLES[colorToken]} ${
                        formState.colorToken === colorToken ? "ring-2 ring-slate-900/10" : ""
                      }`}
                    >
                      {colorToken}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <div>
                {editingEventId ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteEvent();
                    }}
                    className="rounded-full px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    일정 삭제
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveEvent();
                  }}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  {editingEventId ? "일정 저장" : "일정 만들기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
