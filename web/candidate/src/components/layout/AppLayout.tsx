import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-14 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
