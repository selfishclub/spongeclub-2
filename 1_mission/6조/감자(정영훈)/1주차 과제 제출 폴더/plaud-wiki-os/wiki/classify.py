"""사업 도메인 분류 — 노드를 4개 버킷으로 LLM(Haiku) 분류.

기술 소스(layer: ontology/memory/rules/claude/docs)와 별개로, 각 문서의 *내용*을
Haiku 가 읽어 사업 도메인 4종으로 그룹핑한다. 사용자가 검토·오버라이드할 수 있다.

- 분류 대상: 내용이 있는 비-dangling 노드만. dangling 은 bucket="dangling" 로 별도.
- 캐시: 노드별 (MODEL+id+text) 해시로 `.classify_cache.json` 에 저장.
  부분 변경 시 바뀐/새 노드만 재분류 (embed.py 캐시 패턴 미러).
- 오버라이드: `overrides.json` ({node_id: bucket}) 이 있으면 분류 위에 항상 우선 적용.
- 거래처 기밀 → 캐시·리뷰·오버라이드 파일 모두 .gitignore 처리.
"""
import hashlib
import json
import re
from pathlib import Path

BUCKETS = ["대행사업", "자체제품", "퍼스널브랜딩", "그외"]
MODEL = "claude-haiku-4-5-20251001"

FALLBACK = "그외"                                  # LLM 실패/미분류 안전 폴백
DANGLING_BUCKET = "dangling"
BATCH = 22                                        # LLM 호출당 노드 수 (~20-25)
EXCERPT = 400                                     # 노드당 발췌 길이

_ROOT = Path(__file__).resolve().parent.parent
_CACHE = _ROOT / ".classify_cache.json"
_OVERRIDES = _ROOT / "overrides.json"

RUBRIC = (
    "너는 사용자의 지식 베이스 문서를 사업 도메인 4종으로 분류하는 분류기다. "
    "각 문서를 아래 4개 버킷 중 정확히 하나로 배정하라.\n\n"
    "- 대행사업: 회사 운영·영업·거래처 마케팅 대행 작업 전반(자사 마케팅·가격·브랜드·영업·재무·운영 "
    "AND 거래처 마케팅 작업 전반, 마케팅 방법론, 광고 파이프라인, 거래처 작업 규칙).\n"
    "- 자체제품: 자체 서비스/프로덕트(자체 벤처·플랫폼 사업계획, 자체 앱/서비스 운영).\n"
    "- 퍼스널브랜딩: 개인 브랜딩·콘텐츠(카드뉴스, personal-brand 프로젝트, 개인 브랜딩 콘텐츠).\n"
    "- 그외: 위에 안 맞는 것 전부(일반 코딩/개발 규칙 python/typescript/golang, 토스 미니앱, "
    "음악 봇, recall 시스템, 내부 툴링, 실험).\n\n"
    "반드시 JSON 배열만 출력하라. 각 원소는 "
    '{"i": <번호>, "bucket": "<4개 중 정확히 하나>", "confidence": <0~1 실수>, '
    '"reason": "<10단어 이하 한국어 근거>"}. '
    "설명·마크다운·코드펜스 없이 JSON 배열만."
)


def _node_text(node):
    """캐시 해시·발췌용 노드 텍스트: 제목 + 절단된 search_text."""
    st = (node.get("search_text") or "")[:EXCERPT]
    return f"{node.get('title', '')}\n{st}"


def _content_hash(node):
    h = hashlib.sha256()
    h.update(MODEL.encode("utf-8"))
    h.update(b"\x00")
    h.update(str(node.get("id", "")).encode("utf-8"))
    h.update(b"\x00")
    h.update(_node_text(node).encode("utf-8"))
    return h.hexdigest()


def _candidates(nodes):
    """내용 있는 비-dangling 노드만 분류 대상."""
    return [n for n in nodes if not n.get("dangling") and n.get("search_text")]


