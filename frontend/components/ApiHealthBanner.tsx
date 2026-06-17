"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { checkHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ApiHealthBanner() {
  const { apiStatus, setApiStatus } = useAppStore();

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        const h = await checkHealth();
        if (!cancelled) {
          setApiStatus(h.model_ready ? "ok" : "error");
        }
      } catch {
        if (!cancelled) setApiStatus("error");
      }
    }

    ping();
    const interval = setInterval(ping, 30_000);   // re-check every 30 s
    return () => { cancelled = true; clearInterval(interval); };
  }, [setApiStatus]);

  // Only show a banner for error / not-yet-known
  if (apiStatus === "ok") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "w-full border-b px-4 py-2.5",
          "flex items-center justify-center gap-2",
          "text-xs font-medium",
          apiStatus === "error"
            ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-300"
            : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300",
        )}
      >
        {apiStatus === "error" ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Backend unreachable — make sure the FastAPI server is running on{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
                {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
              </code>
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span>Connecting to API…</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
