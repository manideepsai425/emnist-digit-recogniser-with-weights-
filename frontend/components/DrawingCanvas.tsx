"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Eraser, RotateCcw, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Public handle (parent can call clear / getDataURL) ─────────────────────
export interface CanvasHandle {
  clear:      () => void;
  getDataURL: () => string | null;
  isEmpty:    () => boolean;
}

interface Props {
  onStrokeEnd?: (dataUrl: string) => void;  // called after each stroke lifts
  className?:   string;
}

// ── Internal drawing state ─────────────────────────────────────────────────
interface Point { x: number; y: number; pressure: number }

const CANVAS_SIZE  = 560;   // display size (CSS px) — square
const STROKE_COLOR = "#000000";

// ──────────────────────────────────────────────────────────────────────────

const DrawingCanvas = forwardRef<CanvasHandle, Props>(
  ({ onStrokeEnd, className }, ref) => {
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const historyRef  = useRef<ImageData[]>([]);
    const isDrawing   = useRef(false);
    const lastPoint   = useRef<Point | null>(null);

    const [strokeWidth, setStrokeWidth] = useState(18);
    const [hasStrokes,  setHasStrokes]  = useState(false);

    // ── Canvas context helper ────────────────────────────────────────────
    const ctx = useCallback((): CanvasRenderingContext2D | null => {
      return canvasRef.current?.getContext("2d") ?? null;
    }, []);

    // ── Initialise / reset canvas ────────────────────────────────────────
    const initCanvas = useCallback(() => {
      const c = canvasRef.current;
      const g = ctx();
      if (!c || !g) return;

      // Resolve actual pixel dimensions for HiDPI screens
      const dpr  = window.devicePixelRatio ?? 1;
      c.width    = CANVAS_SIZE * dpr;
      c.height   = CANVAS_SIZE * dpr;
      g.scale(dpr, dpr);

      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      historyRef.current = [];
      setHasStrokes(false);
    }, [ctx]);

    useEffect(() => {
      initCanvas();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Public methods via ref ───────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      clear: () => {
        initCanvas();
      },
      getDataURL: () => {
        return canvasRef.current?.toDataURL("image/png") ?? null;
      },
      isEmpty: () => !hasStrokes,
    }));

    // ── Coordinate helpers ───────────────────────────────────────────────
    function getPoint(
      e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
      pressure = 1
    ): Point {
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;

      let clientX: number, clientY: number;
      if ("touches" in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        clientX  = t.clientX;
        clientY  = t.clientY;
        pressure = (t as PointerEvent & Touch).force ?? 0.5;
      } else {
        clientX  = (e as MouseEvent).clientX;
        clientY  = (e as MouseEvent).clientY;
      }

      return {
        x:        (clientX - rect.left) * scaleX,
        y:        (clientY - rect.top)  * scaleY,
        pressure: Math.max(0.3, Math.min(1.0, pressure)),
      };
    }

    // ── Draw a smooth quad-curve segment ────────────────────────────────
    function drawSegment(g: CanvasRenderingContext2D, from: Point, to: Point) {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;

      g.lineWidth   = strokeWidth * (from.pressure * 0.6 + 0.4);
      g.lineCap     = "round";
      g.lineJoin    = "round";
      g.strokeStyle = STROKE_COLOR;

      g.quadraticCurveTo(from.x, from.y, midX, midY);
      g.stroke();
    }

    // ── Start stroke ─────────────────────────────────────────────────────
    function startStroke(point: Point) {
      const g = ctx();
      if (!g) return;

      // Save snapshot for undo
      const snap = g.getImageData(0, 0, CANVAS_SIZE * (window.devicePixelRatio ?? 1), CANVAS_SIZE * (window.devicePixelRatio ?? 1));
      historyRef.current.push(snap);
      if (historyRef.current.length > 50) historyRef.current.shift();

      g.beginPath();
      g.moveTo(point.x, point.y);

      // Small dot for tap/click without drag
      g.arc(point.x, point.y, strokeWidth * point.pressure * 0.3, 0, Math.PI * 2);
      g.fillStyle = STROKE_COLOR;
      g.fill();
      g.beginPath();
      g.moveTo(point.x, point.y);

      isDrawing.current  = true;
      lastPoint.current  = point;
      setHasStrokes(true);
    }

    // ── Continue stroke ───────────────────────────────────────────────────
    function continueStroke(point: Point) {
      const g = ctx();
      if (!g || !isDrawing.current || !lastPoint.current) return;
      drawSegment(g, lastPoint.current, point);
      lastPoint.current = point;
    }

    // ── End stroke ────────────────────────────────────────────────────────
    function endStroke() {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      lastPoint.current = null;
      ctx()?.beginPath();

      if (onStrokeEnd && canvasRef.current) {
        onStrokeEnd(canvasRef.current.toDataURL("image/png"));
      }
    }

    // ── Undo ─────────────────────────────────────────────────────────────
    function undo() {
      const g = ctx();
      if (!g || historyRef.current.length === 0) return;
      const snap = historyRef.current.pop()!;
      g.putImageData(snap, 0, 0);
      if (historyRef.current.length === 0) setHasStrokes(false);
    }

    // ── Mouse events ──────────────────────────────────────────────────────
    const onMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      startStroke(getPoint(e));
    };
    const onMouseMove = (e: React.MouseEvent) => {
      if (!isDrawing.current) return;
      continueStroke(getPoint(e));
    };
    const onMouseUp = () => endStroke();

    // ── Touch events ──────────────────────────────────────────────────────
    const onTouchStart = (e: React.TouchEvent) => {
      e.preventDefault();
      startStroke(getPoint(e));
    };
    const onTouchMove = (e: React.TouchEvent) => {
      e.preventDefault();
      continueStroke(getPoint(e));
    };
    const onTouchEnd = () => endStroke();

    // ── Keyboard shortcuts ────────────────────────────────────────────────
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "z") {
          e.preventDefault();
          undo();
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    });

    // ──────────────────────────────────────────────────────────────────────
    return (
      <div className={cn("flex flex-col gap-3", className)}>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Stroke width */}
            <button
              onClick={() => setStrokeWidth(w => Math.max(8, w - 4))}
              className={toolBtn}
              aria-label="Decrease stroke"
              title="Thinner"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1.5 px-2 min-w-[48px] justify-center">
              <div
                className="rounded-full bg-gh-fg dark:bg-dark-fg transition-all"
                style={{ width: strokeWidth * 0.8, height: strokeWidth * 0.8, maxWidth: 22, maxHeight: 22 }}
              />
            </div>
            <button
              onClick={() => setStrokeWidth(w => Math.min(32, w + 4))}
              className={toolBtn}
              aria-label="Increase stroke"
              title="Thicker"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Undo */}
            <button
              onClick={undo}
              disabled={!hasStrokes}
              className={cn(toolBtn, "disabled:opacity-40 disabled:cursor-not-allowed")}
              aria-label="Undo last stroke (Ctrl+Z)"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {/* Clear */}
            <button
              onClick={initCanvas}
              disabled={!hasStrokes}
              className={cn(toolBtn, "disabled:opacity-40 disabled:cursor-not-allowed")}
              aria-label="Clear canvas"
              title="Clear"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className={cn(
          "relative rounded-lg overflow-hidden",
          "border-2 border-gh-border dark:border-dark-border",
          "shadow-card dark:shadow-card-dark",
          "transition-all duration-200",
          isDrawing.current && "border-gh-blue dark:border-dark-blue",
        )}>
          <canvas
            ref={canvasRef}
            style={{ width: "100%", aspectRatio: "1 / 1", display: "block" }}
            className="drawing-cursor bg-white"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />

          {/* Empty state overlay */}
          {!hasStrokes && (
            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center",
              "pointer-events-none select-none",
              "text-gh-fg-subtle dark:text-dark-fg-subtle",
            )}>
              <span className="text-5xl mb-3 opacity-25">✍️</span>
              <p className="text-sm font-medium">Draw a character here</p>
              <p className="text-xs mt-1 opacity-70">0–9 · A–Z · a–z</p>
            </div>
          )}
        </div>

        <p className="text-xs text-gh-fg-subtle dark:text-dark-fg-subtle text-center">
          Draw a single character · <kbd className="px-1 py-0.5 rounded bg-gh-canvas-subtle dark:bg-dark-canvas-subtle border border-gh-border dark:border-dark-border font-mono text-[10px]">Ctrl+Z</kbd> to undo
        </p>
      </div>
    );
  }
);

DrawingCanvas.displayName = "DrawingCanvas";
export default DrawingCanvas;

// ── Shared button class ────────────────────────────────────────────────────
const toolBtn = cn(
  "flex items-center justify-center w-7 h-7 rounded",
  "text-gh-fg-muted dark:text-dark-fg-muted",
  "hover:bg-gh-canvas-subtle dark:hover:bg-dark-canvas-subtle",
  "hover:text-gh-fg dark:hover:text-dark-fg",
  "border border-transparent hover:border-gh-border dark:hover:border-dark-border",
  "transition-all duration-150",
);
