"""
EMNIST Recogniser — FastAPI Backend
=====================================
Endpoints:
    GET  /               — health check
    GET  /health         — detailed health
    POST /predict        — base64 image OR multipart file → top-k predictions
    GET  /labels         — returns all 47 class labels

Deployment: Render (see render.yaml)
"""

import base64
import io
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
from pydantic import BaseModel, Field

from model import EMNISTNet, NUM_CLASSES, EMNIST_LABELS, load_model

# ──────────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────
# Configuration from environment
# ──────────────────────────────────────────────────────────────────────────
MODEL_PATH  = os.getenv("MODEL_PATH", "./emnist_net.pth")
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://emnist-recogniser.vercel.app"
).split(",")
TOP_K       = int(os.getenv("TOP_K", "7"))

# EMNIST Balanced normalisation constants
MEAN = 0.1307
STD  = 0.3081

# ──────────────────────────────────────────────────────────────────────────
# App state
# ──────────────────────────────────────────────────────────────────────────
class AppState:
    model:  Optional[EMNISTNet] = None
    device: Optional[torch.device] = None
    ready:  bool = False
    load_time_ms: float = 0.0

state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model at startup, release at shutdown."""
    t0 = time.time()
    state.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log.info(f"Device: {state.device}")

    if not Path(MODEL_PATH).exists():
        log.warning(
            f"Model not found at {MODEL_PATH}. "
            "Run train.py and copy emnist_net.pth here. "
            "Predictions will fail until the model is present."
        )
        state.ready = False
    else:
        try:
            state.model = load_model(MODEL_PATH, state.device)
            state.ready = True
            state.load_time_ms = (time.time() - t0) * 1000
            log.info(f"Model loaded in {state.load_time_ms:.1f} ms")
        except Exception as e:
            log.error(f"Model load failed: {e}")
            state.ready = False

    yield

    log.info("Shutting down — releasing model")
    state.model = None


# ──────────────────────────────────────────────────────────────────────────
# App
# ──────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EMNIST Recogniser API",
    version="1.0.0",
    description="Handwritten character recognition — EMNIST Balanced (47 classes)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────────
# Preprocessing
# ──────────────────────────────────────────────────────────────────────────

def preprocess_image(img: Image.Image) -> torch.Tensor:
    """
    Convert any PIL image to the format expected by EMNISTNet.

    Steps:
    1. Convert to greyscale
    2. Invert (EMNIST: white ink on black background)
    3. Crop to bounding box + padding
    4. Resize to 28×28
    5. Normalise with EMNIST mean/std
    6. Add batch + channel dims → (1, 1, 28, 28)
    """
    img = img.convert("L")                          # greyscale

    # Invert if background is light (canvas drawing is black-on-white)
    arr = np.array(img)
    if arr.mean() > 127:
        img = ImageOps.invert(img)

    # Crop to content bounding box with 4px padding
    bbox = img.getbbox()
    if bbox:
        pad = 4
        bbox = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(img.width,  bbox[2] + pad),
            min(img.height, bbox[3] + pad),
        )
        img = img.crop(bbox)

    # Centre on a square canvas, then resize
    side = max(img.width, img.height)
    square = Image.new("L", (side, side), 0)
    square.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    img = square.resize((28, 28), Image.LANCZOS)

    tensor = torch.tensor(np.array(img), dtype=torch.float32) / 255.0
    tensor = (tensor - MEAN) / STD
    return tensor.unsqueeze(0).unsqueeze(0)          # (1, 1, 28, 28)


def decode_base64_image(data_url: str) -> Image.Image:
    """Accept 'data:image/png;base64,…' or raw base64."""
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    raw = base64.b64decode(data_url)
    return Image.open(io.BytesIO(raw))


# ──────────────────────────────────────────────────────────────────────────
# Inference
# ──────────────────────────────────────────────────────────────────────────

def run_inference(tensor: torch.Tensor, top_k: int = TOP_K) -> list[dict]:
    """Returns top-k predictions as list of {label, confidence, rank}."""
    if not state.ready or state.model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    with torch.no_grad():
        tensor = tensor.to(state.device)
        logits = state.model(tensor)
        probs  = F.softmax(logits, dim=1)[0]

    top_k  = min(top_k, NUM_CLASSES)
    values, indices = torch.topk(probs, top_k)

    return [
        {
            "rank":       rank + 1,
            "label":      EMNIST_LABELS[idx.item()],
            "class_idx":  idx.item(),
            "confidence": round(val.item() * 100, 2),
        }
        for rank, (val, idx) in enumerate(zip(values, indices))
    ]


# ──────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────

class PredictBase64Request(BaseModel):
    image: str = Field(..., description="Base64 data URL (data:image/png;base64,…)")
    top_k: int = Field(default=7, ge=1, le=47)


class Prediction(BaseModel):
    rank:       int
    label:      str
    class_idx:  int
    confidence: float


class PredictResponse(BaseModel):
    predictions:  list[Prediction]
    top_label:    str
    top_conf:     float
    inference_ms: float


# ──────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
async def root():
    return {
        "service": "EMNIST Recogniser API",
        "version": "1.0.0",
        "model_ready": state.ready,
        "classes": NUM_CLASSES,
    }


@app.get("/health", tags=["health"])
async def health():
    return {
        "status":        "ok" if state.ready else "model_not_loaded",
        "model_ready":   state.ready,
        "device":        str(state.device),
        "load_time_ms":  state.load_time_ms,
        "num_classes":   NUM_CLASSES,
    }


@app.get("/labels", tags=["info"])
async def labels():
    """Return all 47 EMNIST Balanced class labels."""
    return {
        "labels": [
            {"index": i, "label": lbl}
            for i, lbl in enumerate(EMNIST_LABELS)
        ]
    }


@app.post("/predict", response_model=PredictResponse, tags=["predict"])
async def predict_base64(body: PredictBase64Request):
    """Predict from a base64 image (canvas drawing or uploaded image)."""
    t0 = time.perf_counter()
    try:
        img    = decode_base64_image(body.image)
        tensor = preprocess_image(img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decode failed: {e}")

    preds = run_inference(tensor, top_k=body.top_k)
    ms    = (time.perf_counter() - t0) * 1000

    return PredictResponse(
        predictions  = preds,
        top_label    = preds[0]["label"],
        top_conf     = preds[0]["confidence"],
        inference_ms = round(ms, 2),
    )


@app.post("/predict/upload", response_model=PredictResponse, tags=["predict"])
async def predict_upload(
    file:  UploadFile = File(..., description="PNG/JPG image of a handwritten character"),
    top_k: int = 7,
):
    """Predict from an uploaded image file."""
    if file.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=415, detail="Unsupported file type. Use PNG or JPEG.")

    t0 = time.perf_counter()
    try:
        raw    = await file.read()
        img    = Image.open(io.BytesIO(raw))
        tensor = preprocess_image(img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing failed: {e}")

    preds = run_inference(tensor, top_k=min(top_k, 47))
    ms    = (time.perf_counter() - t0) * 1000

    return PredictResponse(
        predictions  = preds,
        top_label    = preds[0]["label"],
        top_conf     = preds[0]["confidence"],
        inference_ms = round(ms, 2),
    )
