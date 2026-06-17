"use client";

import { Moon, Sun, Github, Cpu } from "lucide-react";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { darkMode, toggleDarkMode, apiStatus } = useAppStore();

  // Persist dark mode preference
  useEffect(() => {
    localStorage.setItem("emnist-dark-mode", String(darkMode));
  }, [darkMode]);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full",
      "bg-gh-canvas/95 dark:bg-dark-canvas/95 backdrop-blur-sm",
      "border-b border-gh-border dark:border-dark-border",
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[57px]">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-gh-blue dark:bg-dark-blue">
              <Cpu className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-semibold text-base text-gh-fg dark:text-dark-fg tracking-tight">
              EMNIST Recogniser
            </span>

            {/* API status pill */}
            <span className={cn(
              "hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
              "text-xs font-medium border",
              apiStatus === "ok"
                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                : apiStatus === "error"
                ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                : "bg-gh-canvas-subtle border-gh-border text-gh-fg-muted dark:bg-dark-canvas-subtle dark:border-dark-border dark:text-dark-fg-muted"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                apiStatus === "ok"    ? "bg-green-500"  :
                apiStatus === "error" ? "bg-red-500"    :
                                        "bg-gray-400"
              )} />
              {apiStatus === "ok" ? "API live" : apiStatus === "error" ? "API offline" : "Connecting…"}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md",
                "text-sm text-gh-fg-muted dark:text-dark-fg-muted",
                "hover:bg-gh-canvas-subtle dark:hover:bg-dark-canvas-subtle",
                "hover:text-gh-fg dark:hover:text-dark-fg",
                "transition-colors duration-150",
              )}
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>

            <button
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md",
                "text-gh-fg-muted dark:text-dark-fg-muted",
                "hover:bg-gh-canvas-subtle dark:hover:bg-dark-canvas-subtle",
                "hover:text-gh-fg dark:hover:text-dark-fg",
                "transition-colors duration-150",
              )}
            >
              {darkMode
                ? <Sun  className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
