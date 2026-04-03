import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MatchScore } from "@/components/MatchScore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, Plus, CalendarDays, StickyNote, Sparkles, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addApplicationEvent,
  getJobsByIds,
  jobIdFromAny,
  listApplications,
  saveApplicationNotes,
  updateApplicationStatus,
} from "@/lib/firestore";
import type { ApplicationStatusKey, JobDoc } from "@/lib/types";
import { STATUS_COLUMNS, statusLabel } from "@/lib/mappers";
import { toast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  Saved: "bg-secondary text-secondary-foreground",
  Tailored: "bg-accent text-accent-foreground",
  Applied: "bg-info/10 text-info",
  "OA Scheduled": "bg-warning/10 text-warning",
  "Interview Scheduled": "bg-primary/10 text-primary",
  Offer: "bg-success/10 text-success",
  Joined: "bg-success/15 text-success",
  Rejected: "bg-destructive/10 text-destructive",
  Withdrawn: "bg-muted text-muted-foreground",
};

type AppUI = {
  id: string;
  jobId: string;
  company: string;
  role: string;
  status: ApplicationStatusKey;
  matchScore: number;
  appliedOn?: string;
  nextEvent?: string;
  nextEventDate?: string;
  notes?: string;

  // ✅ locking
  instituteLocked: boolean;
  lockReason?: string;
};

function fmtDate(ts: any) {
  if (!ts?.toMillis) return "—";
  const d = new Date(ts.toMillis());
  return d.toLocaleDateString();
}

