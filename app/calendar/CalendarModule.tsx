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
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">{formatMonthTitle(currentMonth)}</h2>
              <p className="text-sm font-medium text-slate-500">날짜를 눌러 일정을 추가하거나 관리하세요.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border border-slate-200 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100"
                >
                  이전
                </button>
                <div className="h-4 w-px bg-slate-200"></div>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date())}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100"
                >
                  오늘
                </button>
                <div className="h-4 w-px bg-slate-200"></div>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100"
                >
                  다음
                </button>
              </div>
              <button
                type="button"
                onClick={() => openCreateModal(new Date())}
                className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-300 active:scale-95"
              >
                + 새 일정
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-7 gap-3 text-center text-sm font-bold uppercase tracking-wider text-slate-400">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-7 gap-3">
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
                  className={`group min-h-[150px] flex flex-col rounded-2xl border p-3 text-left transition-all duration-200 ${
                    selectedDateKey === dateKey
                      ? "border-indigo-300 bg-indigo-50/50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50 hover:shadow-sm"
                  } ${!isCurrentMonth ? "opacity-40" : ""}`}
                >
                  <div className="flex w-full items-start justify-between">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-slate-700 group-hover:text-indigo-600"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 ? (
                      <span className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex w-full flex-col gap-1.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setSelectedDateKey(dateKey);
                          openEditModal(event);
                        }}
                        className={`w-full rounded-lg border px-2.5 py-1.5 text-xs transition-transform hover:scale-[1.02] ${COLOR_STYLES[event.colorToken] ?? COLOR_STYLES.indigo}`}
                      >
                        <p className="truncate font-bold">{event.title}</p>
                      </div>
                    ))}
                    {dayEvents.length > 3 ? (
                      <p className="px-1 text-xs font-bold text-slate-400">+{dayEvents.length - 3} 더보기</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-6 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-6 text-center">
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                {new Intl.DateTimeFormat("ko-KR", {
                  month: "long",
                  day: "numeric",
                }).format(parseDateKey(selectedDateKey))}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {new Intl.DateTimeFormat("ko-KR", {
                  weekday: "long",
                }).format(parseDateKey(selectedDateKey))}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold text-slate-900">일정 목록</h3>
                <button
                  type="button"
                  onClick={() => openCreateModal(parseDateKey(selectedDateKey))}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  + 추가
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {isCalendarLoading ? (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-sm font-medium text-slate-400">
                    불러오는 중...
                  </div>
                ) : selectedEvents.length === 0 ? (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-10 text-sm font-medium text-slate-400">
                    등록된 일정이 없습니다
                  </div>
                ) : (
                  selectedEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEditModal(event)}
                      className="group flex w-full flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="flex w-full items-start justify-between gap-3">
                        <div className="flex flex-col">
                          <p className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{event.title}</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            {formatTimeLabel(event.startsAt, event.isAllDay)} - {formatTimeLabel(event.endsAt, event.isAllDay)}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${COLOR_STYLES[event.colorToken] ?? COLOR_STYLES.indigo}`}>
                          {event.colorToken}
                        </span>
                      </div>
                      {event.description ? (
                        <p className="line-clamp-2 text-sm leading-6 text-slate-500">{event.description}</p>
                      ) : null}
                      {event.location ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{event.location}</span>
                        </div>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          {errorMessage && !isModalOpen ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 shadow-sm">
              {errorMessage}
            </section>
          ) : null}
        </aside>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">{editingEventId ? "일정 수정" : "새 일정 추가"}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="일정 편집 닫기"
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
                    placeholder="일정 제목을 입력하세요"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">날짜</label>
                    <input
                      type="date"
                      value={formState.date}
                      onChange={(event) => setFormState((current) => ({ ...current, date: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div className="flex items-end pb-1">
                    <label className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={formState.isAllDay}
                        onChange={(event) => setFormState((current) => ({ ...current, isAllDay: event.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      하루 종일
                    </label>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">시작 시간</label>
                    <input
                      type="time"
                      value={formState.startsAt}
                      disabled={formState.isAllDay}
                      onChange={(event) => setFormState((current) => ({ ...current, startsAt: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500">종료 시간</label>
                    <input
                      type="time"
                      value={formState.endsAt}
                      disabled={formState.isAllDay}
                      onChange={(event) => setFormState((current) => ({ ...current, endsAt: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500">장소</label>
                  <input
                    value={formState.location}
                    onChange={(event) => setFormState((current) => ({ ...current, location: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="장소를 입력하세요"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500">메모</label>
                  <textarea
                    value={formState.description}
                    onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="추가적인 내용을 적어주세요"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-500">색상 지정</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((colorToken) => (
                      <button
                        key={colorToken}
                        type="button"
                        onClick={() => setFormState((current) => ({ ...current, colorToken }))}
                        className={`rounded-lg border px-4 py-2 text-xs font-bold capitalize transition-all ${COLOR_STYLES[colorToken]} ${
                          formState.colorToken === colorToken ? "scale-105 shadow-md ring-2 ring-slate-400 ring-offset-1" : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        {colorToken}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                {editingEventId ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteEvent();
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
                    void handleSaveEvent();
                  }}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-95"
                >
                  {editingEventId ? "저장하기" : "만들기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
