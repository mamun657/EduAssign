"""Real PDF A vs PDF B cosine via the sidecar. Uses PyPDF2 to extract text,
then POSTs plain text to /embed and computes cosine. This is the EXACT same
pipeline that SimilarityMlClient -> sidecar /embed executes server-side.
"""
import json
import sys
import urllib.request
import math
from pathlib import Path

PDF_DIR = Path(r"C:\EduAssign\ml-service\real_pdfs")
PAIRS = [
    ("A1_similar_to_A2.pdf", "A2_similar_to_A1.pdf"),
    ("A1_similar_to_A2.pdf", "B_same_meaning.pdf"),
    ("A1_similar_to_A2.pdf", "C_different_topic.pdf"),
    ("A2_similar_to_A1.pdf", "B_same_meaning.pdf"),
]

def extract(p: Path) -> str:
    try:
        from pypdf import PdfReader
    except Exception:
        try:
            from PyPDF2 import PdfReader
        except Exception:
            print("NO_LIB", file=sys.stderr); raise
    r = PdfReader(str(p))
    out = []
    for page in r.pages:
        try:
            out.append(page.extract_text() or "")
        except Exception:
            pass
    return "\n".join(out)

def embed(text: str) -> list:
    body = json.dumps({"text": text}).encode("utf-8")
    req = urllib.request.Request(
        "http://localhost:8001/embed",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read().decode("utf-8"))
    return data["embedding"], data.get("dim", 0), data.get("model", "?")

def cosine(a, b) -> float:
    dot = sum(x*y for x, y in zip(a, b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(x*x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)

print("Real PDF cosine via /embed -> cosine")
print("Model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
print("-" * 70)
for a, b in PAIRS:
    pa = PDF_DIR / a
    pb = PDF_DIR / b
    ta = extract(pa)
    tb = extract(pb)
    va, dim, model = embed(ta)
    vb, _, _ = embed(tb)
    c = cosine(va, vb)
    pct = round(c * 100, 1)
    label = (
        "RELATED (expect HIGH ~70-100%)" if pct >= 70
        else "MODERATE  (expect 30-70%)" if pct >= 30
        else "UNRELATED (expect <30%)"
    )
    print(f"{a}")
    print(f"  vs {b}")
    print(f"  cosine = {c:.6f}   {pct}%   [{label}]")
    print(f"  dim={dim}  model={model}")
    print()