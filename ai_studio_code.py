import os
import math
import random
from PIL import Image, ImageDraw, ImageFilter

random.seed(1004)

BASE_DIR = os.path.join("public", "art", "watercolor")
os.makedirs(os.path.join(BASE_DIR, "landscape"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "clouds"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "celestial"), exist_ok=True)

# -------------------------------------------------------------------------
# 유틸리티: 수채화 텍스처 노이즈 합성
# -------------------------------------------------------------------------

def add_granulation(img, intensity=0.08):
    """물감이 마르며 생기는 미세한 안료 알갱이(Granulation) 효과"""
    w, h = img.size
    noise = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    n_draw = ImageDraw.Draw(noise)
    for _ in range(int(w * h * 0.04)):
        x = random.randint(0, w - 1)
        y = random.randint(0, h - 1)
        val = random.randint(0, 40)
        n_draw.point((x, y), fill=(val, val, val, int(255 * intensity)))
    noise = noise.filter(ImageFilter.GaussianBlur(0.8))
    return Image.alpha_composite(img, noise)

# -------------------------------------------------------------------------
# 1. Landscape (1080 x 900 px)
# -------------------------------------------------------------------------

def create_landscape_far():
    """far.png: 지평선 상단 28% 부근의 수채화 원경 숲과 산"""
    img = Image.new("RGBA", (1080, 900), (0, 0, 0, 0))

    # 왼쪽/오른쪽 끝 잘림 방지를 위해 -60 ~ 1140 영역까지 확장 렌더링
    for layer_i in range(5):
        layer = Image.new("RGBA", (1080, 900), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        base_y = 250 + layer_i * 12

        points = [(-60, 950), (-60, base_y)]
        for x in range(-60, 1141, 15):
            y = base_y + math.sin(x * 0.005 + layer_i) * 35 + math.cos(x * 0.012) * 15
            points.append((x, y))
        points.extend([(1140, 950), (-60, 950)])

        # 푸른빛이 도는 먼 산록 수채 겹침
        c = (150 + layer_i * 6, 178 + layer_i * 5, 170 + layer_i * 4, 110)
        draw.polygon(points, fill=c)
        # 물 고임 테두리(Ridge line)
        draw.line(points[1:-2], fill=(130 + layer_i * 5, 158 + layer_i * 5, 150, 130), width=2)
        layer = layer.filter(ImageFilter.GaussianBlur(3.5 - layer_i * 0.5))
        img = Image.alpha_composite(img, layer)

    img = add_granulation(img, intensity=0.06)
    img.save(os.path.join(BASE_DIR, "landscape", "far.png"))
    print("✓ landscape/far.png 개선 완료")

def create_landscape_mid():
    """mid.png: 중간 언덕(집 + 나무) - 수채 번짐 및 외곽선 제거"""
    img = Image.new("RGBA", (1080, 900), (0, 0, 0, 0))

    # 중간 언덕 다중 워시 (물맛 나는 수채 겹침)
    for i in range(4):
        layer = Image.new("RGBA", (1080, 900), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        base_y = 470 + i * 8
        points = [(-60, 950), (-60, base_y)]
        for x in range(-60, 1141, 15):
            y = base_y + math.sin(x * 0.006 + 2.0 + i * 0.4) * 40 + math.cos(x * 0.018) * 10
            points.append((x, y))
        points.extend([(1140, 950), (-60, 950)])
        draw.polygon(points, fill=(115 + i * 8, 160 + i * 6, 110 + i * 5, 140))
        layer = layer.filter(ImageFilter.GaussianBlur(3.0))
        img = Image.alpha_composite(img, layer)

    obj_layer = Image.new("RGBA", (1080, 900), (0, 0, 0, 0))
    o_draw = ImageDraw.Draw(obj_layer)

    # 1. 붓으로 찍어 바른 듯한 수채화 나무 군락
    trees = [(230, 440, 40), (280, 455, 32), (810, 455, 45), (860, 470, 36)]
    for tx, ty, r in trees:
        # 나무 기둥 (먹빛 갈색)
        o_draw.line([(tx, ty + 10), (tx, ty + 42)], fill=(95, 75, 55, 200), width=6)
        for _ in range(8):
            ox = random.randint(-18, 18)
            oy = random.randint(-22, 10)
            rad = r + random.randint(-6, 8)
            o_draw.ellipse([tx + ox - rad, ty + oy - rad, tx + ox + rad, ty + oy + rad],
                           fill=(75 + random.randint(0, 35), 140 + random.randint(0, 40), 95, 130))

    # 2. 동화 같은 빨간 지붕 오두막 (단단한 외곽선 대신 부드러운 수채 채색)
    hx, hy = 340, 435
    # 벽면 (밝은 아이보리)
    o_draw.polygon([(hx, hy + 45), (hx, hy + 8), (hx + 70, hy + 8), (hx + 70, hy + 45)], fill=(245, 238, 222, 235))
    # 붉은 벽돌 지붕 (테두리 번짐)
    for s in range(3):
        o_draw.polygon([(hx - 10 - s, hy + 10), (hx + 35, hy - 30 - s), (hx + 80 + s, hy + 10)],
                       fill=(210 - s * 15, 85, 75, 160))
    # 문과 창문 (은은한 수채 터치)
    o_draw.rectangle([hx + 12, hy + 15, hx + 28, hy + 30], fill=(125, 165, 185, 190))
    o_draw.rectangle([hx + 42, hy + 16, hx + 58, hy + 45], fill=(145, 100, 75, 210))

    obj_layer = obj_layer.filter(ImageFilter.GaussianBlur(1.8))
    img = Image.alpha_composite(img, obj_layer)
    img = add_granulation(img, intensity=0.06)
    img.save(os.path.join(BASE_DIR, "landscape", "mid.png"))
    print("✓ landscape/mid.png 개선 완료")

def create_landscape_near():
    """near.png: 근경 언덕 + 굽이치는 흙길 + 울타리 + 양 + 들꽃"""
    img = Image.new("RGBA", (1080, 900), (0, 0, 0, 0))

    # 근경 완만한 수채 언덕
    for i in range(3):
        layer = Image.new("RGBA", (1080, 900), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        base_y = 660 + i * 15
        points = [(-60, 950), (-60, base_y)]
        for x in range(-60, 1141, 15):
            y = base_y + math.sin(x * 0.005 + 0.8) * 35 + math.cos(x * 0.015) * 8
            points.append((x, y))
        points.extend([(1140, 950), (-60, 950)])
        draw.polygon(points, fill=(90 + i * 8, 148 + i * 8, 85 + i * 5, 180))
        layer = layer.filter(ImageFilter.GaussianBlur(2.5))
        img = Image.alpha_composite(img, layer)

    detail_layer = Image.new("RGBA", (1080, 900), (0, 0, 0, 0))
    d_draw = ImageDraw.Draw(detail_layer)

    # 흙길 (부드러운 번짐 S자 곡선)
    road_pts = [(450, 680), (490, 740), (560, 820), (630, 910), (520, 910), (460, 820), (410, 750), (380, 680)]
    d_draw.polygon(road_pts, fill=(212, 192, 152, 210))

    # 나무 울타리 (자연스러운 붓터치)
    for fx in range(75, 275, 38):
        fy = 675 + math.sin(fx * 0.005 + 0.8) * 35
        d_draw.line([(fx, fy + 12), (fx, fy - 22)], fill=(130, 100, 75, 220), width=4)
    d_draw.line([(65, 680), (280, 692)], fill=(120, 90, 68, 200), width=3)

    # 털 몽글몽글한 양(Sheep) 2마리
    for sx, sy in [(670, 715), (745, 745)]:
        # 양 몸통 (흰색 수채 붓자국 중첩)
        for _ in range(12):
            ox = random.randint(-12, 12)
            oy = random.randint(-8, 8)
            d_draw.ellipse([sx + ox - 10, sy + oy - 10, sx + ox + 10, sy + oy + 10], fill=(250, 250, 246, 210))
        # 얼굴 & 다리
        d_draw.ellipse([sx + 14, sy - 6, sx + 25, sy + 5], fill=(60, 52, 50, 220))
        d_draw.line([(sx - 5, sy + 8), (sx - 5, sy + 20)], fill=(60, 52, 50, 220), width=3)
        d_draw.line([(sx + 7, sy + 8), (sx + 7, sy + 20)], fill=(60, 52, 50, 220), width=3)

    # 아기자기한 수채화 들꽃 물감 점묘
    colors = [(235, 110, 125, 210), (250, 210, 85, 220), (175, 135, 205, 210), (255, 255, 255, 220)]
    for _ in range(80):
        fx = random.randint(20, 1060)
        fy = random.randint(715, 885)
        rad = random.randint(2, 4)
        c = random.choice(colors)
        d_draw.ellipse([fx - rad, fy - rad, fx + rad, fy + rad], fill=c)

    detail_layer = detail_layer.filter(ImageFilter.GaussianBlur(1.2))
    img = Image.alpha_composite(img, detail_layer)
    img = add_granulation(img, intensity=0.06)
    img.save(os.path.join(BASE_DIR, "landscape", "near.png"))
    print("✓ landscape/near.png 개선 완료")

# -------------------------------------------------------------------------
# 2. Clouds (원형 경계 및 테두리선 완전 제거)
# -------------------------------------------------------------------------

def create_watercolor_cloud(width, height, puffs, is_storm=False):
    """
    어두운 외곽선 없이 순수한 안료가 젖은 종이에 번지는(Wet-in-wet) 구름 생성
    """
    # 마스크 기반 블렌딩으로 링 모양 테두리선 발생을 방지
    mask = Image.new("L", (width, height), 0)
    m_draw = ImageDraw.Draw(mask)

    # 1. 뭉게구름 기본 실루엣
    for cx, cy, r in puffs:
        for _ in range(6):
            ox = random.uniform(-r * 0.25, r * 0.25)
            oy = random.uniform(-r * 0.2, r * 0.2)
            rad = r * random.uniform(0.85, 1.15)
            m_draw.ellipse([cx + ox - rad, cy + oy - rad, cx + ox + rad, cy + oy + rad], fill=random.randint(190, 255))

    # 강한 블러로 원형 경계를 완전히 녹여 유기적 형태로 융합
    mask = mask.filter(ImageFilter.GaussianBlur(16.0))

    # 2. 색상 레이어 생성 (하단에만 은은한 명암 수채화 농담)
    cloud_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(cloud_img)

    if not is_storm:
        # 맑은 날 흰 구름: 전체 순백색에 하단부에만 아주 미세한 연하늘빛 워시
        for y in range(height):
            ratio = y / height
            r = int(255 - ratio * 8)
            g = int(255 - ratio * 6)
            b = 255
            c_draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
    else:
        # 먹구름: 짙은 먹빛 ~ 남회색 그라데이션
        for y in range(height):
            ratio = y / height
            v = int(90 - ratio * 35)
            c_draw.line([(0, y), (width, y)], fill=(v, v + 8, v + 22, 255))

    # 마스크를 알파 채널로 합성
    cloud_img.putalpha(mask)
    return cloud_img

def create_clouds():
    cloud_layouts = [
        [(220, 190, 72), (285, 160, 88), (355, 165, 82), (415, 195, 68), (315, 210, 62)],
        [(195, 185, 65), (265, 155, 78), (335, 145, 92), (410, 175, 78), (280, 205, 68)],
        [(235, 190, 82), (320, 150, 98), (395, 185, 78), (300, 205, 72)],
        [(185, 195, 58), (245, 165, 78), (315, 155, 88), (380, 165, 78), (435, 190, 58)]
    ]
    for idx, puffs in enumerate(cloud_layouts, start=1):
        img = create_watercolor_cloud(600, 360, puffs, is_storm=False)
        img.save(os.path.join(BASE_DIR, "clouds", f"cloud-{idx}.png"))
        print(f"✓ clouds/cloud-{idx}.png 개선 완료")

def create_storms():
    storm_layouts = [
        [(310, 275, 125), (435, 235, 150), (565, 245, 140), (665, 285, 115), (485, 320, 120)],
        [(275, 285, 120), (405, 230, 155), (545, 225, 165), (675, 270, 130), (495, 330, 125)]
    ]
    for idx, puffs in enumerate(storm_layouts, start=1):
        img = create_watercolor_cloud(900, 540, puffs, is_storm=True)
        img.save(os.path.join(BASE_DIR, "clouds", f"storm-{idx}.png"))
        print(f"✓ clouds/storm-{idx}.png 개선 완료")

# -------------------------------------------------------------------------
# 3. Celestial (달 표면 얼룩 완화 및 해 번짐)
# -------------------------------------------------------------------------

def create_sun():
    """sun.png: 투명 배경, 중심 지름 약 307px, 부드러운 온기 번짐"""
    img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = 256, 256

    # 외곽 번짐 (부드러운 황금빛 그라데이션)
    for r in range(235, 150, -3):
        alpha = int((1.0 - (r - 150) / 85.0) ** 1.8 * 140)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 205, 80, alpha))

    # 본체 코어
    for r in range(153, 0, -3):
        t = r / 153.0
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, int(220 + (1 - t) * 32), int(120 + (1 - t) * 120), 245))

    img = img.filter(ImageFilter.GaussianBlur(3.0))
    img.save(os.path.join(BASE_DIR, "celestial", "sun.png"))
    print("✓ celestial/sun.png 개선 완료")

