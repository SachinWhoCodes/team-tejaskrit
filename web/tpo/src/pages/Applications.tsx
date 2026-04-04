import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  X,
  FileText,
  Loader2,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/auth/AuthProvider";
import type { ApplicationDoc, JobDoc, UserDoc, ApplicationStatus } from "@/lib/types";
import {
  getUsersByIds,
  jobIdFromAny,
  watchInstituteApplications,
} from "@/lib/firestore";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function msAny(ts: any) {
  try {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    return 0;
  } catch {
    return 0;
  }
}

function fmtShort(ms?: number) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const STATUS_OPTIONS: Array<{ key: ApplicationStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "saved", label: "Saved" },
  { key: "tailored", label: "Tailored" },
  { key: "applied", label: "Applied" },
  { key: "oa_scheduled", label: "OA Scheduled" },
  { key: "interview_scheduled", label: "Interview Scheduled" },
  { key: "offer", label: "Offer" },
  { key: "joined", label: "Joined" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
];

type Row = {
  id: string;
  data: ApplicationDoc;
  user?: UserDoc;
  job?: JobDoc;
};

async function getJob(jobId: string) {
  const snap = await getDoc(doc(db, "jobs", jobId));
  return snap.exists() ? (snap.data() as JobDoc) : null;
}

