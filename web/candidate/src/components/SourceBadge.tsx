import { Shield, Globe, MessageCircle, Puzzle, PenLine } from "lucide-react";
import type { JobSourceLabel } from "@/lib/mappers";

function badgeClass(source: JobSourceLabel) {
  switch (source) {
    case "Institute Verified":
      return "badge-institute";
    case "Career Page":
      return "badge-scraped";
    case "Telegram":
      return "badge-telegram";
    case "Extension":
      return "badge-extension";
    case "Manual":
      return "badge-manual";
  }
}

export function SourceBadge({ source }: { source: JobSourceLabel }) {
  const icons: Record<JobSourceLabel, React.ReactNode> = {
    "Institute Verified": <Shield className="h-3 w-3" />,
    "Career Page": <Globe className="h-3 w-3" />,
    Telegram: <MessageCircle className="h-3 w-3" />,
    Extension: <Puzzle className="h-3 w-3" />,
    Manual: <PenLine className="h-3 w-3" />,
  };

  return (
    <span className={badgeClass(source)}>
      {icons[source]}
      {source}
    </span>
  );
}
