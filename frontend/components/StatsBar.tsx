"use client";

import { BookOpen, Layers, Target, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

const STATS = [
  { icon: Layers,   label: "Architecture", value: "CNN + ResBlocks"  },
  { icon: BookOpen, label: "Dataset",       value: "EMNIST Balanced"  },
  { icon: Target,   label: "Classes",       value: "47 characters"   },
  { icon: Cpu,      label: "Framework",     value: "PyTorch"          },
];

export default function StatsBar({ className }: { className?: string }) {
  return (
    <div className={cn(
      "grid grid-cols-2 sm:grid-cols-4 gap-3",
      className,
    )}>
      {STATS.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 rounded-md",
            "bg-gh-canvas-subtle dark:bg-dark-canvas-subtle",
            "border border-gh-border dark:border-dark-border",
          )}
        >
          <Icon className="w-4 h-4 text-gh-blue dark:text-dark-blue shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gh-fg-muted dark:text-dark-fg-muted truncate">{label}</p>
            <p className="text-xs font-semibold text-gh-fg dark:text-dark-fg truncate">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
