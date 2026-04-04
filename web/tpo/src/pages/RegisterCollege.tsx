import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";

function extractDomain(email?: string | null) {
  if (!email) return "";
  const at = email.indexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

export default function RegisterCollege() {
  const { user, profile, registerCollege } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const emailDomain = useMemo(
    () => extractDomain(user?.email ?? profile?.displayEmail ?? profile?.email),
    [user?.email, profile?.displayEmail, profile?.email],
  );

  const [instituteName, setInstituteName] = useState("");
  const [instituteCode, setInstituteCode] = useState("");
  const [domains, setDomains] = useState(emailDomain ? emailDomain : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already onboarded, skip
    if (profile?.role === "tpo" && profile?.instituteId) {
      navigate("/", { replace: true });
    }
  }, [profile, navigate]);

  const onSubmit = async () => {
    setBusy(true);
    try {
      const domainsAllowed = domains
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      if (!instituteName.trim()) throw new Error("Institute name is required");
      if (domainsAllowed.length === 0)
        throw new Error("At least one email domain is required");

      await registerCollege({
        instituteName,
        instituteCode,
        domainsAllowed,
      });

      toast({
        title: "College registered",
        description: "Your TPO workspace is ready.",
      });
      navigate("/", { replace: true });
    } catch (e: any) {
      toast({
        title: "Registration failed",
        description: e?.message ?? "Could not register institute.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="font-brand text-3xl font-bold text-primary">
            Tejaskrit
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your institute workspace (TPO)
          </p>
        </div>

        <Card className="card-shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Register your college</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Institute name</label>
                <Input
                  placeholder="e.g. MITS Gwalior"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Institute code (optional)
                </label>
                <Input
                  placeholder="e.g. MITS"
                  value={instituteCode}
                  onChange={(e) => setInstituteCode(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Allowed email domain(s)
              </label>
              <Input
                placeholder="e.g. mitsgwalior.in, mits.edu"
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Students/TPO emails matching these domains can be verified
                later.
              </p>
            </div>

            <Button className="w-full" onClick={onSubmit} disabled={busy}>
              {busy ? "Creating workspace…" : "Create Institute Workspace"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
