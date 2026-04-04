import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { className: string }> = {
  Active: { className: "bg-success/10 text-success border-success/20" },
  Closed: { className: "bg-muted text-muted-foreground border-border" },
  "Deadline Soon": { className: "bg-warning/10 text-warning border-warning/20" },
  Placed: { className: "bg-success/10 text-success border-success/20" },
  "In Process": { className: "bg-info/10 text-info border-info/20" },
  Unplaced: { className: "bg-destructive/10 text-destructive border-destructive/20" },
  "Not Started": { className: "bg-muted text-muted-foreground border-border" },
  Applied: { className: "bg-info/10 text-info border-info/20" },
  OA: { className: "bg-warning/10 text-warning border-warning/20" },
  Interview: { className: "bg-accent/10 text-accent border-accent/20" },
  Offer: { className: "bg-success/10 text-success border-success/20" },
  Rejected: { className: "bg-destructive/10 text-destructive border-destructive/20" },
  Joined: { className: "bg-success/10 text-success border-success/20" },
  "Institute Verified": { className: "bg-primary/10 text-primary border-primary/20" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusConfig[status] || { className: "bg-muted text-muted-foreground border-border" };
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.className, className)}>
      {status}
    </Badge>
  );
}