export default function Tracker() {
  const { authUser } = useAuth();
  const qc = useQueryClient();

  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [eventOpen, setEventOpen] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);

  const [eventForm, setEventForm] = useState({
    applicationId: "",
    type: "oa" as "oa" | "interview" | "deadline" | "followup",
    datetime: "",
    link: "",
    description: "",
  });

  const [notesOpen, setNotesOpen] = useState(false);
  const [notesAppId, setNotesAppId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  const { data: appRows, isLoading } = useQuery({
    queryKey: ["applications", authUser?.uid],
    enabled: !!authUser?.uid,
    queryFn: () => listApplications(authUser!.uid),
    staleTime: 10_000,
  });

  const { data: jobMap } = useQuery({
    queryKey: ["jobsForApplications", authUser?.uid, (appRows ?? []).map((a) => a.data.jobId).join(",")],
    enabled: !!authUser?.uid && (appRows?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = (appRows ?? []).map((a) => jobIdFromAny(a.data.jobId));
      return await getJobsByIds(ids);
    },
    staleTime: 30_000,
  });

  const apps: AppUI[] = useMemo(() => {
    const rows = appRows ?? [];
    const map = jobMap ?? {};
    return rows.map((r) => {
      const jobId = jobIdFromAny(r.data.jobId);
      const job = map[jobId] as JobDoc | undefined;

      // ✅ Institute Verified lock: visibility=institute OR source=tpo (fallback for older docs)
      const instituteLocked = (job?.visibility === "institute") || (job?.source === "tpo");

      return {
        id: r.id,
        jobId,
        company: job?.company ?? "(Company)",
        role: job?.title ?? "(Role)",
        status: r.data.status,
        matchScore: r.data.matchScore ?? 0,
        appliedOn: r.data.appliedAt ? fmtDate(r.data.appliedAt) : undefined,
        notes: r.data.notes ?? "",
        instituteLocked,
        lockReason: instituteLocked ? "Institute Verified drives can be updated only by TPO." : undefined,
      };
    });
  }, [appRows, jobMap]);

  const onChangeStatus = async (app: AppUI, next: ApplicationStatusKey) => {
    if (!authUser?.uid) return;

    if (app.instituteLocked) {
      toast({
        title: "Status locked",
        description: app.lockReason ?? "This application is controlled by your institute.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateApplicationStatus(app.id, authUser.uid, next);
      toast({ title: "Status updated", description: `Moved to ${statusLabel(next)}.` });
      qc.invalidateQueries({ queryKey: ["applications", authUser.uid] });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Could not update status.", variant: "destructive" });
    }
  };

  const onSaveEvent = async () => {
    if (!authUser?.uid) return;
    if (!eventForm.applicationId) {
      toast({ title: "Choose an application", description: "Select which job this event belongs to." });
      return;
    }
    if (!eventForm.datetime) {
      toast({ title: "Missing date", description: "Pick a date and time." });
      return;
    }

    const app = apps.find((a) => a.id === eventForm.applicationId);

    try {
      await addApplicationEvent({
        applicationId: eventForm.applicationId,
        uid: authUser.uid,
        type: eventForm.type,
        scheduledAt: new Date(eventForm.datetime),
        title:
          eventForm.type === "oa"
            ? "Online Assessment"
            : eventForm.type === "interview"
              ? "Interview"
              : eventForm.type === "deadline"
                ? "Deadline"
                : "Follow-up",
        link: eventForm.link,
        description: eventForm.description,
      });

      // ✅ auto-update status only for non-institute applications
      if (!app?.instituteLocked) {
        if (eventForm.type === "oa") {
          await updateApplicationStatus(eventForm.applicationId, authUser.uid, "oa_scheduled");
        }
        if (eventForm.type === "interview") {
          await updateApplicationStatus(eventForm.applicationId, authUser.uid, "interview_scheduled");
        }
      }

      toast({
        title: "Event saved",
        description: app?.instituteLocked
          ? "Event saved. Status is locked by institute."
          : "Your tracker has been updated.",
      });
      setEventOpen(false);
      qc.invalidateQueries({ queryKey: ["applications", authUser.uid] });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Could not save event.", variant: "destructive" });
    }
  };

  const openNotes = (app: AppUI) => {
    setNotesAppId(app.id);
    setNotesText(app.notes ?? "");
    setNotesOpen(true);
  };

  const saveNotes = async () => {
    if (!authUser?.uid || !notesAppId) return;
    try {
      await saveApplicationNotes(notesAppId, authUser.uid, notesText);
      toast({ title: "Notes saved" });
      setNotesOpen(false);
      qc.invalidateQueries({ queryKey: ["applications", authUser.uid] });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Could not save notes.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Tracker</h1>
            <p className="text-sm text-muted-foreground">Track your application lifecycle</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setSmartOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Smart Assist
            </Button>
            <Button size="sm" className="gap-1 text-xs" onClick={() => setEventOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Event
            </Button>
            <div className="border rounded-md flex">
              <Button
                variant={view === "kanban" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setView("table")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card className="card-elevated p-6 text-sm text-muted-foreground">Loading tracker…</Card>
        ) : view === "kanban" ? (
          <KanbanView apps={apps} onNotes={openNotes} onChangeStatus={onChangeStatus} />
        ) : (
          <TableView apps={apps} onNotes={openNotes} onChangeStatus={onChangeStatus} />
        )}

        {/* Add Event Modal */}
        <Dialog open={eventOpen} onOpenChange={setEventOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Application</Label>
                <Select value={eventForm.applicationId} onValueChange={(v) => setEventForm((p) => ({ ...p, applicationId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.company} — {a.role}{a.instituteLocked ? " (Institute Verified)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Event Type</Label>
                <Select value={eventForm.type} onValueChange={(v) => setEventForm((p) => ({ ...p, type: v as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oa">Online Assessment</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.datetime}
                  onChange={(e) => setEventForm((p) => ({ ...p, datetime: e.target.value }))}
                />
              </div>
              <div>
                <Label>Link (optional)</Label>
                <Input value={eventForm.link} onChange={(e) => setEventForm((p) => ({ ...p, link: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Notes..."
                  rows={2}
                />
              </div>
              <Button className="w-full" onClick={onSaveEvent}>
                Save Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notes Modal */}
        <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Notes</DialogTitle>
            </DialogHeader>
            <Textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={5} placeholder="Add notes…" />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={saveNotes}>
                Save
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setNotesOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Smart Assist Modal (UI-only) */}
        <Dialog open={smartOpen} onOpenChange={setSmartOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Smart Assist
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Paste an email or message and we’ll suggest an update.</p>
            <Textarea placeholder="Paste email or message here..." rows={4} />
            <Card className="p-4 bg-accent/50 space-y-2">
              <p className="text-xs font-medium">Example:</p>
              <p className="text-sm">📅 Date: <strong>Next Tuesday 2:00 PM</strong></p>
              <p className="text-sm">
                📌 Suggested: <Badge className={statusColors["Interview Scheduled"]}>Interview Scheduled</Badge>
              </p>
              <Button size="sm" className="mt-2">
                Apply Suggestion
              </Button>
            </Card>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function StatusPicker({
  value,
  disabled,
  disabledReason,
  onChange,
}: {
  value: ApplicationStatusKey;
  disabled: boolean;
  disabledReason?: string;
  onChange: (v: ApplicationStatusKey) => void;
}) {
  const label = statusLabel(value);
  return (
    <div className="space-y-1">
      <Select value={value} onValueChange={(v) => onChange(v as ApplicationStatusKey)} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_COLUMNS.map((s) => (
            <SelectItem key={s} value={s}>
              {statusLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {disabled ? (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Lock className="h-3 w-3" /> {disabledReason ?? "Locked"}
        </div>
      ) : null}
      <div className="text-[11px] text-muted-foreground">
        Current: <span className={`ml-1 px-2 py-0.5 rounded-full ${statusColors[label]}`}>{label}</span>
      </div>
    </div>
  );
}

function KanbanView({
  apps,
  onNotes,
  onChangeStatus,
}: {
  apps: AppUI[];
  onNotes: (app: AppUI) => void;
  onChangeStatus: (app: AppUI, next: ApplicationStatusKey) => void;
}) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {STATUS_COLUMNS.map((colKey) => {
          const col = statusLabel(colKey);
          const colApps = apps.filter((a) => a.status === colKey);
          return (
            <div key={colKey} className="w-64 shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Badge variant="outline" className={`text-xs ${statusColors[col] || ""}`}>
                  {col}
                </Badge>
                <span className="text-xs text-muted-foreground">({colApps.length})</span>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {colApps.map((app, i) => (
                  <motion.div key={app.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="card-elevated p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{app.company}</p>
                          <p className="text-xs text-muted-foreground truncate">{app.role}</p>
                        </div>
                        <MatchScore score={app.matchScore} />
                      </div>

                      <StatusPicker
                        value={app.status}
                        disabled={app.instituteLocked}
                        disabledReason={app.lockReason}
                        onChange={(v) => onChangeStatus(app, v)}
                      />

                      {app.nextEventDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> {app.nextEvent} — {app.nextEventDate}
                        </p>
                      )}

                      <button
                        className="text-left text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
                        onClick={() => onNotes(app)}
                      >
                        <StickyNote className="h-3 w-3" /> {app.notes ? app.notes : "Add notes"}
                      </button>
                    </Card>
                  </motion.div>
                ))}
                {colApps.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">No applications</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableView({
  apps,
  onNotes,
  onChangeStatus,
}: {
  apps: AppUI[];
  onNotes: (app: AppUI) => void;
  onChangeStatus: (app: AppUI, next: ApplicationStatusKey) => void;
}) {
  return (
    <Card className="card-elevated overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied On</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apps.map((app) => (
            <TableRow key={app.id}>
              <TableCell className="font-medium">{app.company}</TableCell>
              <TableCell className="text-sm">{app.role}</TableCell>
              <TableCell className="min-w-[220px]">
                <StatusPicker
                  value={app.status}
                  disabled={app.instituteLocked}
                  disabledReason={app.lockReason}
                  onChange={(v) => onChangeStatus(app, v)}
                />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{app.appliedOn || "—"}</TableCell>
              <TableCell>
                <MatchScore score={app.matchScore} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[220px]">
                <button className="hover:underline" onClick={() => onNotes(app)}>
                  {app.notes || "Add notes"}
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}