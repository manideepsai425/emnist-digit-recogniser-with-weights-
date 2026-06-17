"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Sample {
  label:   string;
  dataUrl: string;  // tiny base64 PNGs drawn programmatically
}

interface Props {
  onSelect: (dataUrl: string, label: string) => void;
  className?: string;
}

/**
 * Generates a tiny 28×28 canvas rendering of a character.
 * This avoids shipping binary assets and works identically
 * to what the model expects.
 */
function renderChar(char: string): string {
  const canvas = document.createElement("canvas");
  canvas.width  = 128;
  canvas.height = 128;
  const ctx     = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 128, 128);

  // Black character
  ctx.fillStyle    = "#000000";
  ctx.font         = "bold 92px serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, 64, 68);

  return canvas.toDataURL("image/png");
}

// Sample characters across all 3 groups
const SAMPLES: { group: string; chars: string[] }[] = [
  { group: "Digits",    chars: ["0","1","2","3","4","5","6","7","8","9"] },
  { group: "Uppercase", chars: ["A","B","C","D","E","F","G","H"] },
  { group: "Lowercase", chars: ["a","b","d","e","f","g","h","m"] },
];

export default function SampleGallery({ onSelect, className }: Props) {
  const [activeGroup, setActiveGroup] = useState("Digits");
  const [activeChar,  setActiveChar]  = useState<string | null>(null);

  function handleSelect(char: string) {
    if (typeof window === "undefined") return;
    const dataUrl = renderChar(char);
    setActiveChar(char);
    onSelect(dataUrl, char);
  }

  const group = SAMPLES.find(g => g.group === activeGroup)!;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Group tabs */}
      <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-gh-canvas-inset dark:bg-dark-canvas-subtle border border-gh-border dark:border-dark-border w-fit">
        {SAMPLES.map(g => (
          <button
            key={g.group}
            onClick={() => { setActiveGroup(g.group); setActiveChar(null); }}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-all duration-150",
              activeGroup === g.group
                ? "bg-white dark:bg-dark-canvas border border-gh-border dark:border-dark-border text-gh-fg dark:text-dark-fg shadow-sm"
                : "text-gh-fg-muted dark:text-dark-fg-muted hover:text-gh-fg dark:hover:text-dark-fg",
            )}
          >
            {g.group}
          </button>
        ))}
      </div>

      {/* Character grid */}
      <div className="flex flex-wrap gap-1.5">
        {group.chars.map(char => (
          <button
            key={char}
            onClick={() => handleSelect(char)}
            className={cn(
              "flex items-center justify-center",
              "w-9 h-9 rounded-md border font-mono text-sm font-semibold",
              "transition-all duration-150",
              activeChar === char
                ? "bg-gh-blue dark:bg-dark-blue border-gh-blue dark:border-dark-blue text-white shadow-md scale-105"
                : "bg-gh-canvas dark:bg-dark-canvas border-gh-border dark:border-dark-border text-gh-fg dark:text-dark-fg hover:border-gh-blue dark:hover:border-dark-blue hover:text-gh-blue dark:hover:text-dark-blue",
            )}
            aria-label={`Sample: ${char}`}
            title={`Try "${char}"`}
          >
            {char}
          </button>
        ))}
      </div>

      <p className="text-xs text-gh-fg-subtle dark:text-dark-fg-subtle">
        Click any character to load it as a sample input
      </p>
    </div>
  );
}
