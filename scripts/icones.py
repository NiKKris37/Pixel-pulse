"""Dessine l'icône néon (anneau et pulsation) dans assets/."""
from PIL import Image, ImageDraw, ImageFilter

S = 1024
CYAN, PINK = (0, 240, 255, 255), (255, 43, 214, 255)


def motif(scale, mono=False):
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c, r = S / 2, S * scale / 2
    box = [c - r, c - r, c + r, c + r]
    white = (255, 255, 255, 255)
    width = int(r * 0.09)
    d.arc(box, 135, 315, fill=white if mono else CYAN, width=width)
    d.arc(box, 315, 135, fill=white if mono else PINK, width=width)
    pts = [(-.68, 0), (-.34, 0), (-.18, -.42), (.08, .46), (.26, -.14), (.36, 0), (.68, 0)]
    line = [(c + x * r, c + y * r) for x, y in pts]
    d.line(line, fill=white, width=width, joint='curve')
    for x, y in (line[0], line[-1]):
        d.ellipse([x - width / 2, y - width / 2, x + width / 2, y + width / 2], fill=white)
    return layer


def neon(scale):
    base = motif(scale)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    for blur in (40, 14):
        out.alpha_composite(base.filter(ImageFilter.GaussianBlur(blur)))
    out.alpha_composite(base)
    return out


icon = Image.new('RGBA', (S, S), (0, 0, 0, 255))
icon.alpha_composite(neon(0.74))
icon.convert('RGB').save('assets/icon.png')
neon(0.54).save('assets/adaptive.png')  # reste dans la zone sûre d'Android
motif(0.54, mono=True).save('assets/monochrome.png')
neon(0.80).save('assets/splash.png')