def _call_llm(system, user):
    import anthropic
    client = anthropic.Anthropic()                # ANTHROPIC_API_KEY 환경변수 사용
    resp = client.messages.create(
        model=MODEL, max_tokens=2000,
        system=system, messages=[{"role": "user", "content": user}])
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")


def _extract_json(text):
    """코드펜스·잡음을 견디며 JSON 배열을 파싱. 실패 시 []."""
    if not text:
        return []
    t = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", t, re.S)
    if m:
        t = m.group(1).strip()
    start = t.find("[")
    end = t.rfind("]")
    if start >= 0 and end > start:
        t = t[start:end + 1]
    try:
        data = json.loads(t)
        return data if isinstance(data, list) else []
    except (ValueError, TypeError):
        return []


def _classify_batch(batch, call):
    """batch(list of node) → {node_id: {bucket, confidence, reason}}. call 은 _call_llm."""
    lines = []
    for i, n in enumerate(batch, 1):
        st = (n.get("search_text") or "")[:EXCERPT].replace("\n", " ")
        lines.append(f"[{i}] {n.get('title', '') or n['id']}: {st}")
    user = "다음 문서들을 분류하라.\n\n" + "\n\n".join(lines)
    parsed = _extract_json(call(RUBRIC, user))
    by_idx = {}
    for item in parsed:
        try:
            idx = int(item.get("i"))
        except (TypeError, ValueError):
            continue
        by_idx[idx] = item
    out = {}
    for i, n in enumerate(batch, 1):
        item = by_idx.get(i)
        bucket = (item or {}).get("bucket")
        if bucket not in BUCKETS:
            bucket = FALLBACK
        try:
            conf = float((item or {}).get("confidence", 0.0))
        except (TypeError, ValueError):
            conf = 0.0
        conf = max(0.0, min(1.0, conf))
        reason = str((item or {}).get("reason", "") or "")[:80]
        if item is None:                          # LLM 이 아예 누락 → 폴백
            conf, reason = 0.0, "미분류 폴백"
        out[n["id"]] = {"bucket": bucket, "confidence": conf, "reason": reason}
    return out


