from pypdf import PdfReader
import os
for f in ["A1_similar_to_A2.pdf","A2_similar_to_A1.pdf","B_same_meaning.pdf","C_different_topic.pdf"]:
    p = f"C:/EduAssign/ml-service/real_pdfs/{f}"
    t = (PdfReader(p).pages[0].extract_text() or "").strip()
    print("===", f, "len=", len(t), "===")
    print(repr(t[:400]))
    print()