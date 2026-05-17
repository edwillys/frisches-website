#!/usr/bin/env python3
"""generate_icon_variants.py

Generates instrument icon variants (mute, low, mid, high) from a base SVG.

Each base icon produces four files:
    <name>-mute.svg   — icon + fixed mute 'x' overlay matching the vocals reference
    <name>-low.svg    — icon + 1 right-side sound-wave arc (low gain)
    <name>-mid.svg    — icon + 2 right-side sound-wave arcs (mid gain)
    <name>-high.svg   — icon + 3 right-side sound-wave arcs (high gain)

The output SVG always has viewBox="0 0 512 512" and uses currentColor throughout,
so it respects the parent element's CSS `color` property.

Usage:
  python scripts/generate_icon_variants.py src/assets/icons/instrument-strings.svg
  python scripts/generate_icon_variants.py src/assets/icons/instrument-guitar-acoustic.svg
  python scripts/generate_icon_variants.py src/assets/icons/instrument-*.svg
  python scripts/generate_icon_variants.py   # process all instrument-*.svg in default dir

Color normalization is applied automatically (replaces hardcoded hex/rgb/named colors
with currentColor), so the script is safe to run on un-normalized sources.
"""

import re
import sys
import os
import glob as _glob

# ─── Configuration ────────────────────────────────────────────────────────────

CANVAS = 512
MUTE_ICON_SCALE = 0.84
LEVEL_ICON_SCALE = 0.78
RIGHT_ARC_RESERVED_WIDTH = 150
SOUND_ARC_STROKE_WIDTH = 38.4
MUTE_X_OFFSET_X = -28

MUTE_X_PATHS = [
    "M403.2,224l106.667,106.667",
    "M509.867,224l-106.667,106.667",
]

LEVEL_ARC_PATHS = [
    "M356.907,298.667c17.92,-25.6 17.92,-59.733 0,-85.333",
    "M388.907,352c53.12,-46.72 58.027,-127.573 11.307,-180.693 -3.627,-4.053 -7.253,-7.893 -11.307,-11.307",
    "M420.907,405.333c82.56,-66.56 95.36,-187.52 28.587,-270.08 -8.533,-10.453 -18.133,-20.053 -28.587,-28.587",
]

DEFAULT_ICON_DIR = "src/assets/icons"
DEFAULT_PATTERN = "instrument-*.svg"
VARIANT_SUFFIXES = ("-mute", "-low", "-mid", "-high")

# ─── Color normalization ──────────────────────────────────────────────────────

_NAMED_COLORS = frozenset({
    "black", "white", "red", "blue", "green", "gray", "grey",
    "yellow", "orange", "purple", "pink", "cyan", "magenta",
    "navy", "teal", "silver", "maroon",
})


def _is_hard_color(val: str) -> bool:
    v = val.strip().lower()
    if not v or v in ("none", "transparent", "currentcolor"):
        return False
    if re.match(r"^#[0-9a-f]{3,8}$", v):
        return True
    if re.match(r"^rgba?\(", v) or re.match(r"^hsla?\(", v):
        return True
    return v in _NAMED_COLORS


def normalize_colors(svg: str) -> str:
    """Replace every hardcoded color in fill/stroke attributes and <style> blocks
    with currentColor."""

    def _style_replace(m: re.Match) -> str:
        css = re.sub(
            r"(fill|stroke|color)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)",
            lambda sm: f"{sm.group(1)}: currentColor"
            if _is_hard_color(sm.group(2))
            else sm.group(0),
            m.group(2),
        )
        return m.group(1) + css + m.group(3)

    svg = re.sub(r"(<style[^>]*>)([\s\S]*?)(</style>)", _style_replace, svg)
    svg = re.sub(
        r'\b(fill|stroke)="([^"]*)"',
        lambda m: f'{m.group(1)}="currentColor"' if _is_hard_color(
            m.group(2)) else m.group(0),
        svg,
    )
    return svg


# ─── SVG parsing helpers ──────────────────────────────────────────────────────

def strip_outer(svg: str) -> tuple[str, str]:
    """Return (opening_svg_tag, inner_content) with XML declaration removed."""
    svg = re.sub(r"<\?xml[^>]*\?>\s*", "", svg)
    svg = re.sub(r"<!DOCTYPE[^>]*>\s*", "", svg)
    m = re.search(r"(<svg\b[^>]*>)([\s\S]*)</svg>", svg, re.IGNORECASE)
    if not m:
        raise ValueError("No <svg> root element found")
    return m.group(1), m.group(2).strip()


def parse_viewbox(svg_tag: str) -> tuple[float, float, float, float]:
    """Return (min_x, min_y, width, height) from the viewBox attribute."""
    m = re.search(r'viewBox="([^"]+)"', svg_tag)
    if m:
        parts = re.split(r"[\s,]+", m.group(1).strip())
        return float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3])
    # Fall back to width / height attributes (strip units)
    wm = re.search(r'width="([\d.]+)', svg_tag)
    hm = re.search(r'height="([\d.]+)', svg_tag)
    w = float(wm.group(1)) if wm else float(CANVAS)
    h = float(hm.group(1)) if hm else float(CANVAS)
    return 0.0, 0.0, w, h


# ─── Layout helpers ───────────────────────────────────────────────────────────

