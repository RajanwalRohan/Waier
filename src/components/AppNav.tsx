"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Home", href: "/dashboard", icon: HomeIcon },
  { name: "Coach", href: "/coach", icon: ChatIcon },
  { name: "Progress", href: "/progress", icon: ChartIcon },
  { name: "Log", href: "/log", icon: PlusIcon },
  { name: "Profile", href: "/profile", icon: UserIcon },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "text-brand-600"
                  : "text-gray-500 hover:text-gray-700"
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
    <svg className={`h-5 w-5 ${active ? "fill-brand-600" : "fill-gray-400"}`} viewBox="0 0 24 24">
      <path d="M12 3l9 8h-3v10h-5v-6H11v6H6V11H3l9-8z" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? "fill-brand-600" : "fill-gray-400"}`} viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? "fill-brand-600" : "fill-gray-400"}`} viewBox="0 0 24 24">
      <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4-4h2v18h-2V3zm4 8h2v10h-2V11zm4-3h2v13h-2V8z" />
    </svg>
  );
}

function PlusIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? "fill-brand-600" : "fill-gray-400"}`} viewBox="0 0 24 24">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-5 w-5 ${active ? "fill-brand-600" : "fill-gray-400"}`} viewBox="0 0 24 24">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}
