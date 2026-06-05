import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import Providers from "@/components/Providers";
import AppNav from "@/components/AppNav";
import PageTransition from "@/components/PageTransition";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <Providers>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="flex h-full flex-col">
        <main id="main-content" tabIndex={-1} aria-label="Main content" className="flex-1 overflow-y-auto focus:outline-none">
          <PageTransition>{children}</PageTransition>
        </main>
        <AppNav />
      </div>
    </Providers>
  );
}
