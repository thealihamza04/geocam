"""Draws the GeoCam app icons into ../assets.

Run: python3 scripts/make-icons.py
Everything is drawn at 4x and downsampled for smooth edges.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops

S = 4                      # supersampling factor
N = 1024 * S               # canvas size
ASSETS = Path(__file__).resolve().parent.parent / "assets"

BG_STOPS = [(0.0, (0, 198, 255)), (0.5, (123, 47, 247)), (1.0, (255, 60, 172))]   # cyan -> purple -> pink
RING_STOPS = [(0.0, (255, 179, 0)), (1.0, (255, 61, 113))]                         # amber -> coral
WHITE = (255, 255, 255, 255)
LENS_DARK = (27, 31, 59, 255)
PIN_RED = (234, 67, 53, 255)


def lerp_stops(stops, t):
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            k = (t - t0) / (t1 - t0)
            return tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
    return stops[-1][1]


def diagonal_gradient(size, stops):
    """Top-left to bottom-right gradient, built small then scaled up (fast)."""
    small = 256
    img = Image.new("RGBA", (small, small))
    px = img.load()
    for y in range(small):
        for x in range(small):
            px[x, y] = lerp_stops(stops, (x + y) / (2 * (small - 1))) + (255,)
    return img.resize((size, size), Image.BICUBIC)


def s(v):
    return round(v * S)


def draw_camera(scale=1.0, mono=False):
    """Camera glyph on a transparent canvas, centred. scale=1 -> 640px-wide body."""
    layer = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = 512

    def box(x0, y0, x1, y1):  # coordinates in the 1024 design grid, scaled about the centre
        return [s(c + (x0 - c) * scale), s(c + (y0 - c) * scale), s(c + (x1 - c) * scale), s(c + (y1 - c) * scale)]

    def r(v):
        return s(v * scale)

    # Body + viewfinder bump
    d.rounded_rectangle(box(250, 285, 400, 360), radius=r(28), fill=WHITE)
    d.rounded_rectangle(box(192, 330, 832, 770), radius=r(96), fill=WHITE)

    lx, ly = 512, 555  # lens centre
    if mono:
        # Monochrome: cut a transparent ring around the lens so it reads at small sizes.
        hole = Image.new("L", (N, N), 0)
        hd = ImageDraw.Draw(hole)
        hd.ellipse(box(lx - 132, ly - 132, lx + 132, ly + 132), fill=255)
        hd.ellipse(box(lx - 98, ly - 98, lx + 98, ly + 98), fill=0)
        layer.putalpha(ImageChops.subtract(layer.getchannel("A"), hole))
    else:
        # Lens: dark rim, gradient ring, dark glass, highlight
        d.ellipse(box(lx - 162, ly - 162, lx + 162, ly + 162), fill=LENS_DARK)
        ring = diagonal_gradient(N, RING_STOPS)
        mask = Image.new("L", (N, N), 0)
        md = ImageDraw.Draw(mask)
        md.ellipse(box(lx - 132, ly - 132, lx + 132, ly + 132), fill=255)
        md.ellipse(box(lx - 98, ly - 98, lx + 98, ly + 98), fill=0)
        layer.paste(ring, (0, 0), mask)
        d.ellipse(box(lx - 98, ly - 98, lx + 98, ly + 98), fill=LENS_DARK)
        d.ellipse(box(lx - 62, ly - 70, lx - 22, ly - 30), fill=(255, 255, 255, 200))
        pin_fill = PIN_RED

    # Map pin (top-right of body) instead of a flash dot
    px, py = 735, 405
    if mono:
        hole = Image.new("L", (N, N), 0)
        hd = ImageDraw.Draw(hole)
        hd.ellipse(box(px - 30, py - 30, px + 30, py + 30), fill=255)
        hd.polygon([tuple(box(px - 26, py + 14, 0, 0)[:2]), tuple(box(px + 26, py + 14, 0, 0)[:2]),
                    tuple(box(px, py + 62, 0, 0)[:2])], fill=255)
        layer.putalpha(ImageChops.subtract(layer.getchannel("A"), hole))
    else:
        d.ellipse(box(px - 30, py - 30, px + 30, py + 30), fill=pin_fill)
        d.polygon([tuple(box(px - 26, py + 14, 0, 0)[:2]), tuple(box(px + 26, py + 14, 0, 0)[:2]),
                   tuple(box(px, py + 62, 0, 0)[:2])], fill=pin_fill)
        d.ellipse(box(px - 11, py - 11, px + 11, py + 11), fill=WHITE)
    return layer


def rounded_mask(radius_frac=0.225):
    m = Image.new("L", (N, N), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, N - 1, N - 1], radius=round(N * radius_frac), fill=255)
    return m


def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(ASSETS / name)
    print("wrote", name, f"{size}x{size}")


bg = diagonal_gradient(N, BG_STOPS)

# 1) Main icon: rounded square, transparent corners
icon = Image.new("RGBA", (N, N), (0, 0, 0, 0))
icon.paste(bg, (0, 0), rounded_mask())
icon.alpha_composite(draw_camera(1.0))
save(icon, "icon.png", 1024)

# 2) Android adaptive icon: full-bleed background + glyph kept inside the safe zone
save(bg, "android-icon-background.png", 512)
save(draw_camera(0.72), "android-icon-foreground.png", 512)
save(draw_camera(0.72, mono=True), "android-icon-monochrome.png", 432)

# 3) Favicon uses the rounded-square icon (no splash: see plugins/withNoSplash.js)
save(icon, "favicon.png", 48)