export default function Applications() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Array<{ id: string; data: ApplicationDoc }>>([]);
  const [users, setUsers] = useState<Map<string, UserDoc>>(new Map());
  const [jobs, setJobs] = useState<Map<string, JobDoc>>(new Map());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const detail = useMemo(() => (detailId ? apps.find((a) => a.id === detailId) ?? null : null), [detailId, apps]);
  const detailJobId = detail ? jobIdFromAny(detail.data.jobId) : "";

  const [detailDraft, setDetailDraft] = useState({
    status: "applied" as ApplicationStatus,
    notes: "",
  });
  const [detailSaving, setDetailSaving] = useState(false);

  useEffect(() => {
    if (!instituteId) return;
    setLoading(true);

    const unsub = watchInstituteApplications(instituteId, (rows) => {
      setApps(rows);
      setLoading(false);
    });

    return () => unsub();
  }, [instituteId]);

  // fetch users for applications
  useEffect(() => {
    const uids = Array.from(new Set(apps.map((a) => a.data.userId)));
    if (uids.length === 0) return;
    (async () => {
      const map = await getUsersByIds(uids);
      setUsers(map);
    })().catch(() => {});
  }, [apps]);

  // fetch job docs for applications (cache)
  useEffect(() => {
    const jobIds = Array.from(new Set(apps.map((a) => jobIdFromAny(a.data.jobId)).filter(Boolean)));
    if (jobIds.length === 0) return;

    (async () => {
      const next = new Map(jobs);
      await Promise.all(
        jobIds.map(async (jid) => {
          if (next.has(jid)) return;
          const j = await getJob(jid);
          if (j) next.set(jid, j);
        }),
      );
      setJobs(next);
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps]);

  const rows = useMemo<Row[]>(() => {
    return apps
      .map((a) => {
        const uid = a.data.userId;
        const jid = jobIdFromAny(a.data.jobId);
        return {
          id: a.id,
          data: a.data,
          user: users.get(uid),
          job: jid ? jobs.get(jid) : undefined,
        };
      })
      .sort((a, b) => msAny(b.data.updatedAt) - msAny(a.data.updatedAt));
  }, [apps, users, jobs]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.data.status !== statusFilter) return false;
      if (!s) return true;
      const name = (r.user?.name ?? "").toLowerCase();
      const email = (r.user?.email ?? "").toLowerCase();
      const company = (r.job?.company ?? "").toLowerCase();
      const title = (r.job?.title ?? "").toLowerCase();
      return name.includes(s) || email.includes(s) || company.includes(s) || title.includes(s);
    });
  }, [rows, search, statusFilter]);

  useEffect(() => {
    if (!detail) return;
    setDetailDraft({
      status: detail.data.status,
      notes: detail.data.notes ?? "",
    });
  }, [detail]);

  const exportCSV = () => {
    const headers = ["Student", "Email", "Company", "Role", "Status", "Updated", "Applied"];
    const lines = [headers.join(",")];

    filtered.forEach((r) => {
      const updated = msAny(r.data.updatedAt);
      const applied = msAny(r.data.appliedAt);
      lines.push(
        [
          JSON.stringify(r.user?.name ?? ""),
          JSON.stringify(r.user?.email ?? ""),
          JSON.stringify(r.job?.company ?? ""),
          JSON.stringify(r.job?.title ?? ""),
          JSON.stringify(r.data.status),
          JSON.stringify(updated ? new Date(updated).toISOString() : ""),
          JSON.stringify(applied ? new Date(applied).toISOString() : ""),
        ].join(","),
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "applications.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const saveDetail = async () => {
    if (!detail) return;
    setDetailSaving(true);
    try {
      await updateDoc(doc(db, "applications", detail.id), {
        status: detailDraft.status,
        notes: detailDraft.notes,
        updatedAt: new Date(),
      } as any);

      toast({ title: "Updated", description: "Application updated" });
    } catch (e: any) {
      toast({
        title: "Update failed",
        description:
          e?.message ??
          "If you see 'insufficient permissions', update Firestore rules to allow TPO edits on institute applications.",
        variant: "destructive",
      });
    } finally {
      setDetailSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">Central institute view from /applications</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search student/company/role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Student</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Company</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Role</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Updated</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-5 py-3.5">Resume</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading applications…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10">
                    <div className="text-center text-sm text-muted-foreground">No applications found.</div>
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((r) => {
                  const updated = msAny(r.data.updatedAt) || msAny(r.data.createdAt);
                  const hasLatex = !!r.data.tailoredResume?.latex;

                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{r.user?.name ?? "(Unnamed)"}</span>
                          {r.user?.email ? <Badge variant="secondary" className="text-[11px]">{r.user.email}</Badge> : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground">{r.job?.company ?? "—"}</td>
                      <td className="px-5 py-4 text-sm text-foreground">{r.job?.title ?? "—"}</td>
                      <td className="px-5 py-4"><StatusBadge status={r.data.status.replaceAll("_", " ")} /></td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{fmtShort(updated)}</td>
                      <td className="px-5 py-4 text-center">
                        {hasLatex ? (
                          <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> LaTeX</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDetailId(r.id)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application detail</DialogTitle>
            <DialogDescription>Joined view from applications + users + jobs.</DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{users.get(detail.data.userId)?.name ?? "(Unnamed)"}</p>
                  <p className="text-xs text-muted-foreground">{users.get(detail.data.userId)?.email ?? ""}</p>
                  <p className="text-sm mt-2 font-medium">{jobs.get(detailJobId)?.company ?? "—"} · {jobs.get(detailJobId)?.title ?? "—"}</p>
                </div>
                <StatusBadge status={detail.data.status.replaceAll("_", " ")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={detailDraft.status} onValueChange={(v: any) => setDetailDraft((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.filter((o) => o.key !== "all").map((o) => (
                        <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Editing requires Firestore rules allowing TPO to update institute applications.</p>
                </div>

                <div className="space-y-2">
                  <Label>Resume</Label>
                  <div className="text-sm">
                    {detail.data.tailoredResume?.latex ? "Tailored LaTeX available" : "No tailored resume yet"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={detailDraft.notes} onChange={(e) => setDetailDraft((p) => ({ ...p, notes: e.target.value }))} rows={6} />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={saveDetail} disabled={detailSaving}>
                  {detailSaving ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</>) : (<><Save className="h-4 w-4 mr-1.5" /> Save</>)}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDetailId(null)}>
                  <X className="h-4 w-4 mr-1.5" /> Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
