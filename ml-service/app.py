"""EduAssign Pro — ML similarity sidecar.

A small FastAPI service that hosts the
`paraphrase-multilingual-MiniLM-L12-v2` sentence-transformer model and exposes
two endpoints consumed by the .NET backend:

* ``GET  /healthz``     → ``{"ok": true, "model": ..., "loaded": bool, "dim": int}``
* ``POST /embed``       → ``{"embedding": [...], "dim": int, "model": str}``
* ``POST /compare``     → ``{"score": float, "method": "cosine"}`` — convenience

No external LLM API is used. The model runs locally on CPU and is loaded
**once at startup** so that subsequent requests are served from an in-process
singleton.

The model is expected to be present in the local Hugging Face cache. We force
``HF_HUB_OFFLINE=1`` and ``TRANSFORMERS_OFFLINE=1`` so that the loader never
attempts a network round-trip — important on locked-down developer machines.
Text is truncated to a safe length before embedding so that pathological inputs
do not blow up the encoder.
"""
from __future__ import annotations

import logging
import os
import threading
import time
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, conlist

# ---------------------------------------------------------------------------
# Configuration + offline enforcement
# ---------------------------------------------------------------------------

# Pinned in user-supplied spec.
MODEL_NAME = os.environ.get(
    "EDUASSIGN_ML_MODEL",
    "paraphrase-multilingual-MiniLM-L12-v2",
)
# Defensive truncation: MiniLM has a 256-token limit but long submissions can
# be much bigger. We pre-truncate by character count so we never exceed the
# model's effective context. 12 000 chars ≈ ~3 000 tokens for typical prose.
MAX_CHARS = int(os.environ.get("EDUASSIGN_ML_MAX_CHARS", "12000"))

# Force offline loading — the model is shipped via the local HF cache.
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
# Quieter telemetry.
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

