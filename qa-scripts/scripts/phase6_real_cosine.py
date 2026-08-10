"""Real PDF A vs PDF B cosine via sidecar /embed.
Uses real PDF text extracted via PyMuPDF."""
import json, math, urllib.request
from pathlib import Path

TEXTS = json.loads(Path(r"C:\EduAssign\qa-scripts\results\phase6_pdf_texts.json").read_text(encoding="utf-8"))

def embed(text: str):
    body = json.dumps({"text": text}).encode("utf-8")
    req = urllib.request.Request("http://localhost:8001/embed", data=body,
        headers={"Content-Type":"application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))

def cosine(a, b):
    dot = sum(x*y for x,y in zip(a,b))
    na = math.sqrt(sum(x*x for x in a)); nb = math.sqrt(sum(x*x for x in b))
    if na==0 or nb==0: return 0.0
    return dot/(na*nb)

PAIRS = [
    ("A1_similar_to_A2.pdf","A2_similar_to_A1.pdf","RELATED: same topic, paraphrase"),
    ("A1_similar_to_A2.pdf","B_same_meaning.pdf","RELATED: same topic, different wording"),
    ("A1_similar_to_A2.pdf","D_multipage.pdf","RELATED: same topic, longer text"),
    ("A2_similar_to_A1.pdf","D_multipage.pdf","RELATED: same topic, longer text"),
    ("A1_similar_to_A2.pdf","C_different_topic.pdf","UNRELATED: photosynthesis vs French Revolution"),
    ("A1_similar_to_A2.pdf","E_one_line.pdf","UNRELATED: photosynthesis vs 'A short note.'"),
    ("B_same_meaning.pdf","C_different_topic.pdf","UNRELATED"),
    ("D_multipage.pdf","C_different_topic.pdf","UNRELATED"),
]
print("Real PDF text -> sidecar /embed -> cosine")
print("Model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2  (dim=384)")
print("-"*88)
out = []
for a,b,desc in PAIRS:
    ta = TEXTS[a]; tb = TEXTS[b]
    ea = embed(ta)["embedding"]; eb = embed(tb)["embedding"]
    c = cosine(ea, eb)
    pct = round(c*100, 2)
    band = "HIGH >=70%" if pct>=70 else "MODERATE 30-70%" if pct>=30 else "LOW <30%"
    flag = "RELATED" if pct>=70 else "UNRELATED?" if pct<30 else "MODERATE"
    correct = (flag == "RELATED" and "RELATED" in desc) or (flag == "UNRELATED?" and "UNRELATED" in desc)
    print(f"{a}  vs  {b}")
    print(f"   cosine = {c:+.4f}   {pct}%   [{band}]  ({desc})  ->  {'OK' if correct else 'CHECK'}")
    out.append({"a":a,"b":b,"desc":desc,"cosine":c,"pct":pct,"band":band,"expected":flag,"correct":correct})
    print()

Path(r"C:\EduAssign\qa-scripts\results\phase6_real_cosine.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
print("Saved -> phase6_real_cosine.json")
ok = sum(1 for x in out if x["correct"])
print(f"\n{ok}/{len(out)} pairs match the expected HIGH/LOW classification from real PDFs.")