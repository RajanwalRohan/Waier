"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface GlassDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  max?: string; // YYYY-MM-DD
  min?: string; // YYYY-MM-DD
  required?: boolean;
  className?: string;
  placeholder?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function parseDate(str: string) {
  if (!str) {
    const now = new Date();
    return { year: now.getFullYear() - 20, month: 1, day: 1 };
  }
  const [y, m, d] = str.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
}: {
  items: { value: number; label: string }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to selected index on mount and when it changes externally
  useEffect(() => {
    if (containerRef.current && !isScrolling.current) {
      containerRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, [selectedIndex]);

  function handleScroll() {
    if (!containerRef.current) return;
    isScrolling.current = true;
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const index = Math.round(containerRef.current.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      containerRef.current.scrollTop = clamped * ITEM_HEIGHT;
      isScrolling.current = false;
      if (clamped !== selectedIndex) {
        onSelect(clamped);
      }
    }, 80);
  }

  // Padding items so the first/last can be centered
  const padCount = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <div className="relative flex-1" style={{ height: WHEEL_HEIGHT }}>
      {/* Fade masks */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-zinc-900/95 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-900/95 to-transparent z-10" />
      {/* Center highlight */}
      <div
        className="pointer-events-none absolute inset-x-1 z-10 rounded-lg bg-white/[0.08] border-y border-white/[0.1]"
        style={{ top: padCount * ITEM_HEIGHT, height: ITEM_HEIGHT }}
      />
      {/* Scrollable list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-none"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Top padding */}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-top-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <div
              key={item.value}
              onClick={() => {
                onSelect(i);
                if (containerRef.current) {
                  containerRef.current.scrollTo({ top: i * ITEM_HEIGHT, behavior: "smooth" });
                }
              }}
              className={`flex items-center justify-center cursor-pointer transition-all ${
                isSelected
                  ? "text-white font-semibold text-base"
                  : "text-slate-400 text-sm"
              }`}
              style={{ height: ITEM_HEIGHT }}
            >
              {item.label}
            </div>
          );
        })}
        {/* Bottom padding */}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-bot-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </div>
    </div>
  );
}

export default function GlassDatePicker({
  value,
  onChange,
  max,
  min,
  required,
  className = "",
  placeholder = "Select date",
}: GlassDatePickerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const parsed = parseDate(value);
  const [selYear, setSelYear] = useState(parsed.year);
  const [selMonth, setSelMonth] = useState(parsed.month);
  const [selDay, setSelDay] = useState(parsed.day);

  // Sync internal state when value prop changes
  useEffect(() => {
    if (value) {
      const p = parseDate(value);
      setSelYear(p.year);
      setSelMonth(p.month);
      setSelDay(p.day);
    }
  }, [value]);

  const maxDate = max ? parseDate(max) : { year: new Date().getFullYear(), month: 12, day: 31 };
  const minDate = min ? parseDate(min) : { year: 1920, month: 1, day: 1 };

  // Build year list (descending for DOB)
  const years: { value: number; label: string }[] = [];
  for (let y = maxDate.year; y >= minDate.year; y--) {
    years.push({ value: y, label: y.toString() });
  }

  const months = MONTHS.map((m, i) => ({ value: i + 1, label: m }));

  const maxDay = daysInMonth(selMonth, selYear);
  const days = Array.from({ length: maxDay }, (_, i) => ({
    value: i + 1,
    label: (i + 1).toString(),
  }));

  // Clamp day if month/year changed
  const clampedDay = Math.min(selDay, maxDay);

  const yearIndex = years.findIndex((y) => y.value === selYear);
  const monthIndex = selMonth - 1;
  const dayIndex = clampedDay - 1;

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const pickerWidth = Math.min(340, window.innerWidth - 24);
    setPos({
      top: rect.bottom + 6,
      left: Math.max(12, rect.left + rect.width / 2 - pickerWidth / 2),
      width: pickerWidth,
    });
  }, []);

  function handleOpen() {
    if (!open) {
      // If no value set, default to a reasonable DOB
      if (!value) {
        const now = new Date();
        setSelYear(now.getFullYear() - 20);
        setSelMonth(1);
        setSelDay(1);
      }
      updatePosition();
    }
    setOpen(!open);
  }

  function handleDone() {
    const day = Math.min(selDay, daysInMonth(selMonth, selYear));
    onChange(`${selYear}-${pad(selMonth)}-${pad(day)}`);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        pickerRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape, reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // Display label
  const displayLabel = value
    ? `${MONTHS[parseDate(value).month - 1]} ${parseDate(value).day}, ${parseDate(value).year}`
    : null;

  return (
    <div className={className}>
      {required && (
        <input
          type="date"
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden
        />
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-between rounded-xl bg-white/60 dark:bg-white/[0.08] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.10] px-4 py-2.5 text-sm text-left transition-all focus:bg-white/80 dark:focus:bg-white/[0.12] focus:border-accent-300 dark:focus:border-accent-500/50 focus:outline-none focus:ring-2 focus:ring-accent-400/20"
      >
        <span className={displayLabel ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}>
          {displayLabel || placeholder}
        </span>
        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed rounded-2xl bg-zinc-900/92 backdrop-blur-3xl backdrop-saturate-150 border border-white/[0.15] shadow-glass-lg dark:shadow-glass-dark overflow-hidden animate-dropdown"
            style={{
              zIndex: 99999,
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
          >
            {/* Column headers */}
            <div className="flex px-4 pt-3 pb-1">
              <span className="flex-1 text-center text-xs font-medium text-slate-400">Month</span>
              <span className="flex-1 text-center text-xs font-medium text-slate-400">Day</span>
              <span className="flex-1 text-center text-xs font-medium text-slate-400">Year</span>
            </div>

            {/* Scroll wheels */}
            <div className="flex px-2 gap-1">
              <WheelColumn
                items={months}
                selectedIndex={monthIndex}
                onSelect={(i) => setSelMonth(i + 1)}
              />
              <WheelColumn
                items={days}
                selectedIndex={dayIndex >= 0 ? dayIndex : 0}
                onSelect={(i) => setSelDay(i + 1)}
              />
              <WheelColumn
                items={years}
                selectedIndex={yearIndex >= 0 ? yearIndex : 0}
                onSelect={(i) => setSelYear(years[i].value)}
              />
            </div>

            {/* Done button */}
            <div className="flex justify-end px-4 py-3">
              <button
                type="button"
                onClick={handleDone}
                className="rounded-xl bg-accent-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 hover:bg-accent-600 transition-all active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