logging.basicConfig(
    level=os.environ.get("EDUASSIGN_ML_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
log = logging.getLogger("eduassign.ml")

# ---------------------------------------------------------------------------
# Model container — loaded once at startup, never per-request
# ---------------------------------------------------------------------------


class _ModelHolder:
    """Thin thread-safe wrapper around the SentenceTransformer singleton."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.model = None  # type: ignore[assignment]
        self.dim: Optional[int] = None
        self.error: Optional[str] = None
        self.loaded_at: Optional[float] = None

    def load(self) -> None:
        """Load the model synchronously. Idempotent."""
        with self.lock:
            if self.model is not None:
                return
            t0 = time.time()
            log.info("loading model %s (offline=%s)", MODEL_NAME, os.environ.get("HF_HUB_OFFLINE"))
            try:
                from sentence_transformers import SentenceTransformer

                self.model = SentenceTransformer(MODEL_NAME)
                # Newer API: get_embedding_dimension; older: get_sentence_embedding_dimension.
                dim_fn = getattr(self.model, "get_embedding_dimension", None)
                if not callable(dim_fn):
                    dim_fn = getattr(self.model, "get_sentence_embedding_dimension", None)
                if callable(dim_fn):
                    self.dim = int(dim_fn())
                else:
                    # Probe with a short text.
                    v = self.model.encode(["ok"], normalize_embeddings=True)
                    self.dim = int(np.asarray(v).shape[-1])
                self.loaded_at = time.time()
                log.info(
                    "model %s loaded in %.2fs (dim=%d, device=%s)",
                    MODEL_NAME,
                    self.loaded_at - t0,
                    self.dim,
                    getattr(self.model, "device", "?"),
                )
            except Exception as exc:  # pragma: no cover — depends on environment
                self.error = f"{type(exc).__name__}: {exc}"
                log.exception("failed to load model")
                raise

    def ready(self) -> bool:
        return self.model is not None

    def encode(self, text: str) -> List[float]:
        if self.model is None:
            raise RuntimeError("model not loaded")
        vec = self.model.encode([text], normalize_embeddings=True)
        arr = np.asarray(vec, dtype=np.float32).reshape(-1)
        if arr.size == 0:
            raise RuntimeError("encoder returned empty vector")
        return arr.tolist()


holder = _ModelHolder()


# ---------------------------------------------------------------------------
# Request / response shapes
# ---------------------------------------------------------------------------


class EmbedRequest(BaseModel):
    text: str = Field(..., description="Plain text or extracted submission text.")


class EmbedResponse(BaseModel):
    embedding: List[float]
    dim: int
    model: str


class CompareRequest(BaseModel):
    text_a: str = Field(..., min_length=0, max_length=200_000)
    text_b: str = Field(..., min_length=0, max_length=200_000)


class CompareResponse(BaseModel):
    score: float
    method: str
    model: str


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    if len(a) != len(b):
        # Different dims — defensive, should not happen with one model.
        return 0.0
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    # Vectors are already L2-normalized by sentence-transformers, but be safe.
    return float(np.dot(a, b) / (na * nb))


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="EduAssign ML Sidecar",
    version="1.1.0",
    description="Local sentence-transformer embeddings for similarity scoring.",
)


@app.on_event("startup")
def _on_startup() -> None:
    """Load the model exactly once at startup."""
    try:
        holder.load()
    except Exception as exc:  # pragma: no cover — depends on environment
        # We do NOT crash the process — /embed will return 503.
        log.error("startup model load failed: %s", exc)


@app.get("/healthz")
def healthz() -> dict:
    """Liveness probe.

    Returns ``ok=True`` always so the backend can poll liveness. ``ready``
    indicates whether the encoder is warm and able to serve ``/embed``.
    """
    return {
        "ok": True,
        "model": MODEL_NAME,
        "ready": holder.ready(),
        "dim": holder.dim,
        "loaded_at": holder.loaded_at,
        "error": holder.error,
    }


def _truncate(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    if len(text) > MAX_CHARS:
        log.info("truncating embed input from %d to %d chars", len(text), MAX_CHARS)
        text = text[:MAX_CHARS]
    return text


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    """Encode a single piece of text into a fixed-size embedding vector."""
    if not holder.ready():
        # Never hang, never leak traceback — return 503 with a clean message.
        raise HTTPException(
            status_code=503,
            detail={"error": "Embedding model is not ready", "model": MODEL_NAME},
        )

    text = _truncate(req.text)
    if not text:
        return EmbedResponse(embedding=[], dim=holder.dim or 0, model=MODEL_NAME)

    try:
        vec = holder.encode(text)
    except Exception as exc:
        log.exception("encoding failed")
        raise HTTPException(status_code=500, detail={"error": f"encoding failed: {exc}"}) from exc

    return EmbedResponse(embedding=vec, dim=holder.dim or len(vec), model=MODEL_NAME)


@app.post("/compare", response_model=CompareResponse)
def compare(req: CompareRequest) -> CompareResponse:
    """Embed two texts and return their cosine similarity."""
    if not holder.ready():
        raise HTTPException(
            status_code=503,
            detail={"error": "Embedding model is not ready", "model": MODEL_NAME},
        )

    a = _truncate(req.text_a)
    b = _truncate(req.text_b)
    if not a or not b:
        return CompareResponse(score=0.0, method="cosine", model=MODEL_NAME)

    try:
        va = holder.encode(a)
        vb = holder.encode(b)
    except Exception as exc:
        log.exception("compare failed")
        raise HTTPException(status_code=500, detail={"error": f"compare failed: {exc}"}) from exc

    return CompareResponse(score=_cosine(va, vb), method="cosine", model=MODEL_NAME)


# Convenience: run as `python app.py` for local debug.
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host=os.environ.get("EDUASSIGN_ML_HOST", "127.0.0.1"),
        port=int(os.environ.get("EDUASSIGN_ML_PORT", "8001")),
        reload=False,
        log_level=os.environ.get("EDUASSIGN_ML_LOG_LEVEL", "info").lower(),
    )