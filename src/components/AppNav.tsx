"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Home", href: "/dashboard", icon: HomeIcon },
  { name: "Wynn", href: "/coach", icon: CoachIcon },
  { name: "Log", href: "/log", icon: LogIcon },
  { name: "Progress", href: "/progress", icon: ProgressIcon },
  { name: "Profile", href: "/profile", icon: ProfileIcon },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed -bottom-10 left-0 right-0 bg-white/60 dark:bg-zinc-950/70 backdrop-blur-2xl border-t border-black/5 dark:border-white/[0.06] pt-0 pb-10"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2.5rem)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-3 py-2">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`no-press-feedback flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all ${
                active
                  ? "text-accent-500"
                  : "text-slate-400 active:text-slate-500"
              }`}
            >
              <tab.icon active={active} />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CoachIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function LogIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 6-7" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
