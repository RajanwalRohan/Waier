import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import Providers from "@/components/Providers";
import AppNav from "@/components/AppNav";

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
        <main className="flex-1 overflow-y-auto bg-gray-50 pb-20">
          {children}
        </main>
        <AppNav />
      </div>
    </Providers>
  );
}
