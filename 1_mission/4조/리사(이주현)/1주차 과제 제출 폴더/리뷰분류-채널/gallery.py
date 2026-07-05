#!/usr/bin/env python3
# 리뷰 사진 갤러리 생성기 — 리뷰 엑셀의 고객 첨부 사진을 다운로드해 HTML 한 파일에 심는다.
# ⚠️ 내부 CS용: 실제 주문번호·이름이 그대로 들어간다. 저장소에 올리지 말고 로컬(바탕화면)에만 둘 것.
#
# 사용법:
#   python3 gallery.py <리뷰.xlsx> --out ~/Desktop/리뷰사진갤러리.html [--praise-top 30]

import io, argparse, base64, html, urllib.request, urllib.error
import triage as t
from PIL import Image

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36"}
MAX_PX = 600   # 긴 변 기준 축소 크기

def fetch(url, timeout=15):
    """원본을 받아 Pillow로 축소·재인코딩한 data URI 반환 (용량 절감)."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError):
        return None
    try:
        im = Image.open(io.BytesIO(data))
        im = im.convert("RGB")
        im.thumbnail((MAX_PX, MAX_PX))
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=80, optimize=True)
        return "data:image/jpeg;base64,%s" % base64.b64encode(buf.getvalue()).decode()
    except Exception:
        # 축소 실패 시 원본이라도 심는다
        return "data:image/jpeg;base64,%s" % base64.b64encode(data).decode()

MASK = False

def esc(x):
    return html.escape(str(x if x is not None else ""))

def mask_order(x):
    s = str(x or "")
    if not MASK or len(s) <= 4:
        return s
    return s[:4] + "*" * (len(s) - 4)

def card(row, kind):
    imgs = []
    for u in row["포토URL"]:
        d = fetch(u)
        if d:
            imgs.append('<img loading="lazy" src="%s">' % d)
    if not imgs:
        return None, 0  # 사진 다운로드 전부 실패 → 스킵
    reason = t.reason_of(row["내용"]) if kind == "neg" else ("📷사진 · 도움수 %s" % row["도움수"])
    badge = "🔴 환불·CS" if kind == "neg" else "🟢 칭찬"
    return ("""
    <div class="card {cls}">
      <div class="imgs">{imgs}</div>
      <div class="meta">
        <div class="top"><span class="badge">{badge}</span> <span class="score">{score}점</span> <span class="ship">{ship}</span></div>
        <div class="prod">{prod}</div>
        <div class="reason">{reason}</div>
        <div class="body">{body}</div>
        <div class="ids">주문 {order} · {name} · 리뷰 {rid}</div>
      </div>
    </div>""".format(
        cls=kind, imgs="".join(imgs), badge=badge, score=esc(row["평점"]),
        ship=esc(row["배송"]), prod=esc(row["상품명"]), reason=esc(reason),
        body=esc(row["내용"]), order=esc(mask_order(row["주문번호"])), name=esc(row["등록자"]),
        rid=esc(row["리뷰번호"]),
    ), len(imgs))

def section(title, rows, kind):
    parts, ok, imgcnt = [], 0, 0
    for r in rows:
        c, n = card(r, kind)
        if c:
            parts.append(c); ok += 1; imgcnt += n
        print("  ...%s %d/%d" % (title, ok, len(rows)), end="\r", flush=True)
    print()
    head = '<h2>%s — %d건 (사진 %d장)</h2>' % (esc(title), ok, imgcnt)
    return head + '<div class="grid">' + "".join(parts) + "</div>", ok, imgcnt

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--out", required=True)
    ap.add_argument("--praise-top", type=int, default=30)
    ap.add_argument("--mask", action="store_true", help="주문번호 마스킹 (공개·스크린샷용)")
    a = ap.parse_args()
    global MASK
    MASK = a.mask

    rows = t.load_rows(a.xlsx)
    real = [r for r in rows if not t.is_sponsored(r)]
    neg = [r for r in real if t.is_negative(r) and r["포토URL"]]
    praise = sorted([r for r in real if t.is_praise(r) and r["포토URL"]],
                    key=t.praise_score, reverse=True)[:a.praise_top]
    print("환불·CS 대상 사진 %d건, 칭찬 상위 %d건 다운로드 시작..." % (len(neg), len(praise)))

    s1, n1, i1 = section("🔴 환불·CS 대상", neg, "neg")
    s2, n2, i2 = section("🟢 칭찬 대상", praise, "praise")

    page = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>리뷰 사진 갤러리</title>
<style>
 body{{font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;margin:0;background:#f5f5f7;color:#1d1d1f}}
 header{{padding:20px 24px;background:#fff;border-bottom:1px solid #e5e5e7;position:sticky;top:0;z-index:9}}
 header h1{{margin:0;font-size:20px}}
 header .note{{color:#86868b;font-size:13px;margin-top:4px}}
 h2{{padding:0 24px;margin:28px 0 8px}}
 .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;padding:0 24px}}
 .card{{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);display:flex;flex-direction:column}}
 .card.neg{{border-top:4px solid #e0483e}} .card.praise{{border-top:4px solid #34a853}}
 .imgs{{display:flex;gap:4px;overflow-x:auto;background:#f0f0f2}}
 .imgs img{{width:100%;height:240px;object-fit:cover;flex:0 0 100%}}
 .meta{{padding:12px 14px;font-size:13px;line-height:1.5}}
 .top{{display:flex;gap:8px;align-items:center;margin-bottom:6px}}
 .badge{{font-weight:700}} .score{{background:#f0f0f2;border-radius:6px;padding:1px 7px;font-weight:600}}
 .ship{{color:#86868b;font-size:12px}}
 .prod{{font-weight:600;margin-bottom:4px}}
 .reason{{color:#e0483e;font-size:12px;margin-bottom:6px}}
 .card.praise .reason{{color:#34a853}}
 .body{{color:#333;max-height:120px;overflow:auto;white-space:pre-wrap}}
 .ids{{color:#a1a1a6;font-size:11px;margin-top:8px;border-top:1px solid #f0f0f2;padding-top:6px}}
</style></head><body>
<header><h1>📸 리뷰 사진 갤러리</h1>
<div class="note">내부 CS용 · 실제 주문번호 포함 → 공유·업로드 금지 · 체험단 제외 · 환불{n1}건 / 칭찬{n2}건 (사진 {tot}장)</div></header>
{s1}{s2}
</body></html>""".format(n1=n1, n2=n2, tot=i1 + i2, s1=s1, s2=s2)

    with open(a.out, "w", encoding="utf-8") as f:
        f.write(page)
    print("완료 → %s  (환불 %d + 칭찬 %d = 사진 %d장)" % (a.out, n1, n2, i1 + i2))

if __name__ == "__main__":
    main()
