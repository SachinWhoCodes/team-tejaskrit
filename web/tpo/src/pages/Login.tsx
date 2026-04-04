import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, profile, loginWithEmailPassword, registerWithEmailPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = useMemo(() => {
    const state = location.state as any;
    return state?.from ?? "/";
  }, [location.state]);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  // Sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign up
  const [name, setName] = useState("");
  const [email2, setEmail2] = useState("");
  const [password2, setPassword2] = useState("");
  const [password3, setPassword3] = useState("");

  useEffect(() => {
    if (!user) return;

    // If logged in and already onboarded
    if ((profile?.role === "tpo" || profile?.role === "admin") && profile?.instituteId) {
      navigate(from, { replace: true });
      return;
    }

    // Needs institute setup
    navigate("/register-college", { replace: true });
  }, [user, profile, navigate, from]);

  const onSignIn = async () => {
    setBusy(true);
    try {
      await loginWithEmailPassword(email, password);
    } catch (e: any) {
      toast({
        title: "Sign in failed",
        description: e?.message ?? "Invalid credentials or account not found.",
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  const onSignUp = async () => {
    setBusy(true);
    try {
      if (password2 !== password3) throw new Error("Passwords do not match.");
      if (password2.length < 6) throw new Error("Password must be at least 6 characters.");

      await registerWithEmailPassword({
        name,
        email: email2,
        password: password2,
      });
    } catch (e: any) {
      toast({
        title: "Create account failed",
        description: e?.message ?? "Could not create account.",
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-brand text-3xl font-bold text-primary">Tejaskrit</div>
          <p className="text-sm text-muted-foreground mt-1">TPO Panel — Training & Placement Cell</p>
        </div>

        <Card className="card-shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl">{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>

            <div className="flex gap-2">
              <Button
                variant={mode === "signin" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("signin")}
                disabled={busy}
              >
                Sign in
              </Button>
              <Button
                variant={mode === "signup" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("signup")}
                disabled={busy}
              >
                Create
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {mode === "signin" ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="tpo@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                </div>

                <Button className="w-full" onClick={onSignIn} disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="Placement Officer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="tpo@college.edu"
                    value={email2}
                    onChange={(e) => setEmail2(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    placeholder="min 6 characters"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="repeat password"
                    value={password3}
                    onChange={(e) => setPassword3(e.target.value)}
                    disabled={busy}
                  />
                </div>

                <Button className="w-full" onClick={onSignUp} disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              Note: This panel is for Training & Placement officers. Students should use the Candidate app.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
