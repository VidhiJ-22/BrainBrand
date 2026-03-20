"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Lightbulb,
  Hash,
  Clock,
  ImageIcon,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { analyzePost, type PostScore } from "@/lib/scoring/analyze-post";

interface Props {
  postText: string;
  hashtagSuggestions: string[];
  onAddHashtag: (hashtag: string) => void;
  onRemoveHashtag: (hashtag: string) => void;
  onSchedule?: (date: string, time: string) => void;
  hasStoryContext?: boolean;
}

const GRADE_CONFIG = {
  excellent: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "stroke-emerald-500",
    label: "Excellent. Ready to publish.",
  },
  good: {
    color: "text-blue-600",
    bg: "bg-blue-50",
    ring: "stroke-blue-500",
    label: "Good. A few tweaks could help.",
  },
  fair: {
    color: "text-amber-600",
    bg: "bg-amber-50",
    ring: "stroke-amber-500",
    label: "Fair. Review suggestions.",
  },
  "needs-work": {
    color: "text-red-600",
    bg: "bg-red-50",
    ring: "stroke-red-500",
    label: "Needs work. Follow the tips.",
  },
};

export default function PostAnalysisPanel({
  postText,
  hashtagSuggestions,
  onAddHashtag,
  onRemoveHashtag,
  onSchedule,
  hasStoryContext,
}: Props) {
  const [score, setScore] = useState<PostScore | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounced scoring
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (postText.trim().length >= 50) {
        setScore(analyzePost(postText, { hasStoryContext }));
      } else {
        setScore(null);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [postText, hasStoryContext]);

  // Animate score number
  useEffect(() => {
    if (!score) {
      setDisplayScore(0);
      return;
    }
    const target = score.totalScore;
    const step = target > displayScore ? 1 : -1;
    if (displayScore === target) return;
    const interval = setInterval(() => {
      setDisplayScore((prev) => {
        const next = prev + step;
        if ((step > 0 && next >= target) || (step < 0 && next <= target)) {
          clearInterval(interval);
          return target;
        }
        return next;
      });
    }, 15);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score?.totalScore]);

  // Track which hashtags are in the post
  const activeHashtags = useMemo(() => {
    const lower = postText.toLowerCase();
    return hashtagSuggestions.filter((h) => lower.includes(h.toLowerCase()));
  }, [postText, hashtagSuggestions]);

  const handleHashtagClick = useCallback(
    (hashtag: string) => {
      if (activeHashtags.some((h) => h.toLowerCase() === hashtag.toLowerCase())) {
        onRemoveHashtag(hashtag);
      } else {
        onAddHashtag(hashtag);
      }
    },
    [activeHashtags, onAddHashtag, onRemoveHashtag]
  );

  if (!score) return null;

  const config = GRADE_CONFIG[score.grade];
  const mainChecks = score.checks.filter((c) => !c.bonus);
  const bonusChecks = score.checks.filter((c) => c.bonus);

  // SVG circle progress
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 100) * circumference;

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-5">
      {/* Section 1: Score Badge */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <svg className="-rotate-90" width="96" height="96" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              className={config.ring}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
            />
          </svg>
          <span className={`absolute text-2xl font-bold ${config.color}`}>
            {displayScore}
          </span>
        </div>
        <div>
          <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
          <p className="mt-0.5 text-xs text-slate-400">out of 100</p>
        </div>
      </div>

      {/* Too short message */}
      {score.tooShort && (
        <p className="text-xs text-slate-500">
          Keep writing or click Generate Post to see your full score.
        </p>
      )}

      {/* Section 2: Checklist */}
      <div className="space-y-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Quality checks
        </p>
        {mainChecks.map((check) => (
          <CheckRow
            key={check.id}
            check={check}
            expanded={expandedCheck === check.id}
            onToggle={() =>
              setExpandedCheck(expandedCheck === check.id ? null : check.id)
            }
          />
        ))}
        <div className="my-2 border-t border-gray-200" />
        <p className="mb-1 text-xs text-slate-400">Bonus</p>
        {bonusChecks.map((check) => (
          <CheckRow
            key={check.id}
            check={check}
            expanded={expandedCheck === check.id}
            onToggle={() =>
              setExpandedCheck(expandedCheck === check.id ? null : check.id)
            }
            small
          />
        ))}
      </div>

      {/* Section 3: Hashtag Suggestions */}
      {hashtagSuggestions.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Suggested hashtags
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hashtagSuggestions.map((tag) => {
              const isActive = activeHashtags.some(
                (h) => h.toLowerCase() === tag.toLowerCase()
              );
              return (
                <button
                  key={tag}
                  onClick={() => handleHashtagClick(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-500 text-white"
                      : "border border-gray-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Click to add to your post</p>
        </div>
      )}

      {/* Section 4: Best Time to Post */}
      <BestTimeToPost onSchedule={onSchedule} />

      {/* Section 5: Boost This Post */}
      <BoostTips postText={postText} />

      {/* Section 6: Algorithm Tip */}
      <div className="flex gap-2 rounded-lg bg-indigo-50 px-3 py-2.5">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        <p className="text-xs leading-relaxed text-indigo-700">{score.topTip}</p>
      </div>
    </div>
  );
}

function CheckRow({
  check,
  expanded,
  onToggle,
  small,
}: {
  check: PostScore["checks"][number];
  expanded: boolean;
  onToggle: () => void;
  small?: boolean;
}) {
  if (check.pending) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
        <div className={`shrink-0 rounded-full bg-gray-200 ${small ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
        <span className={`flex-1 italic text-slate-400 ${small ? "text-xs" : "text-sm"}`}>
          {check.label}
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={!check.passed ? onToggle : undefined}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
          !check.passed ? "cursor-pointer hover:bg-gray-100" : "cursor-default"
        }`}
      >
        {check.passed ? (
          <CheckCircle2
            className={`shrink-0 text-emerald-500 ${small ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          />
        ) : (
          <AlertTriangle
            className={`shrink-0 text-amber-500 ${small ? "h-3.5 w-3.5" : "h-4 w-4"}`}
          />
        )}
        <span
          className={`flex-1 ${small ? "text-xs" : "text-sm"} ${
            check.passed ? "text-slate-600" : "text-slate-700"
          }`}
        >
          {check.label}
        </span>
        {!check.passed && (
          <span className="text-xs text-amber-600">
            +{check.maxPoints - check.points}pts
          </span>
        )}
        {!check.passed && (
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        )}
      </button>
      {expanded && !check.passed && (
        <p className="ml-8 pb-1.5 text-xs leading-relaxed text-slate-500">
          {check.tip}
        </p>
      )}
    </div>
  );
}

function getPostingWindow(): {
  dot: string;
  text: string;
  textColor: string;
  isPeak: boolean;
  isOffPeak: boolean;
  dayLabel: string;
  timeLabel: string;
} {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const hour = now.getHours();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayLabel = dayNames[day];
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const min = now.getMinutes().toString().padStart(2, "0");
  const timeLabel = `${h}:${min} ${ampm}`;

  const isTueWedThu = day >= 2 && day <= 4;
  const isMonFri = day === 1 || day === 5;
  const isWeekend = day === 0 || day === 6;

  if (isTueWedThu && hour >= 8 && hour < 10) {
    return { dot: "bg-emerald-500", text: "Peak posting window. Publish now for maximum reach.", textColor: "text-emerald-700", isPeak: true, isOffPeak: false, dayLabel, timeLabel };
  }
  if (isTueWedThu && hour >= 10 && hour < 12) {
    return { dot: "bg-emerald-500", text: "Good window. Still strong reach right now.", textColor: "text-emerald-700", isPeak: true, isOffPeak: false, dayLabel, timeLabel };
  }
  if (isMonFri && hour >= 8 && hour < 12) {
    return { dot: "bg-amber-500", text: "Monday/Friday gets moderate reach. Morning is your best bet.", textColor: "text-amber-700", isPeak: false, isOffPeak: false, dayLabel, timeLabel };
  }
  if (!isWeekend && hour >= 12 && hour < 17) {
    return { dot: "bg-amber-500", text: "Afternoon posts get moderate reach. Morning is better.", textColor: "text-amber-700", isPeak: false, isOffPeak: false, dayLabel, timeLabel };
  }
  if (isWeekend) {
    return { dot: "bg-gray-400", text: "Weekend posts get 50% less reach. Schedule for Tuesday-Thursday 8-10 AM?", textColor: "text-slate-500", isPeak: false, isOffPeak: true, dayLabel, timeLabel };
  }
  if (hour >= 22 || hour < 6) {
    return { dot: "bg-gray-400", text: "Save as draft and publish tomorrow morning.", textColor: "text-slate-500", isPeak: false, isOffPeak: true, dayLabel, timeLabel };
  }
  // Weekday evening after 5PM
  return { dot: "bg-gray-400", text: "Evening posts get less reach. Schedule for tomorrow 8-10 AM?", textColor: "text-slate-500", isPeak: false, isOffPeak: true, dayLabel, timeLabel };
}

function getNextBestTime(): { date: string; time: string } {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Find next Tue(2), Wed(3), or Thu(4) at 9:00 AM
  let daysToAdd = 0;
  const targetDays = [2, 3, 4];

  // If today is a target day and before 10AM, use today
  if (targetDays.includes(day) && hour < 10) {
    // Don't show schedule button in this case (handled in UI)
  }

  // Find the next target day
  for (let i = 1; i <= 7; i++) {
    const candidate = (day + i) % 7;
    if (targetDays.includes(candidate)) {
      daysToAdd = i;
      break;
    }
  }

  const target = new Date(now);
  target.setDate(target.getDate() + daysToAdd);
  const dateStr = target.toISOString().split("T")[0];
  return { date: dateStr, time: "09:00" };
}

function BestTimeToPost({ onSchedule }: { onSchedule?: (date: string, time: string) => void }) {
  const window = getPostingWindow();
  const nextBest = getNextBestTime();

  // Don't show schedule button if we're in a peak window
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const isTueWedThuMorning = day >= 2 && day <= 4 && hour < 10;
  const showScheduleBtn = window.isOffPeak && !isTueWedThuMorning && onSchedule;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Best Time to Post
        </p>
      </div>
      <p className="text-xs text-slate-500">
        It&apos;s {window.dayLabel}, {window.timeLabel}
      </p>
      <div className="flex items-start gap-2">
        <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${window.dot}`} />
        <p className={`text-xs leading-relaxed ${window.textColor}`}>{window.text}</p>
      </div>
      {showScheduleBtn && (
        <button
          onClick={() => onSchedule(nextBest.date, nextBest.time)}
          className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
        >
          <Calendar className="h-3 w-3" />
          Schedule for best time
        </button>
      )}
    </div>
  );
}

function BoostTips({ postText }: { postText: string }) {
  const lower = postText.toLowerCase();
  const wordCount = postText.trim().split(/\s+/).filter(Boolean).length;

  let multimediaTip: string;

  if (/\bstep\b|\btip\b|\bway\b|\bhow to\b|\bframework\b|\bprocess\b|\bguide\b|\blist\b/i.test(lower) || /^\d+[.)]/m.test(postText)) {
    multimediaTip = "Turn this into a carousel. Carousels get 2-3x more dwell time than text posts.";
  } else if (/\bi\s|\bmy\s|\bstory\b|\bremember\b|\bwhen i\b|\blearned\b|\brealized\b|\bmoment\b/i.test(lower)) {
    multimediaTip = "Add a photo of yourself. Posts with faces get 2x more engagement.";
  } else if (/\d+%|\bdata\b|\bresearch\b|\bstudy\b|\bsurvey\b|\bstat\b|\breport\b/i.test(lower)) {
    multimediaTip = "Turn those numbers into a simple chart. Data visuals get saved and shared 3x more.";
  } else if (wordCount < 120) {
    multimediaTip = "Pair this with a bold image or quote card. The visual stops the scroll.";
  } else {
    multimediaTip = "Add a relevant image. Visual posts get 2x more engagement than text-only.";
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Boost This Post
      </p>
      <div className="flex items-start gap-2">
        <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p className="text-xs leading-relaxed text-slate-600">{multimediaTip}</p>
      </div>
      <div className="flex items-start gap-2">
        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p className="text-xs leading-relaxed text-slate-600">
          Post a first comment within 5 minutes of publishing. Author comments boost algorithm distribution.
        </p>
      </div>
    </div>
  );
}
