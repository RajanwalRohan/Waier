"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface GlassHeightPickerProps {
  valueCm: number | null; // stored in cm
  onChange: (cm: number) => void;
  unitSystem: "imperial" | "metric";
  required?: boolean;
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

// Imperial: feet 1-8, inches 0-11
const FEET = Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `${i + 1} ft` }));
const INCHES = Array.from({ length: 12 }, (_, i) => ({ value: i, label: `${i} in` }));
// Metric: cm 50-300
const CMS = Array.from({ length: 251 }, (_, i) => ({ value: i + 50, label: `${i + 50} cm` }));

function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = cm * 0.393701;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  // Handle rounding to 12 inches
  if (inches >= 12) return { ft: ft + 1, inches: 0 };
  return { ft, inches };
}

function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) / 0.393701 * 10) / 10;
}

export default function GlassHeightPicker({
  valueCm,
  onChange,
  unitSystem,
  required,
  className = "",
}: GlassHeightPickerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  // Internal state
  const [selFt, setSelFt] = useState(5);
  const [selIn, setSelIn] = useState(7);
  const [selCm, setSelCm] = useState(170);

  // Sync internal state from prop
  useEffect(() => {
    if (valueCm && valueCm > 0) {
      if (unitSystem === "imperial") {
        const { ft, inches } = cmToFtIn(valueCm);
        setSelFt(Math.max(1, Math.min(8, ft)));
        setSelIn(Math.max(0, Math.min(11, inches)));
      } else {
        setSelCm(Math.max(50, Math.min(300, Math.round(valueCm))));
      }
    }
  }, [valueCm, unitSystem]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const pickerWidth = Math.min(300, window.innerWidth - 24);
    setPos({
      top: rect.bottom + 6,
      left: Math.max(12, rect.left + rect.width / 2 - pickerWidth / 2),
      width: pickerWidth,
    });
  }, []);

  function handleOpen() {
    if (!open) {
      if (!valueCm || valueCm <= 0) {
        // Default: 5'7" / 170cm
        setSelFt(5);
        setSelIn(7);
        setSelCm(170);
      }
      updatePosition();
    }
    setOpen(!open);
  }

  function handleDone() {
    if (unitSystem === "imperial") {
      onChange(ftInToCm(selFt, selIn));
    } else {
      onChange(selCm);
    }
    setOpen(false);
  }

  // Close on outside click
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
  let displayLabel: string | null = null;
  if (valueCm && valueCm > 0) {
    if (unitSystem === "imperial") {
      const { ft, inches } = cmToFtIn(valueCm);
      displayLabel = `${ft}'${inches}"`;
    } else {
      displayLabel = `${Math.round(valueCm)} cm`;
    }
  }

  const feetIndex = selFt - 1; // FEET array starts at value 1
  const inchIndex = selIn;     // INCHES array starts at value 0
  const cmIndex = selCm - 50;  // CMS array starts at value 50

  return (
    <div className={className}>
      {required && (
        <input
          type="number"
          required
          value={valueCm ?? ""}
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
          {displayLabel || "Select height"}
        </span>
        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M2 12l4-4v8l-4-4M22 12l-4-4v8l4-4" />
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
            {unitSystem === "imperial" ? (
              <>
                <div className="flex px-4 pt-3 pb-1">
                  <span className="flex-1 text-center text-xs font-medium text-slate-400">Feet</span>
                  <span className="flex-1 text-center text-xs font-medium text-slate-400">Inches</span>
                </div>
                <div className="flex px-2 gap-1">
                  <WheelColumn
                    items={FEET}
                    selectedIndex={feetIndex >= 0 ? feetIndex : 4}
                    onSelect={(i) => setSelFt(i + 1)}
                  />
                  <WheelColumn
                    items={INCHES}
                    selectedIndex={inchIndex >= 0 ? inchIndex : 7}
                    onSelect={(i) => setSelIn(i)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex px-4 pt-3 pb-1">
                  <span className="flex-1 text-center text-xs font-medium text-slate-400">Centimeters</span>
                </div>
                <div className="flex px-2">
                  <WheelColumn
                    items={CMS}
                    selectedIndex={cmIndex >= 0 ? cmIndex : 120}
                    onSelect={(i) => setSelCm(i + 50)}
                  />
                </div>
              </>
            )}

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
