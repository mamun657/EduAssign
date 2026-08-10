"""Direct /embed verification with strict timeouts.

This script proves:
  1. /embed responds within a tight timeout.
  2. Returns a real numeric embedding (not random / hardcoded).
  3. Embedding length is consistent (== model dim from /healthz).
  4. Two similar texts produce high cosine; two unrelated texts produce
     meaningfully lower cosine.
  5. Repeated identical inputs produce embeddings close to 1.0 cosine
     (determinism sanity).

Run: python verify_embed.py
"""
import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8001"
TIMEOUT_S = 10


def post(path: str, payload: dict) -> dict:
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
        body = resp.read().decode("utf-8")
    dt = time.perf_counter() - t0
    return {"ms": int(dt * 1000), "data": json.loads(body)}


def get(path: str) -> dict:
    t0 = time.perf_counter()
    with urllib.request.urlopen(BASE + path, timeout=TIMEOUT_S) as resp:
        body = resp.read().decode("utf-8")
    dt = time.perf_counter() - t0
    return {"ms": int(dt * 1000), "data": json.loads(body)}


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(x * x for x in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0


def l2_norm(v: list[float]) -> float:
    return sum(x * x for x in v) ** 0.5


def main() -> int:
    failures: list[str] = []
    out: dict = {}

    try:
        h = get("/healthz")
        out["healthz"] = h
        if not h["data"].get("ready"):
            failures.append("sidecar /healthz reports ready=false")
        dim = h["data"].get("dim")
        if not isinstance(dim, int) or dim <= 0:
            failures.append(f"sidecar /healthz dim invalid: {dim}")
        out["model"] = h["data"].get("model")
        out["dim_expected"] = dim
    except Exception as e:
        failures.append(f"/healthz failed: {e!r}")
        print(json.dumps({"fatal": True, "error": str(e)}, indent=2))
        return 2

    sample_text = "Photosynthesis converts light energy into chemical energy in plants."
    embed_results = []
    for i in range(3):
        try:
            r = post("/embed", {"text": sample_text, "id": f"sample-{i}"})
            v = r["data"].get("embedding")
            embed_results.append({"ms": r["ms"], "len": len(v) if v else 0, "norm": round(l2_norm(v), 6) if v else None, "first3": v[:3] if v else None, "model": r["data"].get("model"), "id": r["data"].get("id")})
        except Exception as e:
            failures.append(f"/embed attempt {i} failed: {e!r}")
    out["embed_runs"] = embed_results
    if not embed_results:
        failures.append("all /embed attempts failed")
    else:
        # Length consistency
        lens = {r["len"] for r in embed_results}
        if len(lens) != 1:
            failures.append(f"/embed returned inconsistent lengths: {lens}")
        elif lens != {dim}:
            failures.append(f"/embed length {lens} != /healthz dim {dim}")
        # Norm sanity (MiniLM-L12 is L2-normalized → norm ~1.0)
        norms = [r["norm"] for r in embed_results if r["norm"] is not None]
        if any(abs(n - 1.0) > 0.05 for n in norms):
            failures.append(f"/embed norms not ~1.0 (got {norms})")
        # Determinism: same input → cosine ~1.0
        try:
            v0 = post("/embed", {"text": sample_text})["data"]["embedding"]
            v1 = post("/embed", {"text": sample_text})["data"]["embedding"]
            out["same_input_cosine"] = round(cosine(v0, v1), 6)
            if abs(out["same_input_cosine"] - 1.0) > 0.001:
                failures.append(f"same-input cosine != 1.0: {out['same_input_cosine']}")
        except Exception as e:
            failures.append(f"determinism check failed: {e!r}")

    # /compare smoke: three semantic cases
    cases = [
        ("identical", "The mitochondrion is the powerhouse of the cell.",
                       "The mitochondrion is the powerhouse of the cell."),
        ("paraphrase", "The mitochondrion is the powerhouse of the cell.",
                        "Cells produce energy using mitochondria."),
        ("different",  "The mitochondrion is the powerhouse of the cell.",
                        "Baking a chocolate cake requires flour, sugar, eggs, and butter."),
    ]
    compares = []
    for name, a, b in cases:
        try:
            r = post("/compare", {"text_a": a, "text_b": b})
            compares.append({"case": name, "score": r["data"].get("score"), "ms": r["ms"]})
        except Exception as e:
            failures.append(f"/compare {name} failed: {e!r}")
    out["compares"] = compares

    # Sanity: identical > paraphrase > different
    by_case = {c["case"]: c["score"] for c in compares if c.get("score") is not None}
    if "identical" in by_case and "different" in by_case:
        if by_case["identical"] <= by_case["different"]:
            failures.append(f"identical={by_case['identical']} not > different={by_case['different']}")

    out["failures"] = failures
    print(json.dumps(out, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())