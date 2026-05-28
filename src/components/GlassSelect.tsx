"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function GlassSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  required,
  className = "",
}: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const selectedLabel = options.find((o) => o.value === value)?.label;

  // Position the dropdown relative to the trigger button
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Open handler: compute position then open
  function handleToggle() {
    if (!open) updatePosition();
    setOpen(!open);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        listRef.current?.contains(target)
      )
        return;
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

  // Scroll selected item into view when opening
  useEffect(() => {
    if (open && listRef.current && value) {
      const selected = listRef.current.querySelector("[data-selected]");
      if (selected) selected.scrollIntoView({ block: "nearest" });
    }
  }, [open, value]);

  return (
    <div className={className}>
      {/* Hidden native select for form validation */}
      {required && (
        <select
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between rounded-xl bg-white/60 dark:bg-white/[0.08] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.10] px-4 py-2.5 text-sm text-left transition-all focus:bg-white/80 dark:focus:bg-white/[0.12] focus:border-accent-300 dark:focus:border-accent-500/50 focus:outline-none focus:ring-2 focus:ring-accent-400/20"
      >
        <span className={selectedLabel ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
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

      {/* Dropdown rendered via portal to escape all stacking contexts */}
      {open &&
        createPortal(
          <ul
            ref={listRef}
            className="fixed max-h-60 overflow-y-auto rounded-2xl bg-white/85 dark:bg-zinc-900/90 backdrop-blur-3xl backdrop-saturate-150 border border-white/30 dark:border-white/[0.15] shadow-glass-lg dark:shadow-glass-dark p-1.5 animate-dropdown"
            style={{
              zIndex: 99999,
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  data-selected={isSelected || undefined}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm cursor-pointer transition-all ${
                    isSelected
                      ? "bg-accent-500/10 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <svg className="h-4 w-4 text-accent-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
