#!/usr/bin/env python3
"""Generate CCSF brand assets from the user-supplied canonical logo.

The canonical CCSF logo remains transparent for application layouts and print.
Installed application icons use a solid white square background so Android,
iOS, Windows and browser launchers do not choose an uncontrolled fill colour.
The artwork is never stretched, redrawn or recoloured.
"""

from __future__ import annotations

from collections import Counter, deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/Campus safety forum logo design(1).png"
CANONICAL_COPIES = [
    SOURCE,
    ROOT / "src/assets/ccsf-logo.png",
    ROOT / "public/ccsf-logo.png",
]

STANDARD_FOOTPRINT = 0.782
MASKABLE_FOOTPRINT = 0.66
BACKGROUND_DISTANCE = 54
TRANSPARENT = (0, 0, 0, 0)
WHITE = (255, 255, 255, 255)


def colour_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return sum((left - right) ** 2 for left, right in zip(a, b))


def dominant_border_colours(image: Image.Image, limit: int = 8) -> list[tuple[int, int, int]]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    border: list[tuple[int, int, int]] = []
    for x in range(width):
        border.append(rgb.getpixel((x, 0)))
        border.append(rgb.getpixel((x, height - 1)))
    for y in range(1, height - 1):
        border.append(rgb.getpixel((0, y)))
        border.append(rgb.getpixel((width - 1, y)))

    quantised = [(r // 8 * 8, g // 8 * 8, b // 8 * 8) for r, g, b in border]
    return [colour for colour, _ in Counter(quantised).most_common(limit)]


def remove_edge_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    background_colours = dominant_border_colours(rgba)
    threshold = BACKGROUND_DISTANCE**2

    def is_background(x: int, y: int) -> bool:
        r, g, b, alpha = pixels[x, y]
        if alpha == 0:
            return True
        colour = (r // 8 * 8, g // 8 * 8, b // 8 * 8)
        return min(colour_distance(colour, candidate) for candidate in background_colours) <= threshold

    seen = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if seen[index] or not is_background(x, y):
            return
        seen[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                enqueue(nx, ny)

    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            alpha_pixels[x, y] = 0 if seen[row + x] else pixels[x, y][3]

    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=max(width, height) / 1800))
    rgba.putalpha(alpha)
    return rgba


def crop_with_padding(image: Image.Image, padding_ratio: float = 0.025) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Background removal produced an empty logo")
    cropped = image.crop(bbox)
    padding = max(2, round(max(cropped.size) * padding_ratio))
    output = Image.new("RGBA", (cropped.width + padding * 2, cropped.height + padding * 2), TRANSPARENT)
    output.alpha_composite(cropped, (padding, padding))
    return output


def square_asset(
    mark: Image.Image,
    canvas_size: int,
    footprint: float,
    background: tuple[int, int, int, int] = TRANSPARENT,
) -> Image.Image:
    target = max(1, round(canvas_size * footprint))
    scale = min(target / mark.width, target / mark.height)
    resized = mark.resize(
        (max(1, round(mark.width * scale)), max(1, round(mark.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (canvas_size, canvas_size), background)
    x = (canvas_size - resized.width) // 2
    y = (canvas_size - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)


def content_bbox(image: Image.Image, white_background: bool) -> tuple[int, int, int, int] | None:
    if not white_background:
        return image.getchannel("A").getbbox()
    rgb = image.convert("RGB")
    difference = ImageChops.difference(rgb, Image.new("RGB", rgb.size, (255, 255, 255))).convert("L")
    mask = difference.point(lambda value: 255 if value > 6 else 0)
    return mask.getbbox()


def assert_asset(
    path: Path,
    size: tuple[int, int],
    *,
    white_background: bool,
) -> None:
    image = Image.open(path).convert("RGBA")
    if image.size != size:
        raise RuntimeError(f"{path}: expected {size}, received {image.size}")

    alpha_extrema = image.getchannel("A").getextrema()
    if white_background:
        if alpha_extrema != (255, 255):
            raise RuntimeError(f"{path}: app icon background must be fully opaque")
        corners = [
            image.getpixel((0, 0)),
            image.getpixel((image.width - 1, 0)),
            image.getpixel((0, image.height - 1)),
            image.getpixel((image.width - 1, image.height - 1)),
        ]
        if any(pixel != WHITE for pixel in corners):
            raise RuntimeError(f"{path}: app icon corners must be solid white")
    elif alpha_extrema[0] != 0:
        raise RuntimeError(f"{path}: transparent background is missing")

    if not content_bbox(image, white_background):
        raise RuntimeError(f"{path}: contains no visible logo")


original = Image.open(SOURCE)
transparent_logo = crop_with_padding(remove_edge_background(original))

for destination in CANONICAL_COPIES:
    save_png(transparent_logo, destination)

# Installed application icons use white backgrounds. Browser favicons remain
# transparent so they retain clean edges inside browser UI.
master = square_asset(transparent_logo, 1024, STANDARD_FOOTPRINT, WHITE)
app_512 = square_asset(transparent_logo, 512, STANDARD_FOOTPRINT, WHITE)
app_192 = square_asset(transparent_logo, 192, STANDARD_FOOTPRINT, WHITE)
maskable_512 = square_asset(transparent_logo, 512, MASKABLE_FOOTPRINT, WHITE)
apple_180 = square_asset(transparent_logo, 180, STANDARD_FOOTPRINT, WHITE)
favicon_64 = square_asset(transparent_logo, 64, 0.84)
favicon_32 = square_asset(transparent_logo, 32, 0.86)
favicon_16 = square_asset(transparent_logo, 16, 0.88)

outputs = {
    ROOT / "public/app-icon-1024.png": master,
    ROOT / "public/app-icon-512.png": app_512,
    ROOT / "public/app-icon-192.png": app_192,
    ROOT / "public/maskable-icon-512.png": maskable_512,
    ROOT / "public/apple-touch-icon.png": apple_180,
    ROOT / "public/favicon.png": favicon_64,
    ROOT / "public/favicon-32x32.png": favicon_32,
    ROOT / "public/favicon-16x16.png": favicon_16,
}
for destination, image in outputs.items():
    save_png(image, destination)

favicon_64.save(
    ROOT / "public/favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
)

for destination in CANONICAL_COPIES:
    image = Image.open(destination).convert("RGBA")
    if image.getchannel("A").getextrema()[0] != 0:
        raise RuntimeError(f"{destination}: canonical logo is not transparent")

for path, size in [
    (ROOT / "public/app-icon-1024.png", (1024, 1024)),
    (ROOT / "public/app-icon-512.png", (512, 512)),
    (ROOT / "public/app-icon-192.png", (192, 192)),
    (ROOT / "public/maskable-icon-512.png", (512, 512)),
    (ROOT / "public/apple-touch-icon.png", (180, 180)),
]:
    assert_asset(path, size, white_background=True)

for path, size in [
    (ROOT / "public/favicon.png", (64, 64)),
    (ROOT / "public/favicon-32x32.png", (32, 32)),
    (ROOT / "public/favicon-16x16.png", (16, 16)),
]:
    assert_asset(path, size, white_background=False)

bbox = content_bbox(master, True)
if not bbox:
    raise RuntimeError("Master app icon contains no visible mark")
left, top, right, bottom = bbox
footprint = max(right - left, bottom - top) / 1024
if not 0.74 <= footprint <= 0.82:
    raise RuntimeError(f"Master app icon optical footprint {footprint:.3f} is outside 0.74–0.82")

print(
    "Generated CCSF assets:",
    f"source={original.size}",
    f"canonical={transparent_logo.size}",
    "app_background=white",
    f"master_footprint={footprint:.3f}",
)
