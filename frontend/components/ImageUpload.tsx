"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { fileToDataURL } from "@/lib/utils";

interface Props {
  onImageReady: (dataUrl: string, file: File) => void;
  className?:   string;
}

export default function ImageUpload({ onImageReady, className }: Props) {
  const [preview, setPreview]   = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragError, setIsDragError] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[], rejected: { file: File }[]) => {
      setIsDragError(false);

      if (rejected.length > 0) {
        setIsDragError(true);
        return;
      }

      const file = accepted[0];
      if (!file) return;

      const dataUrl = await fileToDataURL(file);
      setPreview(dataUrl);
      setFileName(file.name);
      onImageReady(dataUrl, file);
    },
    [onImageReady]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept:   { "image/png": [], "image/jpeg": [], "image/webp": [] },
      maxFiles: 1,
      maxSize:  5 * 1024 * 1024,   // 5 MB
    });

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    setIsDragError(false);
  }

  const dragError = isDragReject || isDragError;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center",
          "min-h-[220px] rounded-lg border-2 border-dashed",
          "cursor-pointer transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-blue",

          // Default
          !isDragActive && !dragError
            ? "border-gh-border dark:border-dark-border hover:border-gh-blue dark:hover:border-dark-blue bg-gh-canvas-subtle dark:bg-dark-canvas-subtle"
            : "",

          // Drag over
          isDragActive && !dragError
            ? "border-gh-blue dark:border-dark-blue bg-blue-50 dark:bg-blue-900/10"
            : "",

          // Error
          dragError
            ? "border-red-400 dark:border-dark-danger bg-red-50 dark:bg-red-900/10"
            : "",
        )}
      >
        <input {...getInputProps()} />

        {preview ? (
          /* Preview mode */
          <div className="relative flex flex-col items-center gap-3 p-4 w-full">
            <div className="relative w-36 h-36 rounded-md overflow-hidden border border-gh-border dark:border-dark-border bg-white">
              <Image src={preview} alt="Uploaded character" fill className="object-contain p-1" />
            </div>
            <p className="text-sm text-gh-fg dark:text-dark-fg font-medium truncate max-w-[180px]">
              {fileName}
            </p>
            <p className="text-xs text-gh-fg-muted dark:text-dark-fg-muted">
              Click to replace
            </p>
            <button
              onClick={clear}
              className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full bg-gh-canvas-subtle dark:bg-dark-canvas-subtle border border-gh-border dark:border-dark-border text-gh-fg-muted dark:text-dark-fg-muted hover:text-gh-danger dark:hover:text-dark-danger transition-colors"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full",
              dragError
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-gh-canvas-inset dark:bg-dark-canvas-subtle",
            )}>
              {dragError
                ? <X          className="w-6 h-6 text-red-500" />
                : isDragActive
                ? <ImageIcon  className="w-6 h-6 text-gh-blue dark:text-dark-blue" />
                : <Upload     className="w-6 h-6 text-gh-fg-muted dark:text-dark-fg-muted" />
              }
            </div>

            {dragError ? (
              <>
                <p className="text-sm font-medium text-red-600 dark:text-dark-danger">
                  Unsupported file type
                </p>
                <p className="text-xs text-gh-fg-muted dark:text-dark-fg-muted">
                  Please use PNG, JPEG, or WebP
                </p>
              </>
            ) : isDragActive ? (
              <p className="text-sm font-medium text-gh-blue dark:text-dark-blue">
                Drop it!
              </p>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-gh-fg dark:text-dark-fg">
                    Drop an image here
                  </p>
                  <p className="text-xs text-gh-fg-muted dark:text-dark-fg-muted mt-1">
                    or <span className="text-gh-blue dark:text-dark-blue">click to browse</span>
                  </p>
                </div>
                <p className="text-xs text-gh-fg-subtle dark:text-dark-fg-subtle">
                  PNG · JPEG · WebP · max 5 MB
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
