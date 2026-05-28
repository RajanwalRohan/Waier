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
      <div className="flex h-full flex-col">
        <main className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
        <AppNav />
      </div>
    </Providers>
  );
}
