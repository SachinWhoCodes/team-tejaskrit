import { AppLayout } from "@/components/layout/AppLayout";
import { SourceBadge } from "@/components/SourceBadge";
import { MatchScore } from "@/components/MatchScore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Briefcase,
  CalendarDays,
  Trophy,
  ExternalLink,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle2,
  Star,
  Video,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { getRankedJobsFeed, generateTailoredLatex } from "@/lib/api";
import { jobIdFromAny, listApplications, listUpcomingEvents } from "@/lib/firestore";
import type { JobSourceKey } from "@/lib/types";
import { sourceLabel } from "@/lib/mappers";
import { toast } from "@/hooks/use-toast";

const activityIcons: Record<string, React.ReactNode> = {
  file: <FileText className="h-4 w-4" />,
  check: <CheckCircle2 className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({ opacity: 1, y: 0, transition: { delay: index * 0.05, duration: 0.3 } }),
};

type RankedJobRow = {
  id: string;
  title: string;
  company: string;
  location?: string;
  jobType?: "Internship" | "Full-time";
  applyUrl?: string;
  source: string;
  visibility?: "public" | "institute" | "private";
  lastSeenAtMs: number;
  finalScore: number;
  reasons: string[];
};

type JobUI = {
  id: string;
  title: string;
  company: string;
  location?: string;
  jobType?: "Internship" | "Full-time";
  applyUrl?: string;
  matchScore: number;
  matchReasons: string[];
  source: ReturnType<typeof sourceLabel>;
  lastSeen: string;
};

function timeAgo(dateMs?: number) {
  if (!dateMs) return "—";
  const diff = Date.now() - dateMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return `${days} days ago`;
}

function toJobUI(job: RankedJobRow): JobUI {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    jobType: job.jobType,
    applyUrl: job.applyUrl,
    matchScore: job.finalScore,
    matchReasons: job.reasons ?? [],
    source: sourceLabel(job.source as JobSourceKey, job.visibility === "institute"),
    lastSeen: timeAgo(job.lastSeenAtMs),
  };
}

