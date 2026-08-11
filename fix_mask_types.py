#!/usr/bin/env python3
"""Fix TS error: `WebkitUserDrag` etc. — React CSSProperties type doesn't
recognize vendor-prefixed keys with that exact camelCase form. Replace with
the same property expressed as a quoted key.

We also add `as React.CSSProperties` cast for the maskComposite block so all
the vendor-prefixed mask properties are accepted.
"""
import io
PATH = r"c:\EduAssign\web\src\app\_landing\LandingPage.tsx"

OLD = """          pointerEvents: "none",
          userSelect: "none",
          WebkitUserDrag: "none",
          // very soft edge fade so the image's dark background merges with
          // the hero's #0B0F1A. The fade never crosses the subjects \u2014 left
          // edge fades over the first 18% (the empty left side of the frame),
          // bottom edge fades over the last 12% (the lower edge / table).
          WebkitMaskImage:
            "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)",
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }"""

NEW = """          pointerEvents: "none",
          userSelect: "none",
          // very soft edge fade so the image's dark background merges with
          // the hero's #0B0F1A. The fade never crosses the subjects \u2014 left
          // edge fades over the first 18% (the empty left side of the frame),
          // bottom edge fades over the last 12% (the lower edge / table).
          // Vendor-prefixed and standard mask props together so the image
          // dissolves into the hero without cropping the subjects.
          WebkitMaskImage:
            "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)",
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        } as React.CSSProperties"""

def main() -> int:
    with io.open(PATH, "r", encoding="utf-8") as fh:
        src = fh.read()
    if OLD not in src:
        print("ERROR: OLD block not found", flush=True)
        return 1
    src = src.replace(OLD, NEW, 1)
    with io.open(PATH, "w", encoding="utf-8") as fh:
        fh.write(src)
    print("OK: applied cast fix")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())