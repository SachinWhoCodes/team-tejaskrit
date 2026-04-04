import { motion } from "framer-motion";
import { CheckCircle2, Download, FileText, Loader2, Sparkles } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ResumeActivityStage = {
  title: string;
  subtitle: string;
};

export type ResumeActivityProgressModalProps = {
  open: boolean;
  title: string;
  description: string;
  progress: number;
  status: "running" | "success" | "error";
  stages: ResumeActivityStage[];
  activeStageIndex: number;
};

export function ResumeActivityProgressModal({
  open,
  title,
  description,
  progress,
  status,
  stages,
  activeStageIndex,
}: ResumeActivityProgressModalProps) {
  const Icon = status === "success" ? CheckCircle2 : title.toLowerCase().includes("download") ? Download : FileText;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-lg overflow-hidden border-primary/20 bg-background/95 backdrop-blur [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-x-0 top-0 h-1 origin-left bg-gradient-to-r from-primary/30 via-primary to-primary/30"
        />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-base">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl border",
              status === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-primary/20 bg-primary/10 text-primary"
            )}>
              <Icon className={cn("h-5 w-5", status === "running" && "animate-pulse")} />
            </div>
            <div>
              <p>{title}</p>
              <p className="text-xs font-normal text-muted-foreground mt-1">{description}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-background p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium">
                {status === "success" ? "Completed" : stages[activeStageIndex]?.title || "Working"}
              </span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="mt-3 text-xs text-muted-foreground">
              {status === "success" ? "Everything is ready. Closing this panel…" : stages[activeStageIndex]?.subtitle || description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stages.map((stage, idx) => {
              const isPast = idx < activeStageIndex || status === "success";
              const isActive = idx === activeStageIndex && status === "running";
              return (
                <motion.div
                  key={stage.title}
                  animate={{ y: isActive ? [0, -5, 0] : 0, scale: isActive ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 1.25, repeat: isActive ? Infinity : 0 }}
                  className={cn(
                    "rounded-2xl border p-3 text-center",
                    isPast ? "border-primary/20 bg-primary/10" : "border-border bg-background",
                    isActive && "shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
                  )}
                >
                  <div className="mb-2 flex justify-center">
                    {isPast ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs font-semibold">{stage.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{stage.subtitle}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
