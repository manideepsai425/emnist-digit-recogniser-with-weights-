"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, BarChart2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Prediction } from "@/lib/types";

interface Props {
  predictions:  Prediction[] | null;
  topLabel:     string | null;
  topConf:      number | null;
  inferenceMs:  number | null;
  isLoading:    boolean;
  error:        string | null;
}

// ── Confidence colour ramps ────────────────────────────────────────────────
function barColour(conf: number) {
  if (conf >= 70) return "bg-emerald-500 dark:bg-emerald-400";
  if (conf >= 40) return "bg-amber-500  dark:bg-amber-400";
  return                  "bg-red-500   dark:bg-red-400";
}

function labelColour(conf: number) {
  if (conf >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (conf >= 40) return "text-amber-600  dark:text-amber-400";
  return                  "text-red-600   dark:text-red-400";
}

// ──────────────────────────────────────────────────────────────────────────

export default function PredictionPanel({
  predictions, topLabel, topConf, inferenceMs, isLoading, error,
}: Props) {

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <SkeletonHero />
        {[...Array(5)].map((_, i) => (
          <SkeletonBar key={i} width={`${90 - i * 12}%`} />
        ))}
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        "rounded-lg border border-red-200 dark:border-dark-danger/30",
        "bg-red-50 dark:bg-red-900/10",
      )}>
        <AlertCircle className="w-8 h-8 text-red-500 dark:text-dark-danger" />
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-dark-danger">Prediction failed</p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-1 max-w-[260px]">{error}</p>
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!predictions) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className={cn(
          "flex items-center justify-center w-14 h-14 rounded-full",
          "bg-gh-canvas-subtle dark:bg-dark-canvas-subtle",
          "border border-gh-border dark:border-dark-border",
        )}>
          <BarChart2 className="w-7 h-7 text-gh-fg-subtle dark:text-dark-fg-subtle" />
        </div>
        <div>
          <p className="text-sm font-medium text-gh-fg dark:text-dark-fg">
            No predictions yet
          </p>
          <p className="text-xs text-gh-fg-muted dark:text-dark-fg-muted mt-1">
            Draw or upload a character, then click <strong>Recognise</strong>
          </p>
        </div>
      </div>
    );
  }

  // ── Results ─────────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="results"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-5"
      >
        {/* Hero — top prediction */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-lg",
          "bg-gh-blue/5 dark:bg-dark-blue/10",
          "border border-gh-blue/20 dark:border-dark-blue/30",
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-14 h-14 rounded-lg",
              "bg-gh-blue dark:bg-dark-blue",
              "text-white font-bold text-3xl font-mono",
              "shadow-md",
            )}>
              {topLabel}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gh-fg-muted dark:text-dark-fg-muted">
                Best Match
              </p>
              <p className={cn(
                "text-2xl font-bold font-mono mt-0.5",
                labelColour(topConf ?? 0),
              )}>
                {topConf?.toFixed(1)}%
              </p>
            </div>
          </div>

          {inferenceMs !== null && (
            <div className="flex items-center gap-1.5 text-xs text-gh-fg-subtle dark:text-dark-fg-subtle">
              <Clock className="w-3.5 h-3.5" />
              {inferenceMs.toFixed(1)} ms
            </div>
          )}
        </div>

        {/* Top-k bars */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-gh-fg-muted dark:text-dark-fg-muted" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gh-fg-muted dark:text-dark-fg-muted">
              Top {predictions.length} Predictions
            </h3>
          </div>

          {predictions.map((pred, i) => (
            <motion.div
              key={pred.class_idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="flex items-center gap-3"
            >
              {/* Rank + label */}
              <div className="flex items-center gap-2 w-14 shrink-0">
                <span className="text-xs text-gh-fg-subtle dark:text-dark-fg-subtle w-4 text-right">
                  {pred.rank}
                </span>
                <span className={cn(
                  "font-mono font-bold text-base w-6 text-center",
                  i === 0
                    ? "text-gh-blue dark:text-dark-blue"
                    : "text-gh-fg dark:text-dark-fg",
                )}>
                  {pred.label}
                </span>
              </div>

              {/* Bar */}
              <div className="flex-1 relative h-5 bg-gh-canvas-inset dark:bg-dark-canvas-subtle rounded overflow-hidden">
                <motion.div
                  className={cn("h-full rounded conf-bar", barColour(pred.confidence))}
                  initial={{ width: 0 }}
                  animate={{ width: `${pred.confidence}%` }}
                  transition={{ delay: i * 0.05 + 0.1, duration: 0.4, ease: "easeOut" }}
                />
                {/* Label inside bar if wide enough */}
                {pred.confidence > 15 && (
                  <span className="absolute inset-0 flex items-center pl-2 text-xs font-medium text-white">
                    {pred.confidence.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Conf label outside if narrow */}
              {pred.confidence <= 15 && (
                <span className="text-xs font-mono text-gh-fg-muted dark:text-dark-fg-muted w-10 text-right">
                  {pred.confidence.toFixed(1)}%
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* Class distribution note */}
        <p className="text-xs text-gh-fg-subtle dark:text-dark-fg-subtle text-center pt-1">
          EMNIST Balanced · 47 classes · digits, uppercase & lowercase
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Skeleton components ────────────────────────────────────────────────────

function SkeletonHero() {
  return (
    <div className="h-[82px] rounded-lg shimmer border border-gh-border dark:border-dark-border" />
  );
}

function SkeletonBar({ width }: { width: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-5 rounded shimmer" />
      <div className="flex-1 h-5 rounded shimmer" style={{ maxWidth: width }} />
    </div>
  );
}
