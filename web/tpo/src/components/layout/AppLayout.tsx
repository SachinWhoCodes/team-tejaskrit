import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
