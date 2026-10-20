"""Android başlatıcı ikonu + açılış görseli, iOS'taki asıllardan üretilir.

Kaynak: docs/logotasarim/ikon-1024.png (iOS AppIcon ile aynı) ve iOS Splash.imageset.
Çalıştır: python tools/android-ikon.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

KOK = Path(__file__).resolve().parent.parent
RES = KOK / "android/app/src/main/res"
IKON = Image.open(KOK / "docs/logotasarim/ikon-1024.png").convert("RGB")
ACILIS = Image.open(KOK / "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png").convert("RGB")

YOGUNLUK = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
# Uyarlanır ikon 108dp; maske ortadaki 72dp'yi gösterir. Resim 82dp'ye oturur → kendi altın çerçevesi
# maskenin dışında kalır, launcher'ın şekli tek çerçeve olur.
ON_DP, RESIM_DP = 108, 82


def kenar_rengi(im):
    w, h = im.size
    return im.getpixel((w // 2, 2))


def on_katman(px):
    tuval = Image.new("RGB", (px, px), kenar_rengi(IKON))
    r = round(px * RESIM_DP / ON_DP)
    tuval.paste(IKON.resize((r, r), Image.LANCZOS), ((px - r) // 2, (px - r) // 2))
    return tuval


def eski_ikon(px, yuvarlak):
    # API < 26: hazır şekilli tek PNG. İç sahne (çerçeve kırpılmış) kullanılır.
    kirp = 60
    sahne = IKON.crop((kirp, kirp, 1024 - kirp, 1024 - kirp)).resize((px, px), Image.LANCZOS)
    maske = Image.new("L", (px, px), 0)
    d = ImageDraw.Draw(maske)
    if yuvarlak:
        d.ellipse((0, 0, px - 1, px - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, px - 1, px - 1), radius=round(px * 0.18), fill=255)
    cikti = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    cikti.paste(sahne, (0, 0), maske)
    return cikti


def acilis(w, h):
    # Kare iOS açılışının ortasından hedef oranda kes; logo ortada kalır.
    s = ACILIS.width
    if w >= h:
        kw, kh = s, round(s * h / w)
    else:
        kw, kh = round(s * w / h), s
    x, y = (s - kw) // 2, (s - kh) // 2
    return ACILIS.crop((x, y, x + kw, y + kh)).resize((w, h), Image.LANCZOS)


for ad, k in YOGUNLUK.items():
    d = RES / f"mipmap-{ad}"
    on_katman(round(ON_DP * k)).save(d / "ic_launcher_foreground.png", optimize=True)
    eski_ikon(round(48 * k), False).save(d / "ic_launcher.png", optimize=True)
    eski_ikon(round(48 * k), True).save(d / "ic_launcher_round.png", optimize=True)

for p in RES.glob("drawable*/splash.png"):
    w, h = Image.open(p).size
    acilis(w, h).save(p, optimize=True)

r, g, b = kenar_rengi(IKON)
(RES / "values/ic_launcher_background.xml").write_bytes(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#{r:02X}{g:02X}{b:02X}</color>\n</resources>\n'.encode()
)
print("tamam")
