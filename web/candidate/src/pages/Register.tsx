import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { connectUserToInstituteExisting, listConfiguredInstitutes } from "@/lib/firestore";
import type { InstituteDoc } from "@/lib/types";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Register() {
  const navigate = useNavigate();
  const { authUser, userDoc, loading, signUpEmail, signInGoogle } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [selectedInstituteId, setSelectedInstituteId] = useState<string>("");
  const [selectedInstituteName, setSelectedInstituteName] = useState<string>("");
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [cgpa, setCgpa] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [institutes, setInstitutes] = useState<Array<{ id: string; data: InstituteDoc }>>([]);

  useEffect(() => {
    if (!loading && authUser) {
      if (userDoc?.onboardedAt) navigate("/");
      else navigate("/onboarding");
    }
  }, [authUser, userDoc, loading, navigate]);

  useEffect(() => {
    (async () => {
      try {
        const items = await listConfiguredInstitutes(300);
        setInstitutes(items);
      } catch {
        setInstitutes([]);
      }
    })();
  }, []);

  const selectedInstitute = useMemo(
    () => institutes.find((i) => i.id === selectedInstituteId) ?? null,
    [institutes, selectedInstituteId]
  );

  const handleRegister = async () => {
    if (!name.trim()) {
      toast({ title: "Missing details", description: "Enter your full name.", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Missing details", description: "Enter your email.", variant: "destructive" });
      return;
    }
    if (!password || password.length < 6) {
      toast({
        title: "Weak password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", description: "Re-check your password.", variant: "destructive" });
      return;
    }
    if (!selectedInstituteId) {
      toast({
        title: "College required",
        description: "Select your college from the list (only colleges registered by TPO are available).",
        variant: "destructive",
      });
      return;
    }

    const cgpaNum = cgpa.trim() ? Number(cgpa.trim()) : undefined;
    if (cgpa.trim() && (Number.isNaN(cgpaNum) || cgpaNum! < 0 || cgpaNum! > 10)) {
      toast({ title: "Invalid CGPA", description: "Enter a valid CGPA (0–10).", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const user = await signUpEmail(email.trim(), password, name.trim());

      // ✅ Connect to an EXISTING TPO-configured institute (prevents duplicate institute docs)
      await connectUserToInstituteExisting({
        uid: user.uid,
        branch: branch.trim() || undefined,
        batch: batch.trim() || undefined,
        cgpa: cgpaNum,
        instituteId: selectedInstituteId,
      });

      toast({
        title: "Account created",
        description: "Now complete onboarding to finish your master profile.",
      });

      navigate("/onboarding", {
        state: {
          prefill: {
            name: name.trim(),
            instituteId: selectedInstituteId,
            college: selectedInstituteName || selectedInstitute?.data?.name || "",
            branch: branch.trim(),
            batch: batch.trim(),
            cgpa: cgpa.trim(),
          },
        },
      });
    } catch (e: any) {
      const code = e?.code ?? "";
      toast({
        title: "Registration failed",
        description:
          code === "auth/email-already-in-use"
            ? "This email is already registered. Please sign in instead."
            : e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setSubmitting(true);
      await signInGoogle();
      toast({ title: "Signed in", description: "Complete onboarding to connect your college and profile." });
      navigate("/onboarding");
    } catch (e: any) {
      toast({ title: "Google sign-in failed", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wide" style={{ letterSpacing: "0.08em" }}>
            Tejaskrit
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Create your candidate account</p>
        </div>

        <Card className="card-elevated p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Arjun Mehta" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="college">College / University</Label>
            <InstitutePicker
              institutes={institutes}
              valueId={selectedInstituteId}
              onChange={(id, name) => {
                setSelectedInstituteId(id);
                setSelectedInstituteName(name);
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Only colleges with a registered TPO workspace are available.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branch (optional)</Label>
              <Input id="branch" placeholder="IT / CSE" value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Institute Code</Label>
              <Input value={selectedInstitute?.data?.code ?? ""} readOnly placeholder="Auto" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch">Batch / Year (optional)</Label>
              <Input id="batch" placeholder="2026" value={batch} onChange={(e) => setBatch(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cgpa">CGPA (optional)</Label>
              <Input id="cgpa" placeholder="8.72" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            By continuing, you consent to using your profile for matching and resume generation. You can change this later in Data & Privacy.
          </p>

          <Button className="w-full" onClick={handleRegister} disabled={submitting}>
            {submitting ? "Please wait…" : "Create Account"}
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={submitting}>
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

function InstitutePicker({
  institutes,
  valueId,
  onChange,
}: {
  institutes: Array<{ id: string; data: InstituteDoc }>;
  valueId: string;
  onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = institutes.find((i) => i.id === valueId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-9"
          type="button"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.data.name : "Search and select your college"}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type college name…" />
          <CommandList>
            <CommandEmpty>No college found. Ask your TPO to register your institute.</CommandEmpty>
            <CommandGroup heading="Colleges">
              {institutes.map((i) => (
                <CommandItem
                  key={i.id}
                  value={`${i.data.name} ${i.data.code ?? ""}`}
                  onSelect={() => {
                    onChange(i.id, i.data.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", valueId === i.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{i.data.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {i.data.code ? `Code: ${i.data.code}` : ""}
                      {i.data.domainsAllowed?.length ? ` · Domains: ${i.data.domainsAllowed.slice(0, 2).join(", ")}` : ""}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
