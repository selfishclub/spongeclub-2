#!/usr/bin/env python3
# 스마트스토어 리뷰 자동 분류 채널 (1단계)
# - 표준 라이브러리만 사용 (pandas/openpyxl 불필요)
# - 입력: 스토어에서 다운로드한 리뷰 엑셀(.xlsx)  ※ 고객정보 포함 → 저장소 밖에 두고 경로만 전달
# - 출력: 일간(환불·CS 대상 / 칭찬 대상 두 표) 또는 월간(경영진 CRM 집계 리포트)
#
# 사용법:
#   python3 triage.py <리뷰.xlsx> --mode daily   [--out 결과.md] [--top 20]
#   python3 triage.py <리뷰.xlsx> --mode monthly [--out 리포트.md]

import zipfile, re, sys, argparse
from xml.etree import ElementTree as ET
from collections import Counter, defaultdict

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

# 부정 신호를 2단계로 나눈다.
# STRONG: 문맥과 거의 무관하게 부정 → 평점이 5점이어도 환불·CS 대상으로 끌어올림
STRONG_NEG = [
    "환불", "반품", "교환해", "교환 요청", "파손", "깨졌", "깨짐", "깨져", "불량", "하자",
    "오배송", "잘못 왔", "잘못왔", "잘못 배송", "누락", "안 왔", "안왔", "안옴",
    "곰팡이", "상했", "썩었", "썩어", "유통기한", "이물질", "터졌", "터짐",
    "중고", "새것 아니", "새 것 아니", "돈 아까", "돈아까", "다신 안", "다시는 안",
    "두 번 다시", "두번다시", "사기", "속았", "최악", "엉망", "형편없",
]
# WEAK: 저평점(3점 이하)일 때만 부정으로 인정 (긍정 문맥에서도 흔히 쓰여 오탐 위험)
WEAK_NEG = [
    "지연", "늦게", "늦었", "너무 느", "배송이 느", "별로", "별루", "실망",
    "냄새", "사이즈 안", "안 맞", "안맞", "짜증", "화가", "화나", "빠졌", "빠짐",
    "구겨", "찌그러", "구김",
]
# 사유 분류(월간 리포트용) — STRONG 위주로 판정
REASON_MAP = {
    "배송지연": ["지연", "늦게", "늦었", "너무 느", "배송이 느", "안 왔", "안왔", "안옴"],
    "파손": ["파손", "깨졌", "깨짐", "깨져", "터졌", "터짐", "구겨", "찌그러", "하자"],
    "오배송/누락": ["오배송", "잘못 왔", "잘못왔", "잘못 배송", "누락", "빠졌", "빠짐"],
    "상품불만/변질": ["불량", "곰팡이", "상했", "썩었", "썩어", "유통기한", "이물질", "중고", "새것 아니", "새 것 아니"],
    "기타불만": ["최악", "별로", "별루", "실망", "돈 아까", "돈아까", "다신 안", "다시는 안",
              "두 번 다시", "두번다시", "짜증", "화가", "화나", "사기", "속았", "엉망", "형편없"],
}
# 체험단·협찬 리뷰 → 진짜 고객 반응이 아니므로 분류에서 제외
# (아래 강한 단어가 하나라도 있으면 단독으로 제외. 공백은 무시하고 비교)
SPONSORED_STRONG = [
    "체험단", "협찬", "원고료", "무상지원", "무상제공", "무상으로지원", "무상으로제공",
    "무료제공", "무료로제공", "제공받아작성", "제공받아작성되", "제품을제공받아",
    "대가를받", "대가로작성", "소정의",
]
# 문구 변형이 다양해서, 아래 세 묶음이 한 문장에 함께 나오면 체험단성으로 판정
SPONSORED_ANY_A = ["업체"]                       # 제공 주체
SPONSORED_ANY_B = ["제공", "지원", "무상", "협찬", "무료"]   # 혜택
SPONSORED_ANY_C = ["작성", "후기", "제품"]         # 리뷰 고지 문구

def _nospace(s):
    return re.sub(r"\s+", "", str(s or ""))

def is_sponsored(row):
    t = _nospace(row["내용"])
    if any(_nospace(k) in t for k in SPONSORED_STRONG):
        return True
    if (any(k in t for k in SPONSORED_ANY_A)
            and any(k in t for k in SPONSORED_ANY_B)
            and any(k in t for k in SPONSORED_ANY_C)):
        return True
    return False

