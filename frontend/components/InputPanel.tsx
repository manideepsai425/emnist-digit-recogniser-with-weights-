"use client";

import { useRef, useState, useCallback } from "react";
import { Pencil, Upload, Sparkles, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import DrawingCanvas, { type CanvasHandle } from "./DrawingCanvas";
import ImageUpload from "./ImageUpload";
import SampleGallery from "./SampleGallery";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { predictBase64 } from "@/lib/api";
import { fileToDataURL } from "@/lib/utils";

type Tab = "draw" | "upload";

export default function InputPanel() {
  const canvasRef  = useRef<CanvasHandle>(null);
  const [tab, setTab]               = useState<Tab>("draw");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const { isLoading, setLoading, setPredictions, setError, clearResults } =
    useAppStore();

  // ── Handle upload ready ──────────────────────────────────────────────────
  const onImageReady = useCallback((dataUrl: string, _file: File) => {
    setUploadedUrl(dataUrl);
    clearResults();
  }, [clearResults]);

  // ── Handle sample selection ──────────────────────────────────────────────
  const onSampleSelect = useCallback((dataUrl: string, label: string) => {
    setUploadedUrl(dataUrl);
    setTab("upload");
    clearResults();
    toast(`Sample "${label}" loaded`, { icon: "📋" });
  }, [clearResults]);

  // ── Recognise ────────────────────────────────────────────────────────────
  async function handleRecognise() {
    let dataUrl: string | null = null;

    if (tab === "draw") {
      if (!canvasRef.current || canvasRef.current.isEmpty()) {
        toast.error("Draw something first!");
        return;
      }
      dataUrl = canvasRef.current.getDataURL();
    } else {
      if (!uploadedUrl) {
        toast.error("Upload an image first!");
        return;
      }
      dataUrl = uploadedUrl;
    }

    if (!dataUrl) return;

    setLoading(true);
    try {
      const result = await predictBase64(dataUrl, 7);
      setPredictions(result);
      toast.success(`Recognised: "${result.top_label}" (${result.top_conf.toFixed(1)}%)`, {
        icon: "🎯",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Prediction failed";
      setError(msg);
      toast.error(msg);
    }
  }

  // ── Clear ────────────────────────────────────────────────────────────────
  function handleClear() {
    if (tab === "draw") {
      canvasRef.current?.clear();
    } else {
      setUploadedUrl(null);
    }
    clearResults();
  }

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* Tab switcher */}
      <div className="flex gap-0.5 p-0.5 rounded-lg bg-gh-canvas-inset dark:bg-dark-canvas-subtle border border-gh-border dark:border-dark-border">
        {(["draw", "upload"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); clearResults(); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md",
              "text-sm font-medium transition-all duration-150",
              tab === t
                ? "bg-white dark:bg-dark-canvas shadow-sm border border-gh-border dark:border-dark-border text-gh-fg dark:text-dark-fg"
                : "text-gh-fg-muted dark:text-dark-fg-muted hover:text-gh-fg dark:hover:text-dark-fg",
            )}
          >
            {t === "draw"
              ? <Pencil className="w-3.5 h-3.5" />
              : <Upload className="w-3.5 h-3.5" />
            }
            {t === "draw" ? "Draw" : "Upload"}
          </button>
        ))}
      </div>

      {/* Active input */}
      {tab === "draw"
        ? <DrawingCanvas ref={canvasRef} className="w-full" />
        : <ImageUpload onImageReady={onImageReady} className="w-full" />
      }

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleRecognise}
          disabled={isLoading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2",
            "px-4 py-2.5 rounded-md",
            "text-sm font-semibold text-white",
            "bg-gh-blue dark:bg-dark-blue",
            "hover:bg-blue-700 dark:hover:bg-blue-500",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "transition-all duration-150",
            "shadow-btn",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-blue focus-visible:ring-offset-2",
          )}
        >
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Recognising…</>
            : <><Sparkles className="w-4 h-4" /> Recognise</>
          }
        </button>

        <button
          onClick={handleClear}
          disabled={isLoading}
          className={cn(
            "px-4 py-2.5 rounded-md",
            "text-sm font-medium",
            "text-gh-fg dark:text-dark-fg",
            "bg-gh-canvas dark:bg-dark-canvas",
            "border border-gh-border dark:border-dark-border",
            "hover:bg-gh-canvas-subtle dark:hover:bg-dark-canvas-subtle",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "transition-all duration-150",
            "shadow-btn",
          )}
        >
          Clear
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gh-border dark:bg-dark-border" />
        <span className="text-xs text-gh-fg-subtle dark:text-dark-fg-subtle font-medium">
          Try a sample
        </span>
        <div className="flex-1 h-px bg-gh-border dark:bg-dark-border" />
      </div>

      {/* Sample gallery */}
      <SampleGallery onSelect={onSampleSelect} />
    </div>
  );
}