export default function Dashboard() {
  const { authUser, userDoc } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { data: rankedFeed, isLoading: feedLoading } = useQuery({
    queryKey: ["rankedJobsFeed", authUser?.uid, userDoc?.instituteId],
    enabled: !!authUser?.uid,
    queryFn: async () => {
      const result = await getRankedJobsFeed(30);
      return result.jobs.map(toJobUI);
    },
    staleTime: 20_000,
  });

  const { data: apps } = useQuery({
    queryKey: ["applications", authUser?.uid],
    enabled: !!authUser?.uid,
    queryFn: () => listApplications(authUser!.uid),
    staleTime: 15_000,
  });

  const { data: upcoming } = useQuery({
    queryKey: ["upcomingEvents", authUser?.uid],
    enabled: !!authUser?.uid,
    queryFn: () => listUpcomingEvents(authUser!.uid, 4),
    staleTime: 15_000,
  });

  const priorityJobs = (rankedFeed ?? []).slice(0, 6);
  const instituteJobs = (rankedFeed ?? []).filter((job) => job.source === "Institute Verified").slice(0, 6);
  const kpis = computeKPIs(rankedFeed ?? [], apps ?? [], upcoming ?? []);

  const recentActivity = (apps ?? []).slice(0, 5).map((application) => ({
    id: application.id,
    text: `Updated: ${String(application.data.status).replace(/_/g, " ")} — ${jobIdFromAny(application.data.jobId)}`,
    time: application.data.updatedAt ? timeAgo((application.data.updatedAt as any).toMillis?.()) : "—",
    icon: application.data.status === "tailored" ? "file" : application.data.status === "applied" ? "check" : "calendar",
  }));

  const onGenerateResumeQuick = async (job: JobUI) => {
    if (!authUser?.uid) return;
    try {
      await generateTailoredLatex({ jobId: job.id, matchScore: job.matchScore, matchReasons: job.matchReasons });
      toast({ title: "Tailored resume generated", description: "LaTeX saved. Download from Resume → Tailored." });
    } catch (error: any) {
      toast({ title: "Failed", description: error?.message ?? "Could not request resume.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="page-container space-y-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-2xl font-bold">
            {greeting}, {(userDoc?.name || authUser?.displayName || "").split(" ")[0] || ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Your placement journey at a glance</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <motion.div key={kpi.label} custom={index} initial="hidden" animate="visible" variants={fadeUp}>
              <Card className="card-elevated p-5 flex items-start gap-4">
                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Priority Opportunities</h2>
            <Link to="/jobs">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {feedLoading ? (
            <Card className="card-elevated p-6 text-sm text-muted-foreground">Loading priority jobs…</Card>
          ) : priorityJobs.length === 0 ? (
            <Card className="card-elevated p-6 text-sm text-muted-foreground">
              No priority jobs yet. Go to Jobs to browse openings and start tracking.
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {priorityJobs.map((job, index) => (
                <motion.div key={job.id} custom={index} initial="hidden" animate="visible" variants={fadeUp}>
                  <Card className="card-elevated p-5 flex flex-col gap-3 h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{job.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {job.company} · {job.location ?? "—"}
                        </p>
                      </div>
                      <MatchScore score={job.matchScore} size="lg" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <SourceBadge source={job.source} />
                      {job.matchReasons.slice(0, 2).map((reason) => (
                        <span key={reason} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {reason}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {job.lastSeen}
                    </p>
                    <div className="flex gap-2 mt-auto pt-2">
                      <Link to="/jobs" className="flex-1">
                        <Button size="sm" variant="outline" className="text-xs w-full">
                          View
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" className="text-xs flex-1 gap-1" onClick={() => onGenerateResumeQuick(job)}>
                        <FileText className="h-3 w-3" /> Resume
                      </Button>
                      <Button size="sm" className="text-xs flex-1 gap-1" onClick={() => job.applyUrl && window.open(job.applyUrl, "_blank")}>
                        <ExternalLink className="h-3 w-3" /> Apply
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {instituteJobs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Institute Verified Drives</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instituteJobs.map((job) => (
                <Card key={job.id} className="card-elevated p-5 border-l-4 border-l-primary space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{job.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {job.company} · {job.location ?? "—"}
                      </p>
                    </div>
                    <MatchScore score={job.matchScore} />
                  </div>
                  <SourceBadge source="Institute Verified" />
                  <Button size="sm" className="text-xs w-full mt-2" onClick={() => job.applyUrl && window.open(job.applyUrl, "_blank")}>
                    View & Apply
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
            <Card className="card-elevated divide-y divide-border">
              {(upcoming ?? []).length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No upcoming OA/Interview events yet.</div>
              ) : (
                (upcoming ?? []).map((item) => (
                  <div key={item.applicationId} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <CalendarDays className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.event.title || item.event.type?.toUpperCase()} — {item.jobId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.event.scheduledAt.toMillis()).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Link to="/tracker">
                      <Button variant="ghost" size="sm" className="text-xs shrink-0">
                        Open
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <Card className="card-elevated divide-y divide-border">
              {recentActivity.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                      {activityIcons[item.icon] || <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{item.text}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function computeKPIs(jobs: JobUI[], apps: Array<{ id: string; data: any }>, upcoming: any[]) {
  const offers = apps.filter((application) => application.data.status === "offer").length;
  const active = apps.filter((application) => ["applied", "oa_scheduled", "interview_scheduled"].includes(application.data.status)).length;
  return [
    { label: "New Matches", value: String(Math.min(jobs.length, 9)), icon: Sparkles, color: "text-primary" },
    { label: "Active Applications", value: String(active), icon: Briefcase, color: "text-info" },
    { label: "Upcoming Events", value: String(upcoming.length), icon: CalendarDays, color: "text-warning" },
    { label: "Offers", value: String(offers), icon: Trophy, color: "text-success" },
  ];
}
