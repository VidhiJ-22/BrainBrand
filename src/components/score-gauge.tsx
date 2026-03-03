"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#6366f1"; // indigo
  if (score >= 60) return "#22c55e"; // green
  if (score >= 30) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

function getScoreGradientId(score: number): string {
  if (score >= 80) return "gauge-indigo";
  if (score >= 60) return "gauge-green";
  if (score >= 30) return "gauge-amber";
  return "gauge-red";
}

export default function ScoreGauge({
  score,
  size = 160,
  strokeWidth = 12,
}: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;

  useEffect(() => {
    let frame: number;
    const duration = 1200;
    const start = performance.now();

    function animate(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(Math.round(eased * score));
      if (t < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const color = getScoreColor(animatedScore);
  const gradientId = getScoreGradientId(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gauge-indigo" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="gauge-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="gauge-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="gauge-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-bold"
          style={{ color }}
        >
          {animatedScore}
        </span>
        <span className="text-xs font-medium text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

// Mini horizontal bar for breakdown scores
export function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const color = getScoreColor(score);

  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-slate-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${animated}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="w-10 text-right text-sm font-semibold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
