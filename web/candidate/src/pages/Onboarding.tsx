import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight, ArrowLeft, X, ChevronsUpDown } from "lucide-react";
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
import { listConfiguredInstitutes, saveOnboarding } from "@/lib/firestore";
import { toast } from "@/hooks/use-toast";
import type { InstituteDoc } from "@/lib/types";
import { cn } from "@/lib/utils";

const steps = ["Basic Info", "Education", "Links", "Skills & Summary", "Review"]; 

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, userDoc, refreshUserDoc } = useAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    location: "",

    instituteId: "",

    college: "",
    branch: "",
    batch: "",
    cgpa: "",

    linkedin: "",
    github: "",
    portfolio: "",

    skills: [] as string[],
    skillInput: "",
    summary: "",
  });

  useEffect(() => {
    if (userDoc?.onboardedAt) {
      navigate("/");
      return;
    }

    // Optional: prefill from registration flow
    const prefill = (location.state as any)?.prefill;
    if (prefill) {
      setForm((p) => ({
        ...p,
        name: prefill.name ?? p.name,
        instituteId: prefill.instituteId ?? p.instituteId,
        college: prefill.college ?? p.college,
        branch: prefill.branch ?? p.branch,
        batch: prefill.batch ?? p.batch,
        cgpa: prefill.cgpa ?? p.cgpa,
      }));
    }

    // prefill
    setForm((p) => ({
      ...p,
      name: p.name || userDoc?.name || authUser?.displayName || "",
      phone: p.phone || userDoc?.phone || "",
      location: p.location || "",
      instituteId: p.instituteId || userDoc?.instituteId || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc?.onboardedAt]);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const addSkill = () => {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((p) => ({ ...p, skills: [...p.skills, s], skillInput: "" }));
    }
  };

  const removeSkill = (s: string) => setForm((p) => ({ ...p, skills: p.skills.filter((x) => x !== s) }));

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  const [institutes, setInstitutes] = useState<Array<{ id: string; data: InstituteDoc }>>([]);
  const [instPickerOpen, setInstPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listConfiguredInstitutes(300);
        setInstitutes(rows);

        // If we have instituteId but not college name, fill it
        if (form.instituteId && !form.college) {
          const found = rows.find((r) => r.id === form.instituteId);
          if (found) setForm((p) => ({ ...p, college: found.data.name }));
        }
      } catch {
        setInstitutes([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedInstitute = useMemo(
    () => institutes.find((i) => i.id === form.instituteId) ?? null,
    [institutes, form.instituteId]
  );

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.instituteId) return "Select your college/institute";
    if (form.skills.length === 0) return "Add at least 1 skill";
    return null;
  };

  const finish = async () => {
    const uid = authUser?.uid;
    if (!uid) return;

    const err = validate();
    if (err) {
      toast({ title: "Incomplete profile", description: err, variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      await saveOnboarding(
        uid,
        {
          uid,
          name: form.name.trim(),
          phone: form.phone.trim(),
          instituteId: form.instituteId,
          role: "student",
          prefs: {
            locations: form.location ? [form.location] : [],
          },
        },
        {
          summary: form.summary.trim(),
          links: {
            linkedin: form.linkedin.trim(),
            github: form.github.trim(),
            portfolio: form.portfolio.trim(),
          },
          skills: form.skills,
          education: [
            {
              institute: (form.college || selectedInstitute?.data.name || "").trim(),
              degree: "",
              branch: form.branch.trim() || undefined,
              startYear: undefined,
              endYear: form.batch ? Number(form.batch) : undefined,
              cgpa: form.cgpa ? Number(form.cgpa) : undefined,
            },
          ],
        },
        {
          instituteId: form.instituteId,
          instituteName: (form.college || selectedInstitute?.data.name || "").trim(),
          branch: form.branch.trim(),
          batch: form.batch.trim(),
          cgpa: form.cgpa ? Number(form.cgpa) : undefined,
        }
      );

      await refreshUserDoc();
      toast({ title: "Profile created", description: "Welcome to Tejaskrit." });
      navigate("/");
    } catch (e: any) {
      toast({
        title: "Onboarding failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-wide" style={{ letterSpacing: "0.08em" }}>
            Tejaskrit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your profile — Step {step + 1} of {steps.length}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <Progress value={progress} className="h-1.5" />
          <div className="flex justify-between mt-2">
            {steps.map((s, i) => (
              <span
                key={s}
                className={`text-[10px] font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <Card className="card-elevated p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input placeholder="Arjun Mehta" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <Label>Location</Label>
                <Input placeholder="Mumbai, India" value={form.location} onChange={(e) => set("location", e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>College / University</Label>
                <Popover open={instPickerOpen} onOpenChange={setInstPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-9"
                    >
                      <span className={cn("truncate", !selectedInstitute && "text-muted-foreground")}>
                        {selectedInstitute ? selectedInstitute.data.name : "Search and select your college"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Type college name…" />
                      <CommandList>
                        <CommandEmpty>
                          No college found. Ask your TPO to register your institute first.
                        </CommandEmpty>
                        <CommandGroup heading="Colleges">
                          {institutes.map((i) => (
                            <CommandItem
                              key={i.id}
                              value={`${i.data.name} ${i.data.code ?? ""}`}
                              onSelect={() => {
                                setForm((p) => ({ ...p, instituteId: i.id, college: i.data.name }));
                                setInstPickerOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", form.instituteId === i.id ? "opacity-100" : "opacity-0")} />
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
                <p className="text-[11px] text-muted-foreground mt-1">
                  Only colleges with a registered TPO workspace are available.
                </p>
              </div>
              <div>
                <Label>Branch / Major</Label>
                <Input placeholder="Computer Science" value={form.branch} onChange={(e) => set("branch", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Batch / Year</Label>
                  <Input placeholder="2026" value={form.batch} onChange={(e) => set("batch", e.target.value)} />
                </div>
                <div>
                  <Label>CGPA</Label>
                  <Input placeholder="8.72" value={form.cgpa} onChange={(e) => set("cgpa", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>LinkedIn</Label>
                <Input
                  placeholder="linkedin.com/in/your-profile"
                  value={form.linkedin}
                  onChange={(e) => set("linkedin", e.target.value)}
                />
              </div>
              <div>
                <Label>GitHub</Label>
                <Input placeholder="github.com/your-handle" value={form.github} onChange={(e) => set("github", e.target.value)} />
              </div>
              <div>
                <Label>Portfolio (optional)</Label>
                <Input placeholder="yoursite.dev" value={form.portfolio} onChange={(e) => set("portfolio", e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. React"
                    value={form.skillInput}
                    onChange={(e) => set("skillInput", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  />
                  <Button variant="outline" size="sm" onClick={addSkill}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {form.skills.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="gap-1 cursor-pointer"
                      onClick={() => removeSkill(s)}
                    >
                      {s} <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Short Bio</Label>
                <Textarea
                  placeholder="Final year CS undergrad passionate about..."
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold text-base mb-2">Review Your Profile</h3>
              {form.name && (
                <p>
                  <span className="text-muted-foreground">Name:</span> {form.name}
                </p>
              )}
              {form.phone && (
                <p>
                  <span className="text-muted-foreground">Phone:</span> {form.phone}
                </p>
              )}
              {form.location && (
                <p>
                  <span className="text-muted-foreground">Location:</span> {form.location}
                </p>
              )}
              {form.college && (
                <p>
                  <span className="text-muted-foreground">College:</span> {form.college}
                </p>
              )}
              {form.branch && (
                <p>
                  <span className="text-muted-foreground">Branch:</span> {form.branch}
                </p>
              )}
              {form.batch && (
                <p>
                  <span className="text-muted-foreground">Batch:</span> {form.batch}
                </p>
              )}
              {form.cgpa && (
                <p>
                  <span className="text-muted-foreground">CGPA:</span> {form.cgpa}
                </p>
              )}
              {form.linkedin && (
                <p>
                  <span className="text-muted-foreground">LinkedIn:</span> {form.linkedin}
                </p>
              )}
              {form.github && (
                <p>
                  <span className="text-muted-foreground">GitHub:</span> {form.github}
                </p>
              )}
              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.skills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
              {form.summary && <p className="text-muted-foreground mt-2">{form.summary}</p>}

              <p className="text-[11px] text-muted-foreground mt-2">
                This data is saved privately to your Firebase account and used only for matching and resume generation.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} className="gap-1">
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={finish} className="gap-1" disabled={saving}>
                <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Finish"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
