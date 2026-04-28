#!/usr/bin/env python3
"""Generate flat-color rounded-square PNG icons for the extension.

Uses only the Python standard library (struct + zlib) so the build has no
external image dependencies. Produces deterministic output for a given size.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
SIZES = (16, 48, 128)

# Brand color (#4F8EF7) and white pseudo-glyph foreground.
BG = (0x4F, 0x8E, 0xF7, 0xFF)
FG = (0xFF, 0xFF, 0xFF, 0xFF)
TRANSPARENT = (0, 0, 0, 0)


def make_pixels(size: int) -> list[tuple[int, int, int, int]]:
    radius = max(2, size // 6)
    pixels: list[tuple[int, int, int, int]] = []

    # Glyph: a centered horizontal "bookmark replace" arrow. We draw a thick
    # arrow pointing right inside a rounded square. Coordinates kept simple
    # and proportional so output scales across 16/48/128.
    bar_top = size * 7 // 16
    bar_bottom = size * 9 // 16
    bar_left = size * 5 // 16
    bar_right = size * 11 // 16
    head_left = size * 9 // 16
    head_top = size * 5 // 16
    head_bottom = size * 11 // 16

    for y in range(size):
        for x in range(size):
            if not _inside_rounded_square(x, y, size, radius):
                pixels.append(TRANSPARENT)
                continue
            if bar_top <= y < bar_bottom and bar_left <= x < bar_right:
                pixels.append(FG)
                continue
            if head_left <= x < bar_right + radius and head_top <= y < head_bottom:
                # Triangle: width tapers as |y - center|.
                center_y = (head_top + head_bottom) // 2
                dy = abs(y - center_y)
                tip = head_left + (head_bottom - head_top) // 2 - dy
                if x <= tip + (head_bottom - head_top):
                    pixels.append(FG)
                    continue
            pixels.append(BG)
    return pixels


def _inside_rounded_square(x: int, y: int, size: int, radius: int) -> bool:
    if x < radius and y < radius:
        return (radius - x - 1) ** 2 + (radius - y - 1) ** 2 <= radius**2
    if x >= size - radius and y < radius:
        return (x - (size - radius)) ** 2 + (radius - y - 1) ** 2 <= radius**2
    if x < radius and y >= size - radius:
        return (radius - x - 1) ** 2 + (y - (size - radius)) ** 2 <= radius**2
    if x >= size - radius and y >= size - radius:
        return (x - (size - radius)) ** 2 + (y - (size - radius)) ** 2 <= radius**2
    return True


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