def compute_transform(vx: float, vy: float, vw: float, vh: float, full: bool = False) -> str:
    """
    Compute translate+scale to fit the source icon into the target canvas.

    full=True  → use the full CANVAS (for mute variant).
    full=False → reserve space on the right so the icon doesn't overlap the sound arcs.
    """
    c = float(CANVAS)
    reserved_w = 0.0 if full else float(RIGHT_ARC_RESERVED_WIDTH)
    avail_w = c - reserved_w
    avail_h = c

    scale = min(avail_w / vw, avail_h / vh) * \
        (MUTE_ICON_SCALE if full else LEVEL_ICON_SCALE)

    tx = (avail_w - vw * scale) / 2.0 - vx * scale
    ty = (avail_h - vh * scale) / 2.0 - vy * scale

    return f"translate({tx:.2f} {ty:.2f}) scale({scale:.5f})"


def build_arcs(count: int) -> str:
    """Return SVG path elements matching the reference vocals sound-wave arcs."""
    return "\n  ".join(
        f'<path fill="none" stroke="currentColor" stroke-width="{SOUND_ARC_STROKE_WIDTH}" '
        f'stroke-linecap="round" stroke-linejoin="round" d="{path}"/>'
        for path in LEVEL_ARC_PATHS[:count]
    )


def build_mute_x() -> str:
    x_paths = "\n    ".join(
        f'<path fill="none" stroke="currentColor" stroke-width="{SOUND_ARC_STROKE_WIDTH}" '
        f'stroke-linecap="round" stroke-linejoin="round" d="{path}"/>'
        for path in MUTE_X_PATHS
    )
    return (
        f'<g transform="translate({MUTE_X_OFFSET_X} 0)">\n'
        f'    {x_paths}\n'
        f'  </g>'
    )


# ─── Variant assembly ─────────────────────────────────────────────────────────

def assemble_mute(inner: str, transform: str) -> str:
    vb = f"0 0 {CANVAS} {CANVAS}"
    mute_x = build_mute_x()
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" fill="currentColor">\n'
        f'  <g transform="{transform}">\n'
        f'    {inner}\n'
        f'  </g>\n'
        f'  {mute_x}\n'
        f'</svg>\n'
    )


def assemble_leveled(inner: str, transform: str, arc_count: int) -> str:
    vb = f"0 0 {CANVAS} {CANVAS}"
    arcs = build_arcs(arc_count)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" fill="currentColor">\n'
        f'  <g transform="{transform}">\n'
        f'    {inner}\n'
        f'  </g>\n'
        f'  {arcs}\n'
        f'</svg>\n'
    )


# ─── Main processing ──────────────────────────────────────────────────────────

def generate_variants(svg_path: str) -> None:
    with open(svg_path, "r", encoding="utf-8", errors="replace") as fh:
        content = fh.read()

    content = normalize_colors(content)
    svg_tag, inner = strip_outer(content)
    vx, vy, vw, vh = parse_viewbox(svg_tag)

    transform_full = compute_transform(vx, vy, vw, vh, full=True)
    transform_bar = compute_transform(vx, vy, vw, vh, full=False)
    base = os.path.splitext(svg_path)[0]

    variants: dict[str, str] = {
        "mute": assemble_mute(inner, transform_bar),
        "low":  assemble_leveled(inner, transform_bar, 1),
        "mid":  assemble_leveled(inner, transform_bar, 2),
        "high": assemble_leveled(inner, transform_bar, 3),
    }

    for name, svg_content in variants.items():
        out_path = f"{base}-{name}.svg"
        with open(out_path, "w", encoding="utf-8") as fh:
            fh.write(svg_content)
        print(f"  \u2713  {out_path}")


def _resolve_paths(args: list[str]) -> list[str]:
    if not args:
        pattern = os.path.join(DEFAULT_ICON_DIR, DEFAULT_PATTERN)
        return sorted(_glob.glob(pattern))

    resolved: list[str] = []
    for p in args:
        matches = _glob.glob(p)
        resolved.extend(sorted(matches) if matches else [p])
    return resolved


if __name__ == "__main__":
    raw_args = sys.argv[1:]
    force_overwrite = "--force" in raw_args
    raw_args = [a for a in raw_args if a != "--force"]
    paths = _resolve_paths(raw_args)

    if not paths:
        print(
            f"No SVG files found. Provide file paths or place instrument-*.svg files in {DEFAULT_ICON_DIR}/")
        sys.exit(0)

    # Skip files that are themselves already variants
    skip = [p for p in paths if any(p.endswith(
        f"{s}.svg") for s in VARIANT_SUFFIXES)]
    to_process = [p for p in paths if p not in skip]

    if skip:
        print(f"Skipping {len(skip)} variant file(s) (already suffixed).")

    processed = 0
    errors = 0
    for svg_path in to_process:
        if not os.path.isfile(svg_path):
            print(f"  \u2717  Not found: {svg_path}")
            errors += 1
            continue
        print(f"Processing: {svg_path}")
        try:
            generate_variants(svg_path, force=force_overwrite)
            processed += 1
        except Exception as exc:  # noqa: BLE001
            print(f"  \u2717  Error: {exc}")
            errors += 1

    print(f"\nDone \u2014 {processed} processed, {errors} errors.")
