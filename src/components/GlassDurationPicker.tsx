"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface GlassDurationPickerProps {
  valueSec: number;
  onChange: (sec: number) => void;
  className?: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

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

  const padCount = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <div className="relative flex-1" style={{ height: WHEEL_HEIGHT }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-zinc-900/95 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-900/95 to-transparent z-10" />
      <div
        className="pointer-events-none absolute inset-x-1 z-10 rounded-lg bg-white/[0.08] border-y border-white/[0.1]"
        style={{ top: padCount * ITEM_HEIGHT, height: ITEM_HEIGHT }}
      />
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
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-bot-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </div>
    </div>
  );
}

const MINUTES = Array.from({ length: 11 }, (_, i) => ({ value: i, label: `${i} min` }));
const SECONDS = Array.from({ length: 60 }, (_, i) => ({ value: i, label: `${i.toString().padStart(2, "0")} sec` }));

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export default function GlassDurationPicker({
  valueSec,
  onChange,
  className = "",
}: GlassDurationPickerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const [selMin, setSelMin] = useState(Math.floor(valueSec / 60));
  const [selSec, setSelSec] = useState(valueSec % 60);

  useEffect(() => {
    setSelMin(Math.floor(valueSec / 60));
    setSelSec(valueSec % 60);
  }, [valueSec]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const pickerWidth = Math.min(280, window.innerWidth - 24);
    const centeredLeft = rect.left + rect.width / 2 - pickerWidth / 2;
    const clampedLeft = Math.min(window.innerWidth - pickerWidth - 12, Math.max(12, centeredLeft));
    setPos({
      top: rect.bottom + 6,
      left: clampedLeft,
      width: pickerWidth,
    });
  }, []);

  function handleOpen() {
    if (!open) updatePosition();
    setOpen(!open);
  }

  function handleDone() {
    const total = selMin * 60 + selSec;
    onChange(Math.max(10, Math.min(600, total)));
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || pickerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

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

  const minIndex = Math.max(0, Math.min(selMin, MINUTES.length - 1));
  const secIndex = Math.max(0, Math.min(selSec, SECONDS.length - 1));

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-xl bg-white/60 dark:bg-white/[0.08] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.10] px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 transition-all active:scale-[0.98]"
      >
        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        {formatDuration(valueSec)}
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
            <div className="flex px-4 pt-3 pb-1">
              <span className="flex-1 text-center text-xs font-medium text-slate-400">Minutes</span>
              <span className="flex-1 text-center text-xs font-medium text-slate-400">Seconds</span>
            </div>
            <div className="flex px-2 gap-1">
              <WheelColumn
                items={MINUTES}
                selectedIndex={minIndex}
                onSelect={(i) => setSelMin(i)}
              />
              <WheelColumn
                items={SECONDS}
                selectedIndex={secIndex}
                onSelect={(i) => setSelSec(i)}
              />
            </div>
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
