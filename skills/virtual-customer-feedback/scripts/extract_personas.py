#!/usr/bin/env python3
"""
Nemotron-Personas-Korea에서 조건에 맞는 페르소나를 추출해
가상 고객 피드백 스킬용 페르소나 카드(.md)로 저장하는 스크립트.

사용 예:
  pip install datasets
  python extract_personas.py --occupation 마케팅 --n 5
  python extract_personas.py --age-min 25 --age-max 39 --province 서울 --n 8
  python extract_personas.py --keyword 배달 --n 5   # 서술 전체에서 키워드 검색

주의: 데이터셋 전체(약 수 GB)를 스트리밍으로 훑으므로 첫 실행은 네트워크 필요.
"""

import argparse
import sys


def build_card(idx: int, r: dict) -> str:
    name_line = r["persona"].split("는", 1)[0].strip() or "이름 미상"
    lines = [
        f"### X{idx}. {name_line} — {r['age']}세 {r['sex']} · {r['occupation']} · {r['province']} {r['district'].split('-')[-1]}",
        f"- 종합: {r['persona']}",
        f"- 가족/주거: {r['family_type']} · {r['housing_type']} / {r['family_persona']}",
        f"- 소비·식습관: {r['culinary_persona']}",
        f"- 취미·일상: {r['hobbies_and_interests']}",
        f"- 성향·배경: {r['cultural_background']}",
        f"- 목표: {r['career_goals_and_ambitions']}",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--occupation", help="직업명에 포함될 키워드 (예: 마케팅, 교사, 간호)")
    p.add_argument("--province", help="시도 (예: 서울, 경기, 부산)")
    p.add_argument("--sex", choices=["남자", "여자"])
    p.add_argument("--age-min", type=int, default=0)
    p.add_argument("--age-max", type=int, default=200)
    p.add_argument("--keyword", help="페르소나 서술 전체에서 찾을 키워드 (예: 배달, 골프, 육아)")
    p.add_argument("--n", type=int, default=5, help="추출할 인원 수 (기본 5)")
    p.add_argument("--out", default="extracted-personas.md", help="출력 파일명")
    args = p.parse_args()

    try:
        from datasets import load_dataset
    except ImportError:
        sys.exit("datasets 라이브러리가 필요합니다: pip install datasets")

    ds = load_dataset("nvidia/Nemotron-Personas-Korea", split="train", streaming=True)

    def match(r: dict) -> bool:
        if not (args.age_min <= r["age"] <= args.age_max):
            return False
        if args.sex and r["sex"] != args.sex:
            return False
        if args.province and args.province not in r["province"]:
            return False
        if args.occupation and args.occupation not in r["occupation"]:
            return False
        if args.keyword:
            blob = " ".join(
                str(r[k]) for k in (
                    "persona", "professional_persona", "culinary_persona",
                    "hobbies_and_interests", "skills_and_expertise",
                )
            )
            if args.keyword not in blob:
                return False
        return True

    cards, scanned = [], 0
    for r in ds:
        scanned += 1
        if match(r):
            cards.append(build_card(len(cards) + 1, r))
            print(f"[{len(cards)}/{args.n}] {r['age']}세 {r['sex']} {r['occupation']} ({r['province']})")
            if len(cards) >= args.n:
                break
        if scanned % 50000 == 0:
            print(f"  ... {scanned:,}건 스캔 중")

    if not cards:
        sys.exit("조건에 맞는 페르소나를 찾지 못했습니다. 조건을 완화해 보세요.")

    header = (
        "# 추출 페르소나 카드\n\n"
        "출처: nvidia/Nemotron-Personas-Korea (CC BY 4.0)\n"
        f"조건: occupation={args.occupation} province={args.province} "
        f"age={args.age_min}~{args.age_max} keyword={args.keyword}\n\n---\n\n"
    )
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(cards))
    print(f"\n완료: {len(cards)}명 → {args.out}")


if __name__ == "__main__":
    main()
