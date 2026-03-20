"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Draft } from "@/lib/types/database";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Trash2,
  Loader2,
  Star,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Brain,
  Calendar as CalIcon,
  Send,
  Play,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";

const DAYS_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_COLORS: Record<string, string> = {
  draft: "border-l-slate-400 bg-slate-50",
  scheduled: "border-l-amber-400 bg-amber-50",
  published: "border-l-emerald-400 bg-emerald-50",
  failed: "border-l-red-400 bg-red-50",
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-slate-400",
  scheduled: "bg-amber-400",
  published: "bg-emerald-400",
  failed: "bg-red-400",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  text: FileText,
  image: ImageIcon,
  carousel: LayoutGrid,
};

interface CalendarViewProps {
  drafts: Draft[];
  suggestedTimes: { day: string; time: string }[];
}

export default function CalendarView({
  drafts: initialDrafts,
  suggestedTimes,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [drafts, setDrafts] = useState(initialDrafts);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [panelContent, setPanelContent] = useState("");
  const [panelStatus, setPanelStatus] = useState<"draft" | "scheduled">("draft");
  const [panelDate, setPanelDate] = useState("");
  const [panelTime, setPanelTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [runningCron, setRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const router = useRouter();

  // Auto-dismiss toast
  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Map drafts to their dates
  const draftsByDate = useMemo(() => {
    const map = new Map<string, Draft[]>();
    for (const d of drafts) {
      const dateKey = d.scheduled_at
        ? format(parseISO(d.scheduled_at), "yyyy-MM-dd")
        : d.published_at
          ? format(parseISO(d.published_at), "yyyy-MM-dd")
          : format(parseISO(d.created_at), "yyyy-MM-dd");
      const arr = map.get(dateKey) || [];
      arr.push(d);
      map.set(dateKey, arr);
    }
    return map;
  }, [drafts]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      const days: Date[] = [];
      let day = calStart;
      while (day <= calEnd) {
        days.push(day);
        day = addDays(day, 1);
      }
      return days;
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
  }, [currentDate, view]);

  // Navigation
  const goNext = () =>
    setCurrentDate(view === "month" ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  const goPrev = () =>
    setCurrentDate(view === "month" ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));

  // Open slide-out panel
  const openPanel = useCallback((draft: Draft) => {
    setSelectedDraft(draft);
    setPanelContent(draft.content);
    setPanelStatus(
      draft.status === "draft" || draft.status === "scheduled"
        ? draft.status
        : "draft"
    );
    if (draft.scheduled_at) {
      const dt = parseISO(draft.scheduled_at);
      setPanelDate(format(dt, "yyyy-MM-dd"));
      setPanelTime(format(dt, "HH:mm"));
    } else {
      setPanelDate("");
      setPanelTime("09:00");
    }
  }, []);

  const closePanel = () => setSelectedDraft(null);

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    if (selectedDraft) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedDraft]);

  // Save from panel
  const handlePanelSave = async () => {
    if (!selectedDraft) return;
    setSaving(true);

    const scheduled_at =
      panelStatus === "scheduled" && panelDate
        ? new Date(`${panelDate}T${panelTime}`).toISOString()
        : null;

    try {
      const res = await fetch("/api/posts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_id: selectedDraft.id,
          content: panelContent,
          status: panelStatus,
          scheduled_at,
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setDrafts((prev) =>
          prev.map((d) => (d.id === selectedDraft.id ? data.draft : d))
        );
        closePanel();
        router.refresh();
        showToast("success", "Post updated");
      } else {
        showToast("error", data.error || "Failed to save changes");
      }
    } catch {
      showToast("error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Delete from panel
  const handlePanelDelete = async () => {
    if (!selectedDraft || !confirm("Delete this post? This can't be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/posts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_id: selectedDraft.id, delete: true }),
      });
      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== selectedDraft.id));
        closePanel();
        router.refresh();
        showToast("success", "Post deleted");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed to delete");
      }
    } catch {
      showToast("error", "Failed to delete. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Publish from panel
  const handlePanelPublish = async () => {
    if (!selectedDraft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_id: selectedDraft.id,
          content: panelContent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === selectedDraft.id
              ? { ...d, status: "published", published_at: new Date().toISOString() }
              : d
          )
        );
        closePanel();
        router.refresh();
        showToast("success", "Published to LinkedIn!");
      } else {
        showToast("error", data.error || "Failed to publish");
      }
    } catch {
      showToast("error", "Failed to publish. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop
  const handleDragStart = (draftId: string, status: string) => {
    if (status === "published") return; // can't drag published
    setDragId(draftId);
  };

  const handleDrop = async (targetDate: Date) => {
    if (!dragId) return;
    const draft = drafts.find((d) => d.id === dragId);
    if (!draft || draft.status === "published") return;

    const oldTime = draft.scheduled_at
      ? format(parseISO(draft.scheduled_at), "HH:mm")
      : "09:00";
    const newScheduled = new Date(
      `${format(targetDate, "yyyy-MM-dd")}T${oldTime}`
    ).toISOString();

    // Optimistic update
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === dragId
          ? { ...d, scheduled_at: newScheduled, status: "scheduled" as const }
          : d
      )
    );
    setDragId(null);

    await fetch("/api/posts/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft_id: dragId,
        status: "scheduled",
        scheduled_at: newScheduled,
      }),
    });
    router.refresh();
  };

  // Dev: manually trigger cron job
  const handleRunCron = async () => {
    setRunningCron(true);
    setCronResult(null);
    try {
      const res = await fetch("/api/cron/publish-scheduled", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCronResult(`Done: ${data.published} published, ${data.failed} failed (${data.total} total)`);
        router.refresh();
      } else {
        setCronResult(`Error: ${data.error || "Unknown error"}`);
      }
    } catch {
      setCronResult("Error: Failed to reach cron endpoint");
    } finally {
      setRunningCron(false);
    }
  };

  const headerLabel =
    view === "month"
      ? format(currentDate, "MMMM yyyy")
      : `${format(calendarDays[0], "MMM d")} – ${format(calendarDays[6], "MMM d, yyyy")}`;

  const isEmpty = drafts.length === 0;

  return (
    <div className="relative">
      {/* Empty state */}
      {isEmpty && (
        <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-20 shadow-sm">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50">
            <CalIcon className="h-10 w-10 text-indigo-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Your calendar is empty
          </h2>
          <p className="mb-6 max-w-md text-center text-sm text-slate-500">
            Create your first post or generate ideas from Brand Brain
          </p>
          <div className="flex gap-3">
            <Link
              href="/create-post"
              className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
            >
              Create Post
            </Link>
            <Link
              href="/brand-brain"
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-50"
            >
              <Brain className="h-4 w-4" />
              View Brand Brain
            </Link>
          </div>
        </div>
      )}

      {/* Calendar */}
      {!isEmpty && (
        <div className="animate-fade-in-up rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={goPrev}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-600"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="min-w-[180px] text-center text-lg font-semibold text-slate-900">
                {headerLabel}
              </h2>
              <button
                onClick={goNext}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-600"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {/* Dev Only: Run Scheduled Posts */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRunCron}
                  disabled={runningCron}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                >
                  {runningCron ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Run Scheduled Posts
                </button>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                  Dev Only
                </span>
              </div>

              <div className="flex gap-1 rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setView("month")}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    view === "month"
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-500 hover:bg-gray-50"
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setView("week")}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    view === "week"
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-500 hover:bg-gray-50"
                  }`}
                >
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* Cron result banner */}
          {cronResult && (
            <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
              cronResult.startsWith("Error")
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}>
              {cronResult.startsWith("Error") ? (
                <AlertCircle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              {cronResult}
              <button
                onClick={() => setCronResult(null)}
                className="ml-auto text-xs opacity-60 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS_HEADER.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayDrafts = draftsByDate.get(dateKey) || [];
              const inCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const maxVisible = view === "month" ? 2 : 4;

              return (
                <div
                  key={dateKey}
                  className={`border-b border-r border-gray-50 p-1.5 transition-colors ${
                    view === "month" ? "min-h-[100px]" : "min-h-[180px]"
                  } ${!inCurrentMonth && view === "month" ? "bg-gray-50/50" : ""} ${
                    dragId ? "hover:bg-indigo-50/50" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(day);
                  }}
                >
                  <span
                    className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      today
                        ? "bg-indigo-500 text-white"
                        : inCurrentMonth || view === "week"
                          ? "text-slate-600"
                          : "text-slate-300"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  <div className="space-y-1">
                    {dayDrafts.slice(0, maxVisible).map((draft) => {
                      const TypeIcon = TYPE_ICON[draft.post_type] || FileText;
                      return (
                        <div
                          key={draft.id}
                          draggable={draft.status !== "published"}
                          onDragStart={() =>
                            handleDragStart(draft.id, draft.status)
                          }
                          onClick={() => openPanel(draft)}
                          className={`cursor-pointer rounded border-l-2 px-1.5 py-1 text-[11px] leading-tight transition-shadow hover:shadow-sm ${
                            STATUS_COLORS[draft.status] || STATUS_COLORS.draft
                          } ${draft.status !== "published" ? "cursor-grab active:cursor-grabbing" : ""}`}
                        >
                          <div className="flex items-center gap-1">
                            <TypeIcon className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate font-medium text-slate-700">
                              {draft.content.slice(0, view === "month" ? 30 : 60)}
                              {draft.content.length > (view === "month" ? 30 : 60) ? "..." : ""}
                            </span>
                          </div>
                          {draft.scheduled_at && (
                            <span className="text-[10px] text-slate-400">
                              {format(parseISO(draft.scheduled_at), "h:mm a")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {dayDrafts.length > maxVisible && (
                      <button
                        onClick={() => openPanel(dayDrafts[maxVisible])}
                        className="w-full rounded px-1.5 py-0.5 text-center text-[10px] font-medium text-indigo-500 hover:bg-indigo-50"
                      >
                        +{dayDrafts.length - maxVisible} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT.draft}`} />
              Draft
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT.scheduled}`} />
              Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT.published}`} />
              Published
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT.failed}`} />
              Failed
            </span>
            <span className="ml-auto text-slate-300">
              Drag drafts to reschedule
            </span>
          </div>
        </div>
      )}

      {/* ─── SLIDE-OUT EDIT PANEL ─── */}
      {selectedDraft && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-slate-900">Edit Post</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    selectedDraft.status === "published"
                      ? "bg-emerald-50 text-emerald-700"
                      : selectedDraft.status === "scheduled"
                        ? "bg-blue-50 text-blue-700"
                        : selectedDraft.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {selectedDraft.status.charAt(0).toUpperCase() + selectedDraft.status.slice(1)}
                </span>
              </div>
              <button
                onClick={closePanel}
                className="rounded-lg p-1 text-slate-400 hover:bg-gray-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {/* Content */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Post Content
                </label>
                <textarea
                  value={panelContent}
                  onChange={(e) => setPanelContent(e.target.value)}
                  rows={8}
                  className="min-h-[200px] w-full resize-y rounded-lg border border-gray-200 p-3 text-sm leading-relaxed text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-slate-500"
                  disabled={selectedDraft.status === "published"}
                />
              </div>

              {/* Status */}
              {selectedDraft.status !== "published" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPanelStatus("draft")}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        panelStatus === "draft"
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-slate-600 hover:bg-gray-50"
                      }`}
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => setPanelStatus("scheduled")}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        panelStatus === "scheduled"
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-slate-600 hover:bg-gray-50"
                      }`}
                    >
                      Scheduled
                    </button>
                  </div>
                </div>
              )}

              {/* Date/time picker for scheduled */}
              {panelStatus === "scheduled" &&
                selectedDraft.status !== "published" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        Date
                      </label>
                      <input
                        type="date"
                        value={panelDate}
                        onChange={(e) => setPanelDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">
                        Time
                      </label>
                      <input
                        type="time"
                        value={panelTime}
                        onChange={(e) => setPanelTime(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

              {/* Suggested times */}
              {panelStatus === "scheduled" && suggestedTimes.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Suggested times (from Brand Brain)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTimes.map((st, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setPanelTime(
                            convertTo24h(st.time)
                          );
                        }}
                        className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        {st.day} {st.time}
                        {i === 0 && (
                          <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini LinkedIn preview */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Preview
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">
                    {panelContent.slice(0, 200)}
                    {panelContent.length > 200 ? "..." : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Panel footer */}
            <div className="border-t border-gray-100 p-4">
              {selectedDraft.status === "published" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePanelDelete}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-500 transition-colors hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  <span className="ml-auto text-sm text-slate-400">
                    Published posts cannot be edited
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handlePanelDelete}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-500 transition-colors hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  <button
                    onClick={handlePanelSave}
                    disabled={saving || !panelContent.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </button>
                  {selectedDraft.status === "draft" && (
                    <button
                      onClick={handlePanelPublish}
                      disabled={saving || !panelContent.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      Publish Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}

/** Convert "9:00 AM" → "09:00" for input[type=time] */
function convertTo24h(timeStr: string): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "09:00";
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}
