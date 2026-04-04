import { useEffect, useMemo, useState } from "react";
import { Search, StickyNote, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { branches, placementStatuses } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/auth/AuthProvider";
import type { ApplicationDoc, InstituteMemberDoc, UserDoc } from "@/lib/types";
import {
  getUsersByIds,
  watchInstituteApplications,
  watchInstituteMembers,
} from "@/lib/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type StudentRow = {
  uid: string;
  name: string;
  email?: string | null;
  branch: string;
  batch: string;
  cgpa?: number | null;
  status: string;
  notes?: string;
  applications: number;
  offers: number;
};

function statusFromApps(apps: ApplicationDoc[]) {
  const s = new Set(apps.map((a) => a.status));
  if (s.has("joined") || s.has("offer")) return "Placed";
  if (apps.length > 0) return "In Process";
  return "Not Started";
}

export default function Students() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Array<{ id: string; data: InstituteMemberDoc }>>([]);
  const [apps, setApps] = useState<Array<{ id: string; data: ApplicationDoc }>>([]);
  const [users, setUsers] = useState<Map<string, UserDoc>>(new Map());

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  useEffect(() => {
    if (!instituteId) return;
    setLoading(true);

    const unsubMembers = watchInstituteMembers(instituteId, (rows) => {
      setMembers(rows);
      setLoading(false);
    });

    const unsubApps = watchInstituteApplications(instituteId, (rows) => {
      setApps(rows);
    });

    return () => {
      unsubMembers();
      unsubApps();
    };
  }, [instituteId]);

  // fetch user docs for members (names/emails)
  useEffect(() => {
    if (!members.length) return;
    const uids = members.map((m) => m.id);
    (async () => {
      const map = await getUsersByIds(uids);
      setUsers(map);
    })().catch(() => {});
  }, [members]);

  const appsByUser = useMemo(() => {
    const m = new Map<string, ApplicationDoc[]>();
    for (const a of apps) {
      const uid = a.data.userId;
      const arr = m.get(uid) ?? [];
      arr.push(a.data);
      m.set(uid, arr);
    }
    return m;
  }, [apps]);

  const rows = useMemo<StudentRow[]>(() => {
    const out: StudentRow[] = [];

    for (const m of members) {
      if (m.data.role !== "student") continue;

      const u = users.get(m.id);
      const stApps = appsByUser.get(m.id) ?? [];

      const applications = stApps.length;
      const offers = stApps.filter((a) => a.status === "offer" || a.status === "joined").length;

      out.push({
        uid: m.id,
        name: (u?.name as string) || "(Unnamed)",
        email: u?.email ?? null,
        branch: m.data.branch ?? "",
        batch: m.data.batch ?? "",
        cgpa: m.data.cgpa ?? null,
        status: statusFromApps(stApps),
        notes: m.data.tpoNotes ?? "",
        applications,
        offers,
      });
    }

    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [members, users, appsByUser]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((st) => {
      const matchSearch = !s || st.name.toLowerCase().includes(s) || (st.email ?? "").toLowerCase().includes(s);
      const matchBranch = branchFilter === "all" || st.branch === branchFilter;
      const matchStatus = statusFilter === "all" || st.status === statusFilter;
      return matchSearch && matchBranch && matchStatus;
    });
  }, [rows, search, branchFilter, statusFilter]);

  const selected = useMemo(() => (selectedUid ? rows.find((r) => r.uid === selectedUid) ?? null : null), [selectedUid, rows]);

  useEffect(() => {
    if (!selected) return;
    setNotesDraft(selected.notes ?? "");
  }, [selected]);

  const saveNotes = async () => {
    if (!instituteId || !selected) return;
    setNotesSaving(true);
    try {
      await updateDoc(doc(db, "institutes", instituteId, "members", selected.uid), { tpoNotes: notesDraft } as any);
      toast({ title: "Saved", description: "Notes updated" });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Could not save notes", variant: "destructive" });
    } finally {
      setNotesSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pulled from <code>{"/institutes/{instituteId}/members"}</code>
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {placementStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
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
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Branch</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Batch</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-5 py-3.5">CGPA</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">Status</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-5 py-3.5">Apps</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-5 py-3.5">Offers</th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading students…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10">
                    <div className="text-center text-sm text-muted-foreground">No students found for this institute yet.</div>
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((st) => (
                  <tr key={st.uid} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{st.name}</span>
                        {st.email ? <Badge variant="secondary" className="text-[11px]">{st.email}</Badge> : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground">{st.branch || "—"}</td>
                    <td className="px-5 py-4 text-sm text-foreground">{st.batch || "—"}</td>
                    <td className="px-5 py-4 text-sm text-center text-foreground">{st.cgpa ?? "—"}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={st.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-center text-foreground">{st.applications}</td>
                    <td className="px-5 py-4 text-sm text-center text-foreground">{st.offers}</td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUid(st.uid)}>
                        Notes <StickyNote className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelectedUid(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Student Notes</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.email ?? ""}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selected.branch ? <Badge variant="secondary">{selected.branch}</Badge> : null}
                    {selected.batch ? <Badge variant="secondary">Batch {selected.batch}</Badge> : null}
                    {selected.cgpa != null ? <Badge variant="outline">CGPA {selected.cgpa}</Badge> : null}
                  </div>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="space-y-2">
                <Label>Notes (TPO only)</Label>
                <Textarea rows={8} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
              </div>

              <Button size="sm" onClick={saveNotes} disabled={notesSaving}>
                {notesSaving ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</>) : (<><Save className="h-4 w-4 mr-1.5" /> Save notes</>)}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