def _load_cache():
    if not _CACHE.exists():
        return {}
    try:
        data = json.loads(_CACHE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _save_cache(cache):
    try:
        _CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass                                      # 캐시 실패는 치명적 아님


def _load_overrides():
    """overrides.json ({node_id: bucket}) 로드. 유효 버킷만 반환(무효는 경고+무시)."""
    if not _OVERRIDES.exists():
        return {}
    try:
        raw = json.loads(_OVERRIDES.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"⚠️  overrides.json 읽기 실패 ({e!r}) — 무시합니다.")
        return {}
    if not isinstance(raw, dict):
        print("⚠️  overrides.json 형식 오류(딕셔너리 아님) — 무시합니다.")
        return {}
    valid = {}
    for nid, bucket in raw.items():
        if bucket in BUCKETS:
            valid[str(nid)] = bucket
        else:
            print(f"⚠️  overrides.json: '{nid}' 의 버킷 '{bucket}' 은 4종이 아님 — 무시.")
    return valid


def classify_nodes(nodes, call=None):
    """비-dangling 노드를 LLM 분류. {id: {bucket, confidence, reason}} 반환.

    - 노드별 콘텐츠 해시로 캐시(부분 재사용). 캐시 히트는 LLM 호출 스킵.
    - call 을 주입하면(테스트) 실제 API 없이 동작. 기본은 _call_llm.
    - 분류 후 overrides.json 을 위에 적용(항상 우선).
    """
    call = call or _call_llm
    cand = _candidates(nodes)
    cache = _load_cache()

    results = {}
    todo = []
    for n in cand:
        key = _content_hash(n)
        hit = cache.get(key)
        if hit and hit.get("bucket") in BUCKETS:
            results[n["id"]] = {"bucket": hit["bucket"],
                                "confidence": float(hit.get("confidence", 0.0)),
                                "reason": hit.get("reason", "")}
        else:
            todo.append((n, key))

    for start in range(0, len(todo), BATCH):
        chunk = todo[start:start + BATCH]
        batch_res = _classify_batch([n for n, _ in chunk], call)
        for n, key in chunk:
            res = batch_res.get(n["id"],
                                {"bucket": FALLBACK, "confidence": 0.0, "reason": "미분류 폴백"})
            results[n["id"]] = res
            cache[key] = res

    if todo:
        _save_cache(cache)

    for nid, bucket in _load_overrides().items():
        if nid in results:
            results[nid] = {"bucket": bucket, "confidence": 1.0, "reason": "사용자 오버라이드"}

    return results


def bucket_counts(nodes):
    """버킷별 노드 수 (dangling 포함)."""
    counts = {}
    for n in nodes:
        b = n.get("bucket", FALLBACK)
        counts[b] = counts.get(b, 0) + 1
    return counts


def write_review(nodes, path, call=None):
    """classification_review.md 작성 — 사용자의 검토 산출물.

    상단에 버킷별 카운트, 그 다음 저신뢰(<0.6) 섹션, 이어서 버킷별 노드 목록
    (제목·id·confidence·reason). 캐시를 쓰므로 재실행이 저렴하다.
    반환: 버킷별 카운트 dict (stdout 출력용).
    """
    results = classify_nodes(nodes, call=call)   # 캐시 히트 → 저렴
    assign_buckets(nodes, call=call)
    counts = bucket_counts(nodes)

    def row(n):
        r = results.get(n["id"], {})
        conf = r.get("confidence", 0.0)
        reason = r.get("reason", "") or "-"
        title = n.get("title") or n["id"]
        return f"- {title} · `{n['id']}` · 신뢰도 {conf:.2f} · {reason}"

    lines = ["# 사업 도메인 분류 검토\n"]
    lines.append("## 요약 (버킷별 노드 수)\n")
    for b in BUCKETS + [DANGLING_BUCKET]:
        if counts.get(b):
            lines.append(f"- **{b}**: {counts[b]}개")
    lines.append("")

    low = [n for n in nodes if not n.get("dangling")
           and results.get(n["id"], {}).get("confidence", 0.0) < 0.6]
    lines.append(f"## ⚠️ 저신뢰(검토 필요) — {len(low)}개\n")
    lines.append("신뢰도 0.6 미만. 여기부터 눈으로 확인하세요. "
                 "틀린 항목은 `overrides.json` 에 `\"<id>\": \"<버킷>\"` 로 교정.\n")
    if low:
        low.sort(key=lambda n: results.get(n["id"], {}).get("confidence", 0.0))
        for n in low:
            r = results.get(n["id"], {})
            lines.append(f"- [{r.get('bucket', FALLBACK)}] {row(n)[2:]}")
    else:
        lines.append("- (없음)")
    lines.append("")

    for b in BUCKETS:
        members = [n for n in nodes if n.get("bucket") == b]
        lines.append(f"## {b} — {len(members)}개\n")
        if members:
            members.sort(key=lambda n: -results.get(n["id"], {}).get("confidence", 0.0))
            lines.extend(row(n) for n in members)
        else:
            lines.append("- (없음)")
        lines.append("")

    Path(path).write_text("\n".join(lines), encoding="utf-8")
    return counts


def assign_buckets(nodes, call=None):
    """classify(캐시)+오버라이드를 실행하고 각 노드에 bucket 필드를 채워 반환.

    dangling 노드 → bucket="dangling"(별도). 미분류 → "그외" 안전 폴백.
    """
    results = classify_nodes(nodes, call=call)
    for n in nodes:
        if n.get("dangling"):
            n["bucket"] = DANGLING_BUCKET
        else:
            r = results.get(n["id"])
            n["bucket"] = r["bucket"] if r else FALLBACK
    return nodes