def create_moon():
    """moon.png: 인위적인 얼룩을 없애고 미세한 수채 농담만 은은하게 얹은 보름달"""
    img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = 256, 256

    # 1. 은은한 청백색 달무리
    for r in range(230, 150, -4):
        alpha = int((1.0 - (r - 150) / 80.0) ** 2 * 75)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(225, 235, 255, alpha))

    # 2. 보름달 본체 (은은한 미색 아이보리)
    base_r = 153
    draw.ellipse([cx - base_r, cy - base_r, cx + base_r, cy + base_r], fill=(248, 247, 240, 255))

    # 3. 달 표면 (인위적인 무늬 대신 3~7% 불투명도의 극도로 은은한 수채 워시)
    m_layer = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    m_draw = ImageDraw.Draw(m_layer)
    craters = [(-45, -35, 45), (25, -50, 40), (-20, 25, 55), (45, 25, 38), (15, -10, 30)]
    for ox, oy, cr in craters:
        # 알파값 18~25 (약 7~9%)로 낮춰 달 본연의 질감만 살림
        m_draw.ellipse([cx + ox - cr, cy + oy - cr, cx + ox + cr, cy + oy + cr], fill=(160, 165, 175, 22))

    m_layer = m_layer.filter(ImageFilter.GaussianBlur(18.0))
    img = Image.alpha_composite(img, m_layer)
    img = img.filter(ImageFilter.GaussianBlur(1.5))
    img.save(os.path.join(BASE_DIR, "celestial", "moon.png"))
    print("✓ celestial/moon.png 개선 완료")

