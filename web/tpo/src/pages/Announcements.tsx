import { useEffect, useMemo, useState } from "react";
import { Plus, Pin, Send, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/auth/AuthProvider";
import type { AnnouncementDoc } from "@/lib/types";
import {
  createAnnouncement,
  broadcastAnnouncementToCandidates,
  toggleAnnouncementPinned,
  watchInstituteAnnouncements,
} from "@/lib/firestore";

function formatDate(d?: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function Announcements() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [composeOpen, setComposeOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ id: string; data: AnnouncementDoc }>>([]);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<AnnouncementDoc["targetType"]>("all");
  const [targetLabel, setTargetLabel] = useState("All Students");
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!instituteId) return;
    setLoading(true);
    const unsub = watchInstituteAnnouncements(instituteId, (rows) => {
      setRows(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [instituteId]);

  const pinnedOnes = useMemo(() => rows.filter((a) => a.data.pinned), [rows]);
  const viewItem = useMemo(() => (viewId ? rows.find((r) => r.id === viewId) ?? null : null), [viewId, rows]);

  const resetCompose = () => {
    setTitle("");
    setMessage("");
    setTargetType("all");
    setTargetLabel("All Students");
    setPinned(false);
  };

  const sendNow = async () => {
    if (!user || !instituteId) return;
    if (!title.trim()) return toast({ title: "Title required", variant: "destructive" });
    if (!message.trim()) return toast({ title: "Message required", variant: "destructive" });

    setSending(true);
    try {
      const payload: Omit<AnnouncementDoc, "instituteId"> = {
        createdBy: user.uid,
        title: title.trim(),
        message: message.trim(),
        targetType,
        targetLabel: targetType === "all" ? "All Students" : targetLabel.trim() || "Targeted",
        pinned,
        scheduledAt: null,
      };

      const announcementId = await createAnnouncement(instituteId, payload);

      // ✅ Send to Candidate app notifications (/users/{uid}/notifications)
      await broadcastAnnouncementToCandidates({
        instituteId,
        announcementId,
        title: payload.title,
        message: payload.message,
        targetType: payload.targetType,
        targetLabel: payload.targetType === "all" ? "" : (payload.targetLabel ?? ""),
        pinned: payload.pinned,
      });

      toast({
        title: "Announcement published",
        description: "Saved and delivered to candidates.",
      });

      setComposeOpen(false);
      resetCompose();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Send failed", description: e?.message ?? "Could not publish.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const togglePinned = async (id: string, current: boolean) => {
    if (!instituteId) return;
    try {
      await toggleAnnouncementPinned(instituteId, id, !current);
      toast({ title: !current ? "Pinned" : "Unpinned" });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Could not update.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Institute announcements (candidates can read later)</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetCompose();
            setComposeOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Announcement
        </Button>
      </div>

      {pinnedOnes.map((a) => (
        <div key={a.id} className="bg-primary/5 border border-primary/15 rounded-xl p-5 flex items-start gap-3">
          <Pin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{a.data.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pinned · {a.data.targetLabel} · {formatDate((a.data as any).createdAt?.toDate?.())}
            </p>
          </div>
          <StatusBadge status="Active" />
        </div>
      ))}

      <div className="bg-card rounded-xl card-shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                {["Title", "Target", "Sent On", "Pinned", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading announcements…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10">
                    <div className="text-center text-sm text-muted-foreground">No announcements yet.</div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{a.data.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{a.data.targetLabel}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate((a.data as any).createdAt?.toDate?.())}</td>
                    <td className="px-5 py-4 text-sm text-foreground">{a.data.pinned ? "Yes" : "No"}</td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setViewId(a.id)}>View</Button>
                      <Button variant="outline" size="sm" className="ml-2" onClick={() => togglePinned(a.id, a.data.pinned)}>
                        <Pin className="w-4 h-4 mr-1.5" /> {a.data.pinned ? "Unpin" : "Pin"}
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Drive instructions" />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Write the announcement…" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Type</Label>
                <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                    <SelectItem value="batch">Batch</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Label</Label>
                <Input value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} placeholder="All Students" />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={pinned} onCheckedChange={(v) => setPinned(Boolean(v))} />
              <span className="text-sm">Pin this announcement</span>
            </label>

            <div className="flex justify-end">
              <Button size="sm" onClick={sendNow} disabled={sending}>
                {sending ? (<><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Sending…</>) : (<><Send className="w-4 h-4 mr-1.5" /> Publish</>)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewItem} onOpenChange={() => setViewId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Announcement</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">{viewItem.data.title}</p>
                <p className="text-xs text-muted-foreground">{viewItem.data.targetLabel} · {formatDate((viewItem.data as any).createdAt?.toDate?.())}</p>
              </div>
              <div className="text-sm whitespace-pre-wrap">{viewItem.data.message}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
