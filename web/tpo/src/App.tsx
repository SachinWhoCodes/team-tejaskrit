import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";

import Overview from "./pages/Overview";
import DrivesJobs from "./pages/DrivesJobs";
import Students from "./pages/Students";
import Applications from "./pages/Applications";
import Analytics from "./pages/Analytics";
import Announcements from "./pages/Announcements";
import SettingsPage from "./pages/SettingsPage";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";

import Login from "./pages/Login";
import RegisterCollege from "./pages/RegisterCollege";

import RequireTpo from "@/auth/RequireTpo";
import RequireAuth from "@/auth/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/register-college"
            element={
              <RequireAuth>
                <RegisterCollege />
              </RequireAuth>
            }
          />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Protected TPO Panel */}
          <Route
            element={
              <RequireTpo>
                <AppLayout />
              </RequireTpo>
            }
          >
            <Route path="/" element={<Overview />} />
            <Route path="/drives" element={<DrivesJobs />} />
            <Route path="/students" element={<Students />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
