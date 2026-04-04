import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User as UserIcon,
  Command,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommandPalette } from "@/components/CommandPalette";
import { useAuth } from "@/auth/AuthProvider";

const navItems = [
  { label: "Overview", path: "/" },
  { label: "Drives & Jobs", path: "/drives" },
  { label: "Students", path: "/students" },
  { label: "Applications", path: "/applications" },
  { label: "Analytics", path: "/analytics" },
  { label: "Announcements", path: "/announcements" },
];

function initials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "TP";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();

  const [commandOpen, setCommandOpen] = useState(false);

  const displayName = useMemo(() => {
    return profile?.name || user?.displayName || "TPO";
  }, [profile?.name, user?.displayName]);

  const displayRole = useMemo(() => {
    return profile?.role === "tpo" ? "TPO Admin" : "User";
  }, [profile?.role]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border card-shadow">
        <div className="h-full max-w-[1440px] mx-auto px-6 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-1 shrink-0">
            <span className="font-brand text-2xl font-bold text-primary tracking-tight">
              Tejaskrit
            </span>
            <span className="text-xs font-medium text-muted-foreground ml-2 bg-secondary px-2 py-0.5 rounded-md">
              TPO
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 ml-10">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary rounded-lg hover:bg-muted transition-colors border border-border"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-card rounded border border-border">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg p-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {displayRole}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem>
                  <UserIcon className="w-4 h-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={onLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
