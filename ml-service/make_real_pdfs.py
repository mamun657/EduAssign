"""Generate real PDF fixtures for similarity testing.

This script produces actual PDF files with real text streams. Each PDF is
built from a hand-rolled minimal PDF writer (Catalog → Pages → Page →
Contents → Font) so we have predictable, parseable PDFs without relying
on third-party generators.

Run: python make_real_pdfs.py
Outputs: 6 PDFs in ml-service/real_pdfs/
   - A1_similar_to_A2.pdf
   - A2_similar_to_A1.pdf  (paraphrase of A1)
   - B_same_meaning.pdf    (same meaning as A1, different wording)
   - C_different_topic.pdf (totally unrelated)
   - D_multipage.pdf       (3 pages, contains A1-style content)
   - E_one_line.pdf        (tiny, mostly empty)
"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), "real_pdfs")
os.makedirs(OUT, exist_ok=True)


def make_pdf(pages: list[str]) -> bytes:
    """Build a minimal valid PDF from a list of page-text strings."""
    # Each page has its own Contents stream and Page object.
    # Use a single Font resource (Helvetica).
    objects: list[bytes] = []  # 1-indexed in PDF; objects[0] is unused
    objects.append(b"")  # placeholder for 1-based indexing

    # Object 1: Catalog
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")

    # We need Page objects (one per page) and a Pages tree.
    # Layout:
    #   1: Catalog
    #   2: Pages
    #   3..(2+n): Page
    #   then content streams

    n_pages = len(pages)
    page_obj_ids = list(range(3, 3 + n_pages))
    content_obj_ids = list(range(3 + n_pages, 3 + 2 * n_pages))

    # Object 2: Pages
    kids = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    objects.append(f"<< /Type /Pages /Kids [{kids}] /Count {n_pages} >>".encode("latin-1"))

    # Page objects
    for i, pid in enumerate(page_obj_ids):
        cid = content_obj_ids[i]
        page_obj = (
            f"<< /Type /Page /Parent 2 0 R "
            f"/MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 999 0 R >> >> "
            f"/Contents {cid} 0 R >>"
        )
        objects.append(page_obj.encode("latin-1"))

    # Content streams + Font object
    font_obj_id = 999
    for i, text in enumerate(pages):
        cid = content_obj_ids[i]
        # Build content stream: place text on page at (50, 700)
        # Use BT/ET with Tj operator.
        safe = (
            text.replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)")
        )
        stream = (
            f"BT /F1 11 Tf 50 {700 - i * 20} Td "
            f"({safe}) Tj ET"
        ).encode("latin-1")
        objects.append(
            f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1")
            + stream
            + b"\nendstream"
        )

    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    # Assemble the PDF
    out = bytearray()
    out += b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    offsets: list[int] = [0] * len(objects)  # 1-based, so [0] unused

    for i in range(1, len(objects)):
        offsets[i] = len(out)
        out += f"{i} 0 obj\n".encode("latin-1")
        out += objects[i]
        out += b"\nendobj\n"

    xref_offset = len(out)
    out += f"xref\n0 {len(objects)}\n".encode("latin-1")
    out += b"0000000000 65535 f \n"
    for i in range(1, len(objects)):
        out += f"{offsets[i]:010d} 00000 n \n".encode("latin-1")
    out += f"trailer\n<< /Size {len(objects)} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode("latin-1")

    return bytes(out)


# ------------------------------------------------------------------
# 6 real PDF fixtures
# ------------------------------------------------------------------

A1_TEXT = (
    "Photosynthesis is the process by which green plants and certain other "
    "organisms use sunlight to synthesize foods with the help of chlorophyll. "
    "During this process, plants take in carbon dioxide from the atmosphere "
    "and water from the soil. Using light energy captured by chlorophyll in "
    "the chloroplasts, they convert these raw materials into glucose and "
    "oxygen. The overall chemical equation is 6 CO2 + 6 H2O + light energy "
    "yields C6H12O6 + 6 O2. Photosynthesis sustains virtually all life on "
    "Earth because it produces the oxygen we breathe and forms the base of "
    "nearly every food chain."
)

A2_TEXT = (
    "Photosynthesis is how green plants and some other organisms make their "
    "own food using sunlight. Plants absorb carbon dioxide from the air and "
    "water from the ground. The chlorophyll inside chloroplasts captures "
    "light energy, which powers a reaction that produces glucose and oxygen. "
    "The simplified equation is six CO2 plus six H2O plus light energy gives "
    "C6H12O6 plus six O2. Photosynthesis is critical to life on Earth because "
    "it generates atmospheric oxygen and underpins almost every food chain."
)

B_TEXT = (
    "Plants harness solar energy to manufacture sugars from carbon dioxide "
    "and water. This biological mechanism, carried out in chloroplasts via the "
    "pigment chlorophyll, releases oxygen as a by-product. The general "
    "reaction combines six molecules of CO2 with six of H2O, producing one "
    "glucose molecule and six oxygen molecules. Without this process, "
    "atmospheric oxygen levels would collapse and most food webs would "
    "disintegrate, since producers form their nutritional foundation."
)

C_TEXT = (
    "The French Revolution began in 1789 and resulted from a deep crisis of "
    "the Ancien Régime. Widespread famine, a regressive tax system, and the "
    "influence of Enlightenment philosophers created conditions for popular "
    "uprising. On 14 July 1789, the storming of the Bastille symbolised the "
    "collapse of royal authority. The revolution abolished feudal privileges, "
    "declared universal male suffrage, and established the First Republic. "
    "Its legacy shaped modern democratic thought across Europe and the world."
)

D_PAGE1 = (
    "Photosynthesis is the biological process by which green plants convert "
    "light energy into chemical energy stored in glucose. Plants absorb "
    "carbon dioxide from the atmosphere and water through their roots."
)
D_PAGE2 = (
    "Chlorophyll, the green pigment in chloroplasts, captures photons. This "
    "light energy drives the conversion of CO2 and H2O into glucose and O2. "
    "The overall reaction is 6 CO2 + 6 H2O + light -> C6H12O6 + 6 O2."
)
D_PAGE3 = (
    "Photosynthesis is the foundation of nearly every ecosystem on Earth. It "
    "produces atmospheric oxygen and feeds both plants and the animals that "
    "eat them. Without photosynthesis, complex life as we know it could not "
    "exist."
)

E_TEXT = "A short note."

fixtures = [
    ("A1_similar_to_A2.pdf", [A1_TEXT]),
    ("A2_similar_to_A1.pdf", [A2_TEXT]),
    ("B_same_meaning.pdf", [B_TEXT]),
    ("C_different_topic.pdf", [C_TEXT]),
    ("D_multipage.pdf", [D_PAGE1, D_PAGE2, D_PAGE3]),
    ("E_one_line.pdf", [E_TEXT]),
]

for name, pages in fixtures:
    path = os.path.join(OUT, name)
    with open(path, "wb") as f:
        f.write(make_pdf(pages))
    print(f"WROTE {name}: {os.path.getsize(path)} bytes, {len(pages)} page(s)")

print("\nAll fixtures in:", OUT)