"use client";

import { create } from "zustand";
import type { AppStore, PredictResponse } from "./types";

export const useAppStore = create<AppStore>((set) => ({
  // ── State ────────────────────────────────────────────────────────────────
  predictions:  null,
  topLabel:     null,
  topConf:      null,
  inferenceMs:  null,
  isLoading:    false,
  error:        null,
  inputMode:    "draw",
  darkMode:     false,
  apiStatus:    "unknown",

  // ── Actions ──────────────────────────────────────────────────────────────
  setInputMode:   (mode) => set({ inputMode: mode }),

  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next);
      }
      return { darkMode: next };
    }),

  setPredictions: (res: PredictResponse) =>
    set({
      predictions:  res.predictions,
      topLabel:     res.top_label,
      topConf:      res.top_conf,
      inferenceMs:  res.inference_ms,
      isLoading:    false,
      error:        null,
    }),

  setLoading: (v) => set({ isLoading: v, error: null }),

  setError: (msg) => set({ error: msg, isLoading: false }),

  setApiStatus: (s) => set({ apiStatus: s }),

  clearResults: () =>
    set({
      predictions:  null,
      topLabel:     null,
      topConf:      null,
      inferenceMs:  null,
      error:        null,
    }),
}));
