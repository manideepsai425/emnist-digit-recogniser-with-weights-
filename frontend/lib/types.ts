// ── API types ──────────────────────────────────────────────────────────────

export interface Prediction {
  rank:       number;
  label:      string;
  class_idx:  number;
  confidence: number;
}

export interface PredictResponse {
  predictions:  Prediction[];
  top_label:    string;
  top_conf:     number;
  inference_ms: number;
}

export interface HealthResponse {
  status:       string;
  model_ready:  boolean;
  device:       string;
  load_time_ms: number;
  num_classes:  number;
}

// ── UI state ───────────────────────────────────────────────────────────────

export type InputMode = "draw" | "upload";

export interface AppStore {
  // Prediction state
  predictions:  Prediction[] | null;
  topLabel:     string | null;
  topConf:      number | null;
  inferenceMs:  number | null;
  isLoading:    boolean;
  error:        string | null;

  // UI
  inputMode:    InputMode;
  darkMode:     boolean;
  apiStatus:    "unknown" | "ok" | "error";

  // Actions
  setInputMode:   (mode: InputMode) => void;
  toggleDarkMode: () => void;
  setPredictions: (res: PredictResponse) => void;
  setLoading:     (v: boolean) => void;
  setError:       (msg: string | null) => void;
  setApiStatus:   (s: "unknown" | "ok" | "error") => void;
  clearResults:   () => void;
}
