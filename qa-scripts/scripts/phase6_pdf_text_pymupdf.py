import fitz
PDF = r"C:\EduAssign\ml-service\real_pdfs"
files = ["A1_similar_to_A2.pdf","A2_similar_to_A1.pdf","B_same_meaning.pdf","C_different_topic.pdf","D_multipage.pdf","E_one_line.pdf"]
texts = {}
for f in files:
    d = fitz.open(f"{PDF}\\{f}")
    t = "\n".join(p.get_text() for p in d).strip()
    texts[f] = t
    print(f"=== {f}  len={len(t)} ===")
    print(t[:300])
    print()

import json
with open(r"C:\EduAssign\qa-scripts\results\phase6_pdf_texts.json","w",encoding="utf-8") as out:
    json.dump(texts, out, indent=2, ensure_ascii=False)
print("Wrote phase6_pdf_texts.json")