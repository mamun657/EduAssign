"""Phase 6 verification — PDF text → embedding → cosine similarity.

Hand-rolls minimal valid PDFs (single object per page, simple xref table)
and runs the full pipeline end-to-end via the sidecar's /embed endpoint.
"""
import os
import time
import json
import urllib.request

import pypdf

SIDE = os.environ.get("EDUASSIGN_ML_URL", "http://127.0.0.1:8001")


def _esc(s):
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(path, pages_text):
    """Create a minimal valid PDF with given text per page.

    The structure is intentionally simple: 1 Catalog, N Pages, N Page
    objects, 1 Contents stream, 1 Font, 1 xref table.
    """
    # Build content stream (concatenated per-page text drawing commands).
    page_streams = []
    for lines in pages_text:
        cmds = []
        cmds.append("BT")
        cmds.append("/F1 12 Tf")
        cmds.append("50 780 Td")
        for i, line in enumerate(lines):
            if i > 0:
                cmds.append("0 -14 Td")  # newline
            cmds.append(f"({_esc(line)}) Tj")
        cmds.append("ET")
        page_streams.append("\n".join(cmds).encode("latin-1", "replace"))

    n_pages = len(pages_text)
    objects = []  # list of bytes, index = object number (1-based)

    def add(obj_bytes):
        objects.append(obj_bytes)
        return len(objects)  # 1-based id

    # 1: Catalog
    catalog_id = add(b"<< /Type /Catalog /Pages 2 0 R >>")
    # 2: Pages
    pages_kids = " ".join(f"{catalog_id + 2 + i} 0 R" for i in range(n_pages))
    pages_id = add(f"<< /Type /Pages /Kids [ {pages_kids} ] /Count {n_pages} >>".encode("latin-1"))
    # 3..N: Page objects
    page_ids = []
    next_id = len(objects) + 1
    for i, _ in enumerate(pages_text):
        content_obj_id = next_id + n_pages + i  # contents come after all pages
        pid = next_id + i
        page_ids.append(pid)
        obj = (
            f"<< /Type /Page /Parent {pages_id} 0 R "
            f"/MediaBox [ 0 0 595 842 ] "
            f"/Resources << /Font << /F1 {next_id + 2 * n_pages} 0 R >> >> "
            f"/Contents {content_obj_id} 0 R >>"
        )
        objects.append(obj.encode("latin-1"))
    # contents
    content_ids = []
    for i, stream in enumerate(page_streams):
        cid = next_id + n_pages + i
        content_ids.append(cid)
        obj = (
            f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1")
            + stream
            + b"\nendstream"
        )
        objects.append(obj)
    # font
    font_id = next_id + 2 * n_pages
    objects.append(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    )

    # Now serialize with xref.
    out = bytearray()
    out += b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode("latin-1")
        out += obj
        out += b"\nendobj\n"
    xref_off = len(out)
    out += b"xref\n"
    out += f"0 {len(objects)+1}\n".encode("latin-1")
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode("latin-1")
    out += b"trailer\n"
    out += f"<< /Size {len(objects)+1} /Root {catalog_id} 0 R >>\n".encode("latin-1")
    out += b"startxref\n"
    out += f"{xref_off}\n".encode("latin-1")
    out += b"%%EOF\n"

    with open(path, "wb") as f:
        f.write(out)


def extract_text(path):
    reader = pypdf.PdfReader(path)
    return [(i + 1, (page.extract_text() or "").strip()) for i, page in enumerate(reader.pages)]


def call_embed(text):
    body = json.dumps({"text": text}).encode("utf-8")
    req = urllib.request.Request(
        f"{SIDE}/embed", data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def cosine(a, b):
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(x * x for x in b) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "verify_pdfs")
    os.makedirs(out_dir, exist_ok=True)

    pdfs = {
        "a_newton.pdf": [
            [
                "Newton's second law of motion states that the acceleration",
                "of a body is directly proportional to the net force acting",
                "upon it and inversely proportional to its mass. In equation",
                "form, F equals m times a.",
            ]
        ],
        "b_newton_paraphrase.pdf": [
            [
                "The acceleration of an object depends on the net force",
                "acting on the object and the mass of the object. The",
                "acceleration is proportional to the net force and inversely",
                "proportional to the mass. Formally: F equals m times a.",
            ]
        ],
        "c_photosynthesis.pdf": [
            [
                "Photosynthesis is the process used by plants to convert",
                "light energy into chemical energy stored in glucose.",
                "Chlorophyll in the leaves absorbs sunlight, and carbon",
                "dioxide combines with water to produce sugar and oxygen.",
            ]
        ],
        "d_multipage_newton.pdf": [
            ["Chapter 1: Newton's second law.", "F equals m times a."],
            ["Chapter 2: Examples.", "A heavier object needs more force to accelerate at the same rate."],
            ["Chapter 3: Implications.", "Momentum is conserved in closed systems."],
        ],
        "e_cooking.pdf": [
            [
                "How to bake sourdough bread at home.",
                "Mix flour, water, salt and a sourdough starter. Knead",
                "for ten minutes. Let it rise overnight. Bake at 230 C",
                "for 35 minutes in a Dutch oven.",
            ]
        ],
    }

    for name, pages in pdfs.items():
        make_pdf(os.path.join(out_dir, name), pages)
    print(f"Created {len(pdfs)} PDFs in {out_dir}", flush=True)

    for name in pdfs:
        path = os.path.join(out_dir, name)
        pages = extract_text(path)
        total = sum(len(t) for _, t in pages)
        print(f"  {name}: {len(pages)} page(s), {total} chars extracted", flush=True)

    cases = [
        ("a_vs_b  (highly similar / paraphrase)", "a_newton.pdf", "b_newton_paraphrase.pdf"),
        ("a_vs_c  (clearly different topic)", "a_newton.pdf", "c_photosynthesis.pdf"),
        ("a_vs_a  (identical)", "a_newton.pdf", "a_newton.pdf"),
        ("a_vs_e  (unrelated cooking)", "a_newton.pdf", "e_cooking.pdf"),
        ("a_vs_d  (multi-page same theme)", "a_newton.pdf", "d_multipage_newton.pdf"),
    ]

    print("\n--- Real PDF similarity (text extract -> /embed -> cosine) ---\n", flush=True)
    for name, xn, yn in cases:
        xt = "\n".join(t for _, t in extract_text(os.path.join(out_dir, xn))).strip()
        yt = "\n".join(t for _, t in extract_text(os.path.join(out_dir, yn))).strip()
        if not xt or not yt:
            print(f"  {name}: EMPTY text (x={len(xt)} y={len(yt)})", flush=True)
            continue
        t0 = time.time()
        vx = call_embed(xt)["embedding"]
        vy = call_embed(yt)["embedding"]
        dt = time.time() - t0
        score = cosine(vx, vy)
        pct = round(score * 100, 2)
        flag = " HIGH" if pct >= 70 else (" MOD" if pct >= 30 else " LOW")
        print(f"  {name}: cosine={score:.4f}  ({pct}%)  [{flag}]  t={dt:.2f}s", flush=True)

    print("\nDONE", flush=True)


if __name__ == "__main__":
    main()