def load_rows(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(f"{NS}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
    sheet = [n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml", n)][0]
    root = ET.fromstring(z.read(sheet))

    def col_num(ref):
        letters = re.match(r"[A-Z]+", ref).group()
        n = 0
        for c in letters:
            n = n * 26 + (ord(c) - 64)
        return n

    grid = []
    for row in root.iter(f"{NS}row"):
        cells = {}
        for c in row.findall(f"{NS}c"):
            ref, t = c.get("r"), c.get("t")
            v, iss = c.find(f"{NS}v"), c.find(f"{NS}is")
            val = None
            if t == "s" and v is not None:
                val = shared[int(v.text)]
            elif t == "inlineStr" and iss is not None:
                val = "".join(x.text or "" for x in iss.iter(f"{NS}t"))
            elif v is not None:
                val = v.text
            cells[col_num(ref)] = val
        grid.append(cells)
    if not grid:
        return []
    maxc = max((max(r) for r in grid if r), default=0)
    header = [grid[0].get(i) for i in range(1, maxc + 1)]

    def cidx(name):
        for i, h in enumerate(header, 1):
            if h and name in str(h):
                return i
        return None

    idx = {k: cidx(k) for k in
           ["상품주문번호", "등록자", "리뷰글번호", "상품명", "구매자평점",
            "리뷰상세내용", "포토/영상", "리뷰도움수", "답글여부", "풀필먼트사", "리뷰등록일"]}
    out = []
    for r in grid[1:]:
        def g(k):
            i = idx[k]
            return r.get(i) if i else None
        text = str(g("리뷰상세내용") or "")
        try:
            score = int(float(g("구매자평점")))
        except (TypeError, ValueError):
            score = None
        try:
            helpful = int(float(g("리뷰도움수") or 0))
        except (TypeError, ValueError):
            helpful = 0
        ff = (g("풀필먼트사") or "").strip()
        photo_raw = (g("포토/영상") or "").strip()
        photo_urls = [u for u in re.split(r"\s+", photo_raw) if u.startswith("http")]
        out.append({
            "주문번호": g("상품주문번호"), "등록자": g("등록자"), "리뷰번호": g("리뷰글번호"),
            "상품명": g("상품명"), "평점": score, "내용": text,
            "포토영상": bool(photo_raw), "포토URL": photo_urls,
            "도움수": helpful, "답글여부": g("답글여부"),
            "배송": "대한통운(풀필먼트)" if ff else "자체공장(도착보장)",
            "등록일": g("리뷰등록일"),
        })
    return out

def strong_hits(text):
    return [k for k in STRONG_NEG if k in text]

def weak_hits(text):
    return [k for k in WEAK_NEG if k in text]

def neg_hits(text):
    return strong_hits(text) + weak_hits(text)

def is_negative(row):
    score = row["평점"]
    text = row["내용"]
    # ① 평점 1~2점 → 무조건 대상
    if score is not None and score <= 2:
        return True
    # ② 명백한 부정 신호(STRONG)가 있으면 5점이어도 대상
    if strong_hits(text):
        return True
    # ③ 애매한 신호(WEAK)는 3점 이하일 때만 인정
    if score is not None and score <= 3 and weak_hits(text):
        return True
    return False

def praise_score(row):
    s = 0
    if row["포토영상"]:
        s += 2
    s += min(len(row["내용"]) / 150.0, 3)
    s += row["도움수"]
    return s

def is_praise(row):
    # 5점 + 부정 신호 없음 + 정성 신호(사진/장문/도움수) → 칭찬 후보
    if row["평점"] != 5 or strong_hits(row["내용"]):
        return False
    return row["포토영상"] or len(row["내용"]) >= 150 or row["도움수"] > 0

def is_top_praise(row):
    # 월간 리포트용 '우수 리뷰'는 더 엄격하게 (선물 발송 검토 대상)
    if row["평점"] != 5 or strong_hits(row["내용"]):
        return False
    return (row["포토영상"] and len(row["내용"]) >= 100) or len(row["내용"]) >= 300 or row["도움수"] >= 3

def summarize(text, n=40):
    t = re.sub(r"\s+", " ", text).strip()
    return (t[:n] + "…") if len(t) > n else t

def esc(x):
    return str(x if x is not None else "").replace("|", "\\|")

MASK = False

def mask_name(x):
    s = str(x or "")
    if not MASK or len(s) <= 1:
        return s
    return s[0] + "*" * (len(s) - 1)

def mask_id(x):
    s = str(x or "")
    if not MASK or len(s) <= 4:
        return s
    return s[:4] + "*" * (len(s) - 4)

def reason_of(text):
    for reason, kws in REASON_MAP.items():
        if any(k in text for k in kws):
            return reason
    return "기타불만"

def daily_report(rows, top):
    neg = [r for r in rows if is_negative(r)]
    neg.sort(key=lambda r: (r["평점"] if r["평점"] is not None else 9, -len(neg_hits(r["내용"]))))
    praise = [r for r in rows if is_praise(r)]
    praise.sort(key=praise_score, reverse=True)
    praise = praise[:top]

    L = []
    L.append(f"# 리뷰 자동 분류 · 일간 리스트  (전체 {len(rows)}건)\n")
    L.append(f"## 🔴 환불·CS 대상 — {len(neg)}건 (전건 미대응)\n")
    L.append("| 상품주문번호 | 등록자 | 리뷰글번호 | 상품명 | 평점 | 배송 | 사유 | 리뷰 요약 |")
    L.append("|---|---|---|---|---|---|---|---|")
    for r in neg:
        L.append("| {} | {} | {} | {} | {} | {} | {} | {} |".format(
            esc(mask_id(r["주문번호"])), esc(mask_name(r["등록자"])), esc(r["리뷰번호"]), esc(summarize(r["상품명"], 20)),
            esc(r["평점"]), esc(r["배송"]), reason_of(r["내용"]), esc(summarize(r["내용"]))))
    L.append(f"\n## 🟢 칭찬 대상 (상 드릴 분) — 상위 {len(praise)}명\n")
    L.append("| 상품주문번호 | 등록자 | 리뷰글번호 | 상품명 | 평점 | 배송 | 포토 | 도움수 | 리뷰 요약 |")
    L.append("|---|---|---|---|---|---|---|---|---|")
    for r in praise:
        L.append("| {} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
            esc(mask_id(r["주문번호"])), esc(mask_name(r["등록자"])), esc(r["리뷰번호"]), esc(summarize(r["상품명"], 20)),
            esc(r["평점"]), esc(r["배송"]), "📷" if r["포토영상"] else "", esc(r["도움수"]),
            esc(summarize(r["내용"]))))
    return "\n".join(L)

def monthly_report(rows):
    total = len(rows)
    score_dist = Counter(r["평점"] for r in rows)
    neg = [r for r in rows if is_negative(r)]
    praise = [r for r in rows if is_top_praise(r)]
    by_reason = Counter(reason_of(r["내용"]) for r in neg)
    by_ship = Counter(r["배송"] for r in neg)

    L = []
    L.append("# 월간 CRM 리포트 (경영진 보고용)\n")
    L.append(f"- 총 리뷰: **{total}건**")
    L.append("- 평점 분포: " + " / ".join(f"{s}점 {score_dist.get(s,0)}"
             for s in [5, 4, 3, 2, 1]))
    L.append(f"\n## 🔴 고객만족보장(환불·CS) 대상")
    L.append(f"- 대상: **{len(neg)}건 / 인원 {len(set(r['등록자'] for r in neg))}명**")
    L.append(f"- 환불 금액: _주문번호로 정산 데이터 조회 필요 (리뷰 파일엔 금액 없음)_")
    L.append("- 부정 사유별:")
    for reason, cnt in by_reason.most_common():
        L.append(f"    - {reason}: {cnt}건")
    L.append("- 배송 출발지별 부정 리뷰:")
    for ship, cnt in by_ship.most_common():
        L.append(f"    - {ship}: {cnt}건")
    L.append(f"\n## 🟢 칭찬(팬 만들기) 대상")
    L.append(f"- 후보: **{len(praise)}명** (선물·쿠폰·손편지 발송 검토)")
    return "\n".join(L)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--mode", choices=["daily", "monthly"], default="daily")
    ap.add_argument("--out")
    ap.add_argument("--top", type=int, default=20)
    ap.add_argument("--mask", action="store_true", help="이름·주문번호를 가려서 출력 (공개·스크린샷용)")
    a = ap.parse_args()
    global MASK
    MASK = a.mask
    all_rows = load_rows(a.xlsx)
    rows = [r for r in all_rows if not is_sponsored(r)]
    excluded = len(all_rows) - len(rows)
    note = f"> ℹ️ 체험단·협찬 리뷰 {excluded}건 제외 후 분석 (전체 {len(all_rows)}건 → 실고객 {len(rows)}건)\n\n"
    body = daily_report(rows, a.top) if a.mode == "daily" else monthly_report(rows)
    report = note + body
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"저장됨: {a.out}  ({len(rows)}건 처리)")
    else:
        print(report)

if __name__ == "__main__":
    main()
