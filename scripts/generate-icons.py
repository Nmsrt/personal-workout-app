"""Regenerate every app icon in public/ from design/icon-source.png.

Usage:  python scripts/generate-icons.py      (needs Pillow + numpy)

The source is a rounded tile on a black canvas. From it we derive:
  icon-192.png / icon-512.png  rounded tile, transparent corners (purpose "any")
  icon-maskable-512.png        full-bleed, artwork inside the 80% safe zone
  apple-touch-icon.png         full-bleed square, 180px (iOS rounds it itself)
  favicon-32.png               small rounded favicon for browser tabs
  badge-96.png                 white dumbbell silhouette on alpha (notification badge)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "icon-source.png"
OUT = ROOT / "public"

RIM = 6  # px trimmed from each side to drop the light edge highlight
SS = 4  # supersampling for anti-aliased masks


def tile_bbox(rgb: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(rgb.sum(2) > 12)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def corner_radius(rgb: np.ndarray, x0: int, y0: int) -> float:
    """Distance along the top-left diagonal to the first tile pixel -> radius."""
    d = next(i for i in range(rgb.shape[0]) if rgb[y0 + i, x0 + i].sum() > 12)
    return d / (1 - 2 ** -0.5)


def full_bleed(rgb: np.ndarray) -> np.ndarray:
    """Crop to the tile and fill its rounded corners by projecting radially inward."""
    x0, y0, x1, y1 = tile_bbox(rgb)
    r = corner_radius(rgb, x0, y0)
    tile = rgb[y0 + RIM : y1 - RIM, x0 + RIM : x1 - RIM].copy()
    h, w, _ = tile.shape
    r -= RIM
    inner = r - 8  # sample a little inside the curve, past the rim highlight
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cx = np.clip(xx, r, w - 1 - r)
    cy = np.clip(yy, r, h - 1 - r)
    dx, dy = xx - cx, yy - cy
    dist = np.hypot(dx, dy)
    out = dist > inner
    scale = np.where(out, inner / np.maximum(dist, 1e-6), 1.0)
    sx = np.clip(np.rint(cx + dx * scale), 0, w - 1).astype(int)
    sy = np.clip(np.rint(cy + dy * scale), 0, h - 1).astype(int)
    tile[out] = tile[sy[out], sx[out]]
    s = min(h, w)  # the source tile is a few px off square; centre-crop
    top, left = (h - s) // 2, (w - s) // 2
    return tile[top : top + s, left : left + s]


def rounded_mask(size: int, radius_ratio: float) -> Image.Image:
    big = Image.new("L", (size * SS, size * SS), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (0, 0, size * SS - 1, size * SS - 1), radius=radius_ratio * size * SS, fill=255
    )
    return big.resize((size, size), Image.LANCZOS)


def resized(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def rounded_icon(square: Image.Image, size: int, radius_ratio: float) -> Image.Image:
    im = resized(square, size).convert("RGBA")
    im.putalpha(rounded_mask(size, radius_ratio))
    return im


def maskable(square: np.ndarray, size: int, content: float = 0.86) -> Image.Image:
    """Shrink the artwork to `content` of the canvas so the dumbbell sits inside the
    80% safe circle. The extra margin mirrors the edges (so background grain and
    arcs carry on) and fades to the flat background colour towards the canvas edge."""
    n = square.shape[0]
    pad = round(n * (1 - content) / content / 2)
    padded = np.pad(square, ((pad, pad), (pad, pad), (0, 0)), mode="reflect").astype(float)
    m = padded.shape[0]
    bg = np.median(square[n // 3 : 2 * n // 3, : n // 10].reshape(-1, 3), axis=0)
    idx = np.arange(m)
    edge = np.minimum(idx, m - 1 - idx)  # distance to nearest canvas edge
    w1 = np.clip(edge / pad, 0, 1)  # 0 at canvas edge, 1 where the original art starts
    w = np.minimum.outer(w1, w1)[..., None] ** 1.5
    blended = padded * w + bg * (1 - w)
    return resized(Image.fromarray(blended.round().astype(np.uint8)), size)


def badge(square: np.ndarray, size: int) -> Image.Image:
    """White dumbbell on transparent: flood-fill each dumbbell part from a seed."""
    n = square.shape[0]
    g = square.astype(int)
    lime = (g[..., 1] > 120) & (g[..., 1] > g[..., 2] + 60)
    bw = Image.fromarray(np.where(lime, 255, 0).astype(np.uint8)).copy()  # writable
    # Seeds (as fractions of the full-bleed square) on each of the 7 parts,
    # read off the source art: end caps, small plates, big plates, bar.
    seeds = [0.137, 0.208, 0.317, 0.5, 0.686, 0.79, 0.863]
    for fx in seeds:
        seed = (round(fx * n), round(0.465 * n))
        if bw.getpixel(seed) != 255:
            raise SystemExit(f"badge seed {seed} missed the dumbbell; adjust seeds")
        ImageDraw.floodfill(bw, seed, 128)
    part = np.asarray(bw) == 128
    ys, xs = np.where(part)
    if xs.max() - xs.min() > 0.85 * n or ys.max() - ys.min() > 0.5 * n:
        raise SystemExit("badge flood fill leaked into the background arcs")
    alpha = Image.fromarray(np.where(part, 255, 0).astype(np.uint8))
    # Centre the silhouette with ~8% margin.
    alpha = alpha.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    inner = round(size * 0.84)
    alpha.thumbnail((inner, inner), Image.LANCZOS)
    canvas = Image.new("L", (size, size), 0)
    canvas.paste(alpha, ((size - alpha.width) // 2, (size - alpha.height) // 2))
    out = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    out.putalpha(canvas)
    return out


def main() -> None:
    rgb = np.asarray(Image.open(SRC).convert("RGB"))
    x0, y0, x1, y1 = tile_bbox(rgb)
    ratio = corner_radius(rgb, x0, y0) / (x1 - x0)
    sq = full_bleed(rgb)
    sq_img = Image.fromarray(sq)

    save = lambda im, name: im.save(OUT / name, optimize=True)
    save(rounded_icon(sq_img, 192, ratio), "icon-192.png")
    save(rounded_icon(sq_img, 512, ratio), "icon-512.png")
    save(rounded_icon(sq_img, 32, ratio), "favicon-32.png")
    save(maskable(sq, 512), "icon-maskable-512.png")
    save(resized(sq_img, 180), "apple-touch-icon.png")
    save(badge(sq, 96), "badge-96.png")
    print("wrote icons to", OUT)


if __name__ == "__main__":
    main()
