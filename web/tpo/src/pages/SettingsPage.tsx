import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/auth/AuthProvider";

export default function SettingsPage() {
  const { user, profile, logout } = useAuth();

  const email = useMemo(() => user?.email ?? profile?.displayEmail ?? profile?.email ?? "—", [user?.email, profile?.displayEmail, profile?.email]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Workspace + account settings (MVP)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="text-muted-foreground">Email</div>
              <div className="font-medium">{email}</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Role</div>
              <div className="font-medium"><Badge variant="secondary">{profile?.role ?? "—"}</Badge></div>
            </div>
            <Button size="sm" variant="destructive" onClick={logout}>
              Sign out
            </Button>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Institute Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="text-muted-foreground">Institute ID</div>
              <div className="font-medium">{profile?.instituteId ?? "—"}</div>
            </div>
            <p className="text-xs text-muted-foreground">
              This TPO panel is aligned with the Candidate app schema:
              <span className="block mt-1">• Drives are stored in <code>/jobs</code> as visibility=<code>institute</code>, source=<code>tpo</code></span>
              <span className="block">
                • Students are read from <code>{"/institutes/{instituteId}/members"}</code>
              </span>
              <span className="block">• Applications are read from <code>/applications</code> filtered by instituteId</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
