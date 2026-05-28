"use client";

import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      style={{
        height: "100%",
        animation: "pageFade 320ms cubic-bezier(0.32, 0.72, 0, 1) backwards",
      }}
    >
      {children}
    </div>
  );
}
