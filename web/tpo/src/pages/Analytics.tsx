import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/auth/AuthProvider";
import type { ApplicationDoc, InstituteMemberDoc, JobDoc } from "@/lib/types";
import {
  jobIdFromAny,
  watchInstituteApplications,
  watchInstituteJobs,
  watchInstituteMembers,
} from "@/lib/firestore";

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

function normalizeStatus(s: string) {
  const x = (s ?? "").toLowerCase();
  if (x.includes("joined")) return "Joined";
  if (x.includes("offer")) return "Offer";
  if (x.includes("reject")) return "Rejected";
  if (x.includes("interview")) return "Interview";
  if (x.includes("oa")) return "OA";
  if (x.includes("applied")) return "Applied";
  if (x.includes("tailored")) return "Tailored";
  if (x.includes("saved")) return "Saved";
  return "Other";
}

function weekKey(d: Date) {
  const t = new Date(d);
  const day = (t.getDay() + 6) % 7; // Mon=0
  t.setDate(t.getDate() - day);
  t.setHours(0, 0, 0, 0);
  return t.toISOString().slice(0, 10);
}

export default function Analytics() {
  const { profile } = useAuth();
  const instituteId = profile?.instituteId ?? null;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Array<{ id: string; data: InstituteMemberDoc }>>([]);
  const [apps, setApps] = useState<Array<{ id: string; data: ApplicationDoc }>>([]);
  const [jobs, setJobs] = useState<Array<{ id: string; data: JobDoc }>>([]);

  useEffect(() => {
    if (!instituteId) return;
    setLoading(true);

    const u1 = watchInstituteMembers(instituteId, (rows) => setMembers(rows));
    const u2 = watchInstituteApplications(instituteId, (rows) => {
      setApps(rows);
      setLoading(false);
    });
    const u3 = watchInstituteJobs(instituteId, (rows) => setJobs(rows));

    return () => {
      u1();
      u2();
      u3();
    };
  }, [instituteId]);

  const statusPie = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of apps) {
      const k = normalizeStatus(a.data.status);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [apps]);

  const offersByBranch = useMemo(() => {
    const memberByUid = new Map(members.map((m) => [m.id, m.data]));
    const counts = new Map<string, number>();
    for (const a of apps) {
      if (a.data.status !== "offer" && a.data.status !== "joined") continue;
      const branch = memberByUid.get(a.data.userId)?.branch || "Unknown";
      counts.set(branch, (counts.get(branch) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([branch, offers]) => ({ branch, offers }))
      .sort((a, b) => b.offers - a.offers);
  }, [apps, members]);

  const drivesStatus = useMemo(() => {
    const open = jobs.filter((j) => j.data.status !== "closed").length;
    const closed = jobs.filter((j) => j.data.status === "closed").length;
    return [
      { name: "Open", value: open },
      { name: "Closed", value: closed },
    ];
  }, [jobs]);

  const weeklyTrend = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of apps) {
      const ms = msAny(a.data.appliedAt) || msAny(a.data.createdAt) || msAny(a.data.updatedAt);
      if (!ms) continue;
      const wk = weekKey(new Date(ms));
      map.set(wk, (map.get(wk) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([week, applications]) => ({ week, applications }));
  }, [apps]);

  const exportCSV = () => {
    const headers = ["Metric", "Value"];
    const lines = [headers.join(",")];

    lines.push(["Total Students", String(members.filter((m) => m.data.role === "student").length)].join(","));
    lines.push(["Total Drives", String(jobs.length)].join(","));
    lines.push(["Total Applications", String(apps.length)].join(","));
    lines.push(["Offers", String(apps.filter((a) => a.data.status === "offer").length)].join(","));
    lines.push(["Joined", String(apps.filter((a) => a.data.status === "joined").length)].join(","));

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics_summary.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time metrics from /jobs, /applications and institute members</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1.5" /> Export summary
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Applications by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" outerRadius={90} label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Offers by Branch</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={offersByBranch}>
                <XAxis dataKey="branch" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="offers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Drives Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={drivesStatus} dataKey="value" nameKey="name" outerRadius={90} label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-2 mt-3">
              <Badge variant="secondary">Open: {drivesStatus[0].value}</Badge>
              <Badge variant="secondary">Closed: {drivesStatus[1].value}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Weekly Applications Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend}>
                <XAxis dataKey="week" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="applications" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
