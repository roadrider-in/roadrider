from PIL import Image
from collections import deque
import sys

def process_logo(input_path, output_path):
    print(f"Loading image from {input_path}...")
    im = Image.open(input_path).convert('RGBA')
    w, h = im.size
    print(f"Dimensions: {w}x{h}")

    # The background is a checkerboard pattern of alternating greys ~130 and ~190.
    # The logo has a solid dark black outer outline (luminance < 40).
    # Flood-fill from all 4 borders to identify the exterior background.
    visited = bytearray(w * h)
    queue = deque()

    def is_checkerboard(r, g, b):
        # Checkerboard is neutral grey with luminance between 65 and 225
        if abs(r - g) <= 12 and abs(r - b) <= 12 and abs(g - b) <= 12:
            if r >= 65:
                return True
        return False

    # Initialize all boundary pixels
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = im.getpixel((x, y))
            if is_checkerboard(r, g, b):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    queue.append((x, y))

    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = im.getpixel((x, y))
            if is_checkerboard(r, g, b):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    queue.append((x, y))

    # Also include enclosed transparent holes in motorcycle front wheel and fork
    for sx, sy in [(1272, 497), (1150, 500)]:
        r, g, b, _ = im.getpixel((sx, sy))
        if is_checkerboard(r, g, b):
            idx = sy * w + sx
            if not visited[idx]:
                visited[idx] = 1
                queue.append((sx, sy))

    # 4-way flood fill
    while queue:
        cx, cy = queue.popleft()
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if not visited[nidx]:
                    nr, ng, nb, _ = im.getpixel((nx, ny))
                    if is_checkerboard(nr, ng, nb):
                        visited[nidx] = 1
                        queue.append((nx, ny))

    print(f"Flood fill visited {sum(visited)} background pixels ({sum(visited)/(w*h)*100:.1f}%)")

    # Now smooth anti-aliased transition at the boundary:
    # Any pixel adjacent to a visited background pixel that has greyish anti-aliasing
    # against the black outline should be smoothly blended with alpha:
    # The true stroke is pure black (0, 0, 0).
    # In the anti-aliased image, color C = Alpha * (0,0,0) + (1 - Alpha) * Background.
    # So if background was ~160 and C is ~80, Alpha ~ 0.5.
    pixels = list(im.getdata())
    new_pixels = list(pixels)

    # First pass: set visited background to 0 alpha
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if visited[idx]:
                new_pixels[idx] = (0, 0, 0, 0)

    # Second pass: refine fringe pixels (pixels adjacent to background)
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if not visited[idx]:
                # Check if neighbor is transparent (visited background)
                has_bg_neighbor = False
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and visited[ny * w + nx]:
                        has_bg_neighbor = True
                        break

                if has_bg_neighbor:
                    r, g, b, a = pixels[idx]
                    # If this is a transition grey pixel (bordering black outline and checkerboard)
                    if abs(r - g) <= 10 and abs(r - b) <= 10 and abs(g - b) <= 10:
                        # If luminance is very high (faint grey edge artifact from checkerboard), make transparent
                        if r >= 110:
                            new_pixels[idx] = (0, 0, 0, 0)
                        elif r >= 45:
                            # Anti-aliased black edge: smooth alpha from 1.0 (at r=45) down to 0.0 (at r=110)
                            alpha = int(255 * (110 - r) / (110 - 45))
                            new_pixels[idx] = (0, 0, 0, max(0, min(255, alpha)))
                        else:
                            # Solid black stroke
                            new_pixels[idx] = (0, 0, 0, 255)

    out = Image.new('RGBA', (w, h))
    out.putdata(new_pixels)

    bbox = out.getbbox()
    print(f"Bounding box of logo content: {bbox}")

    # Add a clean 16px safety margin around the tight bounding box
    pad = 16
    crop_box = (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(w, bbox[2] + pad),
        min(h, bbox[3] + pad)
    )
    cropped = out.crop(crop_box)
    print(f"Final logo size: {cropped.size} (aspect ratio: {cropped.width / cropped.height:.2f})")

    cropped.save(output_path, 'PNG', optimize=True)
    print(f"Saved optimized transparent logo to {output_path}")

if __name__ == '__main__':
    inp = '/Users/ommlenka/Desktop/ROADRIDER/Vendor-Module/public/RoadRider Delivery Logo.png'
    out = '/Users/ommlenka/Desktop/ROADRIDER/Vendor-Module/public/roadrider-delivery-logo.png'
    process_logo(inp, out)
