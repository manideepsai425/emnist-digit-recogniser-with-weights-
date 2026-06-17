"use client";

import Navbar         from "@/components/Navbar";
import ApiHealthBanner from "@/components/ApiHealthBanner";
import StatsBar       from "@/components/StatsBar";
import InputPanel     from "@/components/InputPanel";
import ResultsPanel   from "@/components/ResultsPanel";
import { cn }         from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gh-canvas dark:bg-dark-canvas">

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <Navbar />

      {/* ── API health warning ──────────────────────────────────────────── */}
      <ApiHealthBanner />

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gh-fg dark:text-dark-fg tracking-tight">
            Handwritten Character Recognition
          </h1>
          <p className="mt-1 text-sm text-gh-fg-muted dark:text-dark-fg-muted">
            Draw or upload a single character — the model identifies it across 47 EMNIST Balanced classes.
          </p>
        </div>

        {/* Stats strip */}
        <StatsBar className="mb-6" />

        {/* ── Two-column layout ──────────────────────────────────────────── */}
        <div className={cn(
          "grid gap-6",
          "grid-cols-1 lg:grid-cols-[1fr_380px]",
        )}>

          {/* Left — input */}
          <section className={cn(
            "rounded-xl border border-gh-border dark:border-dark-border",
            "bg-gh-canvas dark:bg-dark-canvas",
            "shadow-card dark:shadow-card-dark",
            "p-5",
          )}>
            <h2 className="text-sm font-semibold text-gh-fg dark:text-dark-fg mb-4">
              Input
            </h2>
            <InputPanel />
          </section>

          {/* Right — results */}
          <section className={cn(
            "rounded-xl border border-gh-border dark:border-dark-border",
            "bg-gh-canvas dark:bg-dark-canvas",
            "shadow-card dark:shadow-card-dark",
            "p-5",
          )}>
            <ResultsPanel />
          </section>
        </div>

        {/* ── Footer note ────────────────────────────────────────────────── */}
        <p className="mt-8 text-center text-xs text-gh-fg-subtle dark:text-dark-fg-subtle">
          Built with Next.js 14 · FastAPI · PyTorch ·{" "}
          <a
            href="https://www.nist.gov/system/files/documents/srd/nistsd19.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gh-blue dark:text-dark-blue hover:underline"
          >
            EMNIST Balanced dataset
          </a>
        </p>
      </main>
    </div>
  );
}
