#!/usr/bin/env python3
"""Generate the "drop-in" bookmark PNG icons for the extension.

Uses only the Python standard library (struct + zlib) so the build has no
external image dependencies. Produces deterministic output for a given size.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
SIZES = (16, 48, 128)

# Yellow tile with a dark ink bookmark. The glyph contrasts with the tile by
# lightness (about 11:1), not by hue, so it stays legible under color vision
# deficiencies and in grayscale. The thin dark edge keeps the tile outline
# visible on the light Chrome toolbar, where yellow alone is too pale.
YELLOW = (0xFF, 0xC1, 0x07)
INK = (0x2B, 0x21, 0x00)
EDGE = (0x8A, 0x65, 0x00)


def make_pixels(size: int) -> list[tuple[int, int, int, int]]:
    # The design lives on a 16x16 grid. Each pixel is supersampled and the
    # covered samples are averaged, which anti-aliases the edges at every size.
    samples = 8 if size <= 16 else 4
    unit = 16 / size
    pixels: list[tuple[int, int, int, int]] = []
    for y in range(size):
        for x in range(size):
            covered = 0
            rgb = [0, 0, 0]
            for sy in range(samples):
                for sx in range(samples):
                    u = (x + (sx + 0.5) / samples) * unit
                    v = (y + (sy + 0.5) / samples) * unit
                    color = _sample(u, v)
                    if color is None:
                        continue
                    covered += 1
                    for i in range(3):
                        rgb[i] += color[i]
            if covered == 0:
                pixels.append((0, 0, 0, 0))
                continue
            alpha = round(255 * covered / (samples * samples))
            pixels.append((*(round(c / covered) for c in rgb), alpha))
    return pixels


def _sample(u: float, v: float) -> tuple[int, int, int] | None:
    # Painter's order from the top: the arrow is cut out of the bookmark, the
    # bookmark sits on the tile, and the tile has a thin edge ring.
    if not _inside_rounded_rect(u, v, 0, 0, 16, 16, 3.7):
        return None
    if _inside_arrow(u, v):
        return YELLOW
    if _inside_bookmark(u, v):
        return INK
    if _inside_rounded_rect(u, v, 0.8, 0.8, 15.2, 15.2, 2.9):
        return YELLOW
    return EDGE


def _inside_rounded_rect(
    u: float, v: float, x0: float, y0: float, x1: float, y1: float, r: float
) -> bool:
    if not (x0 <= u <= x1 and y0 <= v <= y1):
        return False
    cx = min(max(u, x0 + r), x1 - r)
    cy = min(max(v, y0 + r), y1 - r)
    return (u - cx) ** 2 + (v - cy) ** 2 <= r**2


def _inside_bookmark(u: float, v: float) -> bool:
    # Ribbon from (4.5, 2) to (11.5, 14.2) with a V notch up to (8, 11.2).
    if not (4.5 <= u <= 11.5 and v >= 2):
        return False
    return v <= 11.2 + 3 * abs(u - 8) / 3.5


def _inside_arrow(u: float, v: float) -> bool:
    # Downward arrow: a round-capped shaft from y=3.3 to 6.9 and a head whose
    # tip reaches y=9, meaning "drop the current page into this bookmark".
    shaft_y = min(max(v, 3.3), 6.9)
    if (u - 8) ** 2 + (v - shaft_y) ** 2 <= 0.85**2:
        return True
    return 6.2 <= v <= 9 and abs(u - 8) <= 2.4 * (9 - v) / 2.8


def encode_png(width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> bytes:
    if len(pixels) != width * height:
        raise ValueError("pixel count mismatch")

    raw = bytearray()
    for row in range(height):
        raw.append(0)  # filter type: None
        start = row * width
        for px in pixels[start : start + width]:
            raw.extend(px)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), level=9)
    return signature + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        pixels = make_pixels(size)
        png = encode_png(size, size, pixels)
        path = OUT_DIR / f"icon-{size}.png"
        path.write_bytes(png)
        print(f"wrote {path} ({len(png)} bytes)")


if __name__ == "__main__":
    main()
