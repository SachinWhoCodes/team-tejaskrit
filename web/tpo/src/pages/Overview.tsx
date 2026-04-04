import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Users,
  ClipboardList,
  CalendarClock,
  TrendingUp,
  ShieldCheck,
  Bell,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/auth/AuthProvider";
import type { AnnouncementDoc, ApplicationDoc, InstituteDoc, InstituteMemberDoc, JobDoc } from "@/lib/types";
import {
  jobIdFromAny,
  watchInstitute,
  watchInstituteAnnouncements,
  watchInstituteApplications,
  watchInstituteJobs,
  watchInstituteMembers,
} from "@/lib/firestore";

function msAny(ts: any): number {
  try {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    return 0;
  } catch {
    return 0;
  }
}

function fmtTime(ms: number) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function withinDays(ms: number, days: number) {
  const now = Date.now();
  return ms >= now - days * 24 * 60 * 60 * 1000;
}

export default function Overview() {
  const { profile } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [inst, setInst] = useState<InstituteDoc | null>(null);
  const [jobs, setJobs] = useState<Array<{ id: string; data: JobDoc }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; data: InstituteMemberDoc }>>([]);
  const [apps, setApps] = useState<Array<{ id: string; data: ApplicationDoc }>>([]);
  const [ann, setAnn] = useState<Array<{ id: string; data: AnnouncementDoc }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;
    setLoading(true);

    const u0 = watchInstitute(instituteId, (d) => setInst(d));
    const u1 = watchInstituteJobs(instituteId, (rows) => setJobs(rows));
    const u2 = watchInstituteMembers(instituteId, (rows) => setMembers(rows));
    const u3 = watchInstituteApplications(instituteId, (rows) => {
      setApps(rows);
      setLoading(false);
    });
    const u4 = watchInstituteAnnouncements(instituteId, (rows) => setAnn(rows));

    return () => {
      u0();
      u1();
      u2();
      u3();
      u4();
    };
  }, [instituteId]);

  const totalStudents = useMemo(() => members.filter((m) => m.data.role === "student").length, [members]);

  const activeDrives = useMemo(() => jobs.filter((j) => j.data.status !== "closed").length, [jobs]);

  const appsThisWeek = useMemo(() => {
    return apps.filter((a) => {
      const ms = msAny(a.data.updatedAt) || msAny(a.data.createdAt) || msAny(a.data.appliedAt);
      return withinDays(ms, 7);
    }).length;
  }, [apps]);

  const interviewsScheduled = useMemo(() => apps.filter((a) => a.data.status === "interview_scheduled").length, [apps]);

  const offers = useMemo(() => apps.filter((a) => a.data.status === "offer" || a.data.status === "joined").length, [apps]);

  const joined = useMemo(() => apps.filter((a) => a.data.status === "joined").length, [apps]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return apps
      .map((a) => {
        const t = msAny(a.data.lastEventAt);
        return { id: a.id, data: a.data, when: t };
      })
      .filter((x) => x.when && x.when >= now)
      .sort((a, b) => a.when - b.when)
      .slice(0, 6);
  }, [apps]);

  const recent = useMemo(() => {
    return apps
      .slice()
      .sort((a, b) => (msAny(b.data.updatedAt) || 0) - (msAny(a.data.updatedAt) || 0))
      .slice(0, 8);
  }, [apps]);

  const pinned = useMemo(() => ann.filter((a) => a.data.pinned).slice(0, 1), [ann]);

  const jobById = useMemo(() => {
    const m = new Map<string, JobDoc>();
    for (const j of jobs) m.set(j.id, j.data);
    return m;
  }, [jobs]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {inst?.name ?? "Institute"} · Institute Verified drives, students and applications
          </p>
        </div>
      </div>

      {pinned.map((a) => (
        <div key={a.id} className="bg-primary/5 border border-primary/15 rounded-xl p-5 flex items-start gap-3">
          <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{a.data.title}</p>
            <p className="text-xs text-muted-foreground mt-1">Pinned announcement · {a.data.targetLabel}</p>
          </div>
          <StatusBadge status="Active" />
        </div>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title="Active Drives" value={String(activeDrives)} icon={<Briefcase className="w-5 h-5" />} hint="/jobs (institute)" />
        <KpiCard title="Total Students" value={String(totalStudents)} icon={<Users className="w-5 h-5" />} hint="/institutes/{id}/members" />
        <KpiCard title="Applications (7d)" value={String(appsThisWeek)} icon={<ClipboardList className="w-5 h-5" />} hint="/applications" />
        <KpiCard title="Interviews Scheduled" value={String(interviewsScheduled)} icon={<CalendarClock className="w-5 h-5" />} hint="status=interview_scheduled" />
        <KpiCard title="Offers" value={String(offers)} icon={<TrendingUp className="w-5 h-5" />} hint="offer + joined" />
        <KpiCard title="Joined" value={String(joined)} icon={<ShieldCheck className="w-5 h-5" />} hint="status=joined" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Upcoming Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming OA/interview events tracked yet.</p>
            ) : (
              upcoming.map((u) => {
                const jid = jobIdFromAny(u.data.jobId);
                const job = jobById.get(jid);
                return (
                  <div key={u.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{job?.company ?? "—"} · {job?.title ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{fmtTime(u.when)}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{u.data.status.replaceAll("_", " ")}</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No application activity yet.</p>
            ) : (
              recent.map((a) => {
                const jid = jobIdFromAny(a.data.jobId);
                const job = jobById.get(jid);
                const when = msAny(a.data.updatedAt) || msAny(a.data.createdAt);
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{job?.company ?? "—"} · {job?.title ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">Updated {fmtTime(when)}</p>
                    </div>
                    <StatusBadge status={a.data.status.replaceAll("_", " ")} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  hint: string;
}) {
  return (
    <Card className="card-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
