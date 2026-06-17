import type { PredictResponse, HealthResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Generic fetch with timeout ─────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 15_000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.detail ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ── Endpoints ─────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

/**
 * Send a base64 data URL (from canvas or FileReader) for prediction.
 */
export async function predictBase64(
  dataUrl: string,
  topK = 7
): Promise<PredictResponse> {
  return apiFetch<PredictResponse>("/predict", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ image: dataUrl, top_k: topK }),
  });
}

/**
 * Send a File object directly (multipart/form-data).
 */
export async function predictUpload(
  file: File,
  topK = 7
): Promise<PredictResponse> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<PredictResponse>(`/predict/upload?top_k=${topK}`, {
    method: "POST",
    body:   form,
  });
}
