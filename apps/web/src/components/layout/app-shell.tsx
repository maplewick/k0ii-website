import { KoiBackground } from "@/components/layout/koi-background";
import { MainNav } from "@/components/layout/main-nav";
import { SiteFooter } from "@/components/layout/site-footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <KoiBackground />
      <MainNav />
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:py-9">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
