import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compress a canvas to a 28x28 greyscale data URL.
 * (Browser-side pre-processing — sends a smaller payload.)
 */
export function canvasToDataURL(
  sourceCanvas: HTMLCanvasElement,
  targetSize = 128   // send at 128px; server resizes to 28px
): string {
  const offscreen = document.createElement("canvas");
  offscreen.width  = targetSize;
  offscreen.height = targetSize;
  const ctx = offscreen.getContext("2d")!;
  ctx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);
  return offscreen.toDataURL("image/png");
}

/**
 * Read a File as a base64 data URL.
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Colour interpolation for confidence bars:
 * low (red) → medium (amber) → high (green)
 */
export function confidenceColour(conf: number): string {
  if (conf >= 70) return "bg-gh-success-emphasis";
  if (conf >= 40) return "bg-amber-500";
  return "bg-gh-danger";
}

export function confidenceColourDark(conf: number): string {
  if (conf >= 70) return "bg-dark-success";
  if (conf >= 40) return "bg-amber-400";
  return "bg-dark-danger";
}
