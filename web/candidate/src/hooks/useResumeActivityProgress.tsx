import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ResumeActivityProgressModal, type ResumeActivityStage } from "@/components/ResumeActivityProgressModal";

type ActivityKind = "generate" | "download";

type RunOptions = {
  kind: ActivityKind;
  title?: string;
  description?: string;
};

type State = {
  open: boolean;
  progress: number;
  status: "running" | "success" | "error";
  title: string;
  description: string;
  kind: ActivityKind;
};

const STAGE_MAP: Record<ActivityKind, ResumeActivityStage[]> = {
  generate: [
    { title: "Collect", subtitle: "Loading the selected role and your saved profile context." },
    { title: "Generate", subtitle: "Creating a tailored LaTeX resume for this opportunity." },
    { title: "Store", subtitle: "Saving the tailored resume so it is ready in your tracker." },
  ],
  download: [
    { title: "Prepare", subtitle: "Fetching the latest saved LaTeX resume from your profile." },
    { title: "Compile", subtitle: "Generating the PDF version for download." },
    { title: "Deliver", subtitle: "Opening the finished resume file on your device." },
  ],
};

const TITLE_MAP: Record<ActivityKind, string> = {
  generate: "Generating tailored resume",
  download: "Downloading tailored resume",
};

const DESCRIPTION_MAP: Record<ActivityKind, string> = {
  generate: "Please wait while we prepare the latest tailored resume for this role.",
  download: "Please wait while we prepare and download the latest PDF resume.",
};

export function useResumeActivityProgress() {
  const [state, setState] = useState<State>({
    open: false,
    progress: 0,
    status: "running",
    title: TITLE_MAP.generate,
    description: DESCRIPTION_MAP.generate,
    kind: "generate",
  });
  const intervalRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const stages = useMemo(() => STAGE_MAP[state.kind], [state.kind]);

  const startFakeProgress = useCallback(() => {
    clearTimer();
    intervalRef.current = window.setInterval(() => {
      setState((prev) => {
        if (!prev.open || prev.status !== "running") return prev;
        const current = prev.progress;
        if (current >= 92) return prev;
        const next = current < 30 ? current + 7 : current < 62 ? current + 4 : current + 2;
        return { ...prev, progress: Math.min(92, next) };
      });
    }, 520);
  }, [clearTimer]);

  const runWithProgress = useCallback(async <T,>(options: RunOptions, task: () => Promise<T>) => {
    const kind = options.kind;
    setState({
      open: true,
      progress: 8,
      status: "running",
      title: options.title || TITLE_MAP[kind],
      description: options.description || DESCRIPTION_MAP[kind],
      kind,
    });
    startFakeProgress();
    try {
      const result = await task();
      clearTimer();
      setState((prev) => ({ ...prev, progress: 100, status: "success" }));
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      setState((prev) => ({ ...prev, open: false }));
      return result;
    } catch (error) {
      clearTimer();
      setState((prev) => ({ ...prev, status: "error", open: false, progress: 0 }));
      throw error;
    }
  }, [clearTimer, startFakeProgress]);

  const activeStageIndex = useMemo(() => {
    if (state.status === "success") return stages.length - 1;
    if (state.progress < 34) return 0;
    if (state.progress < 74) return 1;
    return 2;
  }, [state.progress, state.status, stages.length]);

  const modal = (
    <ResumeActivityProgressModal
      open={state.open}
      title={state.title}
      description={state.description}
      progress={state.progress}
      status={state.status}
      stages={stages}
      activeStageIndex={activeStageIndex}
    />
  );

  return { runWithProgress, modal, isRunning: state.open && state.status === "running" };
}