# -------------------------------------------------------------------------
# 4. Paper Texture (바둑판 격자 없는 심리스 요철)
# -------------------------------------------------------------------------

def create_paper():
    """
    paper.png: 규칙적인 사인파 격자를 완전히 없애고
    원환체 랩핑(Torus Seamless Wrapping)을 적용한 천연 수채화지 텍스처
    """
    size = 512
    # 1. 순수 화이트 노이즈 생성
    raw_pixels = [[random.uniform(-1.0, 1.0) for _ in range(size)] for _ in range(size)]

    # 2. 주기적 경계(Periodic boundary)를 갖는 다중 박스 블러로 부드러운 종이 섬유 질감 구성
    blurred = [[0.0] * size for _ in range(size)]
    kernel = 2
    for y in range(size):
        for x in range(size):
            acc = 0.0
            count = 0
            for dy in range(-kernel, kernel + 1):
                for dx in range(-kernel, kernel + 1):
                    # 토러스(원환) 랩핑: x, y가 0~511을 넘어가면 반대편으로 감김 (이음새 100% 제거)
                    nx = (x + dx) % size
                    ny = (y + dy) % size
                    acc += raw_pixels[ny][nx]
                    count += 1
            blurred[y][x] = acc / count

    img = Image.new("RGB", (size, size), (255, 255, 255))
    pixels = img.load()

    # multiply 합성 시 화면이 칙칙해지지 않도록 명암 대비를 248~255 사이로 아주 섬세하게 조정
    for y in range(size):
        for x in range(size):
            val = int(251 + blurred[y][x] * 12.0)
            val = max(242, min(255, val))
            pixels[x, y] = (val, val, val)

    img.save(os.path.join(BASE_DIR, "paper.png"))
    print("✓ paper.png (심리스 결) 개선 완료")

# -------------------------------------------------------------------------
if __name__ == "__main__":
    print("🎨 피드백을 반영하여 수채화 애셋을 다시 생성합니다...\n")
    create_landscape_far()
    create_landscape_mid()
    create_landscape_near()
    create_clouds()
    create_storms()
    create_sun()
    create_moon()
    create_paper()
    print("\n✨ 모든 피드백 사항이 성공적으로 반영되었습니다!")