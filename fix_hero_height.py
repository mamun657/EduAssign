#!/usr/bin/env python3
"""Fix hero height accounting for the sticky navbar.
The hero section is rendered below a 64-65px sticky navbar, so to fit
inside 100svh we need min-h-[calc(100svh-65px)] (not h-[100svh]).
Also tighten the bottom padding so the marquee sits cleanly inside.
"""
import io
PATH = r"c:\EduAssign\web\src\app\_landing\LandingPage.tsx"

OLD = '''      <div className="relative mx-auto flex h-[100svh] min-h-[640px] max-w-[1400px] flex-col px-5 pt-[68px] sm:px-8 sm:pt-[72px] lg:px-12 lg:pt-[76px]">'''

NEW = '''      <div className="relative mx-auto flex min-h-[calc(100svh-65px)] max-w-[1400px] flex-col px-5 pt-[68px] sm:px-8 sm:pt-[72px] lg:px-12 lg:pt-[76px]">'''

OLD2 = '''        {/* Bottom feature strip \u2014 compact, fully inside the first viewport,
            seamlessly continues the hero composition. */}
        <div className="pb-5 sm:pb-6">'''

NEW2 = '''        {/* Bottom feature strip \u2014 compact, fully inside the first viewport,
            seamlessly continues the hero composition. */}
        <div className="pb-3 sm:pb-4">'''

def main() -> int:
    with io.open(PATH, "r", encoding="utf-8") as fh:
        src = fh.read()
    if OLD not in src:
        print("ERROR: OLD not found", flush=True); return 1
    if OLD2 not in src:
        print("ERROR: OLD2 not found", flush=True); return 1
    src = src.replace(OLD, NEW, 1)
    src = src.replace(OLD2, NEW2, 1)
    with io.open(PATH, "w", encoding="utf-8") as fh:
        fh.write(src)
    print("OK: applied height fix")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())