"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface GlassMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export default function GlassMultiSelect({
  values,
  onChange,
  options,
  placeholder = "Select",
  className = "",
}: GlassMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, []);

  function handleToggle() {
    if (!open) updatePosition();
    setOpen(!open);
  }

  function toggle(option: string) {
    if (values.includes(option)) {
      onChange(values.filter((v) => v !== option));
    } else {
      onChange([...values, option]);
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || listRef.current?.contains(target)) return;
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

  const label = values.length === 0
    ? null
    : values.length <= 2
      ? values.join(", ")
      : `${values.length} selected`;

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between rounded-xl bg-white/60 dark:bg-white/[0.08] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.10] px-4 py-2.5 text-sm text-left transition-all focus:bg-white/80 dark:focus:bg-white/[0.12] focus:border-accent-300 dark:focus:border-accent-500/50 focus:outline-none focus:ring-2 focus:ring-accent-400/20"
      >
        <span className={label ? "text-slate-900 dark:text-slate-100 truncate mr-2" : "text-slate-400 dark:text-slate-500"}>
          {label || placeholder}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            className="fixed max-h-72 overflow-y-auto rounded-2xl bg-white/85 dark:bg-zinc-900/90 backdrop-blur-3xl backdrop-saturate-150 border border-white/30 dark:border-white/[0.15] shadow-glass-lg dark:shadow-glass-dark p-1.5 animate-dropdown scrollbar-none"
            style={{
              zIndex: 99999,
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
          >
            {options.map((option) => {
              const isSelected = values.includes(option);
              return (
                <div
                  key={option}
                  onClick={() => toggle(option)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm cursor-pointer transition-all ${
                    isSelected
                      ? "bg-accent-500/10 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <span>{option}</span>
                  {isSelected && (
                    <svg className="h-4 w-4 text-accent-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
