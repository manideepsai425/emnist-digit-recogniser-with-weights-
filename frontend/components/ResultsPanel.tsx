"use client";

import { Info } from "lucide-react";
import { useAppStore } from "@/lib/store";
import PredictionPanel from "./PredictionPanel";
import { cn } from "@/lib/utils";

export default function ResultsPanel() {
  const { predictions, topLabel, topConf, inferenceMs, isLoading, error } =
    useAppStore();

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Panel header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gh-fg dark:text-dark-fg">
          Results
        </h2>
        {predictions && (
          <span className="text-xs text-gh-fg-subtle dark:text-dark-fg-subtle flex items-center gap-1">
            <Info className="w-3 h-3" />
            47 classes evaluated
          </span>
        )}
      </div>

      {/* Prediction content */}
      <div className={cn(
        "flex-1 rounded-lg border border-gh-border dark:border-dark-border",
        "bg-gh-canvas dark:bg-dark-canvas",
        "p-4 overflow-y-auto",
        "min-h-[420px]",
      )}>
        <PredictionPanel
          predictions={predictions}
          topLabel={topLabel}
          topConf={topConf}
          inferenceMs={inferenceMs}
          isLoading={isLoading}
          error={error}
        />
      </div>

      {/* Info footer */}
      <div className={cn(
        "rounded-md p-3",
        "bg-gh-canvas-subtle dark:bg-dark-canvas-subtle",
        "border border-gh-border dark:border-dark-border",
        "text-xs text-gh-fg-muted dark:text-dark-fg-muted",
      )}>
        <p className="font-medium text-gh-fg dark:text-dark-fg mb-1">About this model</p>
        <p>
          Trained on <strong>EMNIST Balanced</strong> (~112 K samples, 47 balanced classes).
          CNN with residual blocks, BatchNorm, and OneCycleLR.
          Targets ≥ 88 % validation accuracy.
        </p>
      </div>
    </div>
  );
}
