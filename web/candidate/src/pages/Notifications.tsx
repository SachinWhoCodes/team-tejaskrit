import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CalendarDays,
  Megaphone,
  RefreshCw,
  Star,
  ArrowRight,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/firestore";
import type { NotificationDoc } from "@/lib/types";

const typeIcons: Record<string, React.ReactNode> = {
  match: <Star className="h-4 w-4" />,
  reminder: <CalendarDays className="h-4 w-4" />,
  announcement: <Megaphone className="h-4 w-4" />,
  update: <RefreshCw className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  match: "bg-primary/10 text-primary",
  reminder: "bg-warning/10 text-warning",
  announcement: "bg-accent text-accent-foreground",
  update: "bg-info/10 text-info",
};

function fmt(ts: any) {
  try {
    if (!ts?.toMillis) return "";
    const d = new Date(ts.toMillis());
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function resolveCta(n: NotificationDoc): { label?: string; url?: string } {
  const url = n.related?.url
    ? n.related.url
    : n.related?.applicationId
      ? "/tracker"
      : n.related?.jobId
        ? "/jobs"
        : undefined;

  const label = n.related?.url
    ? "Open"
    : n.related?.applicationId
      ? "Open Tracker"
      : n.related?.jobId
        ? "View Jobs"
        : undefined;

  return { label, url };
}

export default function Notifications() {
  const { authUser } = useAuth();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["notifications", authUser?.uid],
    enabled: !!authUser?.uid,
    queryFn: () => listUserNotifications(authUser!.uid, 200),
    staleTime: 15_000,
  });

  const notifications = useMemo(() => (rows ?? []).map((r) => ({ id: r.id, data: r.data })), [rows]);
  const unread = useMemo(() => notifications.filter((n) => !n.data.read).length, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread" && n.data.read) return false;
      if (typeFilter !== "all" && n.data.type !== typeFilter) return false;
      return true;
    });
  }, [notifications, filter, typeFilter]);

  const markRead = async (id: string, n: NotificationDoc) => {
    if (!authUser?.uid) return;
    if (n.read) return;
    await markNotificationRead(authUser.uid, id);
    qc.invalidateQueries({ queryKey: ["notifications", authUser.uid] });
  };

  const markAll = async () => {
    if (!authUser?.uid) return;
    await markAllNotificationsRead(authUser.uid);
    qc.invalidateQueries({ queryKey: ["notifications", authUser.uid] });
  };

  return (
    <AppLayout>
      <div className="page-container max-w-3xl">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">{unread} unread notifications</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1"
            onClick={markAll}
            disabled={!authUser?.uid || unread === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unread})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-1.5 ml-auto flex-wrap">
            {["all", "match", "reminder", "announcement", "update"].map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                className="text-xs capitalize h-7 px-2.5"
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? "All Types" : t}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Card className="card-elevated p-8 text-sm text-muted-foreground">Loading notifications…</Card>
        ) : filtered.length === 0 ? (
          <Card className="card-elevated p-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notifications to show</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((row, i) => {
              const n = row.data;
              const { label, url } = resolveCta(n);

              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={`card-elevated p-4 flex items-start gap-3 ${!n.read ? "border-l-2 border-l-primary" : ""}`}
                    onMouseEnter={() => markRead(row.id, n)}
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${typeColors[n.type]}`}
                    >
                      {typeIcons[n.type]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                        </div>
                        {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-muted-foreground">{fmt(n.createdAt)}</span>
                        {label && url ? (
                          <Link to={url} onClick={() => markRead(row.id, n)}>
                            <Button variant="ghost" size="sm" className="text-xs h-6 px-2 gap-1">
                              {label} <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
