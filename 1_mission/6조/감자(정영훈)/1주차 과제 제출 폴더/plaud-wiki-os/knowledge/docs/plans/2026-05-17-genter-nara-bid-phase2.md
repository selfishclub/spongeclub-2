# genter-nara-bid Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notion DB에서 사용자가 지정한 공고 1건에 대해 RFP 첨부파일을 자동 다운로드·텍스트 변환(HWP/HWPX/PDF/DOCX)하고, LLM이 6-STEP 분석(`rfp_analysis_template.md`)과 업종코드 추출을 수행하여 `02_rfp_archive/{사업폴더}/` 하위에 분석 문서를 저장한다.

**Architecture:** CLI 명령(`analyze_rfp.py <공고번호>`)으로 트리거. 5개 모듈(`attachment_downloader`·`hwp_convert`·`industry_check`·`rfp_analyzer`·`notion_query`) + entry point. HWP 구포맷은 LibreOffice headless, HWPX는 python-hwpx, PDF는 pdfplumber. 분석은 Claude Sonnet, 업종 추출은 Haiku. 결과는 cowork `02_rfp_archive/` 폴더 규약에 그대로 적재.

**Tech Stack:** Python 3.11, httpx, pdfplumber, python-hwpx, python-docx, anthropic SDK, LibreOffice (brew install --cask libreoffice).

**Scope:** spec v2 Phase 2~3 통합 + 사용자 결정 옵션 3 (업종 자동 체크). Phase 5 dispatcher(자동 5분 cron)는 별도 plan.

---

## Prerequisites (사람이 직접)

- [ ] **LibreOffice 설치**
  ```bash
  brew install --cask libreoffice
  soffice --version  # 검증
  ```
  HWP 구포맷 변환에 필요. python-hwpx는 HWPX만 처리하므로 fallback이 필요하다.

- [ ] **Phase 1 운영 데이터 1건 이상** — Notion DB에 매칭 공고가 최소 1건 있어야 라이브 검증 가능. Phase 1 dry-run에서 적재한 `R26BK01527139`로 충분.

---

## File Structure

이번 Phase에서 새로 만드는 파일:

```
genter-nara-bid/
├── scripts/
│   ├── analyze_rfp.py                  # Create (Task 7) — CLI entry point
│   └── lib/
│       ├── attachment_downloader.py    # Create (Task 2)
│       ├── hwp_convert.py              # Create (Task 3)
│       ├── industry_check.py           # Create (Task 5)
│       ├── notion_query.py             # Create (Task 4)
│       └── rfp_analyzer_core.py        # Create (Task 6)
└── tests/
    ├── test_attachment_downloader.py   # Create (Task 2)
    ├── test_hwp_convert.py             # Create (Task 3)
    ├── test_industry_check.py          # Create (Task 5)
    ├── test_notion_query.py            # Create (Task 4)
    ├── test_rfp_analyzer_core.py       # Create (Task 6)
    └── test_analyze_rfp.py             # Create (Task 7)
```

수정하는 파일:
- `genter-nara-bid/pyproject.toml` — pdfplumber, python-hwpx, python-docx 추가
- `genter-nara-bid/scripts/setup/create_notion_db.py` — 새 필드 4개 추가
- 라이브 Notion DB — PATCH로 새 컬럼 4개

**파일 책임 분리:**
- `attachment_downloader.py` — HTTP 다운로드만. 파일 경로 list 반환.
- `hwp_convert.py` — 포맷별 텍스트 추출. 통합 인터페이스 `extract_text(path) -> str`.
- `industry_check.py` — 텍스트에서 업종코드 LLM 추출. `{matched, found_codes, required_codes}` 반환.
- `notion_query.py` — Notion DB에서 공고번호로 page 검색 + 페이지 업데이트.
- `rfp_analyzer_core.py` — RFP 텍스트 → 6-STEP 분석 JSON (Sonnet).
- `analyze_rfp.py` — 위 모듈을 묶어 CLI로 실행.

---

## Tasks

### Task 1: 프로젝트 의존성 추가 + LibreOffice 검증

**Files:**
- Modify: `genter-nara-bid/pyproject.toml`

- [ ] **Step 1: pyproject.toml에 의존성 추가**

`genter-nara-bid/pyproject.toml`의 `dependencies` 리스트에 다음 3개를 추가:

```toml
dependencies = [
    "httpx>=0.27",
    "anthropic>=0.40",
    "python-dotenv>=1.0",
    "pdfplumber>=0.11",
    "python-docx>=1.1",
    "python-hwpx>=0.1",
]
```

`pydantic` 라인은 이전에 제거됨. 그대로 둔다.

- [ ] **Step 2: 설치**

```bash
cd "/Users/user/Desktop/claude code/genter-nara-bid"
.venv/bin/pip install -e ".[dev]" 2>&1 | tail -5
```

Expected: `Successfully installed pdfplumber-... python-docx-... python-hwpx-...` (또는 already installed). 에러 없어야 한다.

- [ ] **Step 3: LibreOffice 검증**

```bash
soffice --version 2>&1 | head -1
```

Expected: `LibreOffice 24.x.x ...`

설치 안 됐으면 BLOCKED 상태로 보고하고 사용자에게 `brew install --cask libreoffice` 안내.

- [ ] **Step 4: 기존 테스트 그대로 PASS 확인**

```bash
.venv/bin/pytest -v 2>&1 | tail -3
```

Expected: `29 passed`. 새 의존성이 기존 테스트 깨뜨리지 않음.

- [ ] **Step 5: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/pyproject.toml
git commit -m "chore(genter-nara-bid): Phase 2 의존성 추가 (pdfplumber·python-docx·python-hwpx)"
```

---

### Task 2: attachment_downloader (TDD)

공고의 `ntceSpecDocUrl1~10` 필드에서 파일 다운로드. 폴더 경로 받아서 저장.

**Files:**
- Create: `genter-nara-bid/scripts/lib/attachment_downloader.py`
- Create: `genter-nara-bid/tests/test_attachment_downloader.py`

- [ ] **Step 1: 실패 테스트 작성**

`genter-nara-bid/tests/test_attachment_downloader.py`:

```python
from pathlib import Path
import httpx
import respx
from scripts.lib.attachment_downloader import download_attachments, extract_urls

def test_extract_urls_from_bid():
    bid = {
        "ntceSpecDocUrl1": "https://example.com/a.hwp",
        "ntceSpecDocUrl2": "https://example.com/b.pdf",
        "ntceSpecDocUrl3": "",
        "ntceSpecDocUrl4": None,
        "ntceSpecFileNm1": "제안요청서.hwp",
        "ntceSpecFileNm2": "과업지시서.pdf",
    }
    urls = extract_urls(bid)
    assert urls == [
        ("https://example.com/a.hwp", "제안요청서.hwp"),
        ("https://example.com/b.pdf", "과업지시서.pdf"),
    ]

def test_extract_urls_empty():
    bid = {"ntceSpecDocUrl1": "", "ntceSpecFileNm1": ""}
    assert extract_urls(bid) == []

@respx.mock
def test_download_attachments_saves_files(tmp_path):
    respx.get("https://example.com/a.hwp").mock(return_value=httpx.Response(200, content=b"HWP_BINARY_DATA"))
    respx.get("https://example.com/b.pdf").mock(return_value=httpx.Response(200, content=b"%PDF-1.4 fake"))
    bid = {
        "ntceSpecDocUrl1": "https://example.com/a.hwp",
        "ntceSpecDocUrl2": "https://example.com/b.pdf",
        "ntceSpecFileNm1": "제안요청서.hwp",
        "ntceSpecFileNm2": "과업지시서.pdf",
    }
    paths = download_attachments(bid, tmp_path)
    assert len(paths) == 2
    assert paths[0].name == "제안요청서.hwp"
    assert paths[0].read_bytes() == b"HWP_BINARY_DATA"
    assert paths[1].name == "과업지시서.pdf"

@respx.mock
def test_download_attachments_handles_failures(tmp_path):
    """다운로드 실패 1건이 다른 파일 차단 안 함."""
    respx.get("https://example.com/ok.pdf").mock(return_value=httpx.Response(200, content=b"OK"))
    respx.get("https://example.com/fail.hwp").mock(return_value=httpx.Response(500))
    bid = {
        "ntceSpecDocUrl1": "https://example.com/fail.hwp",
        "ntceSpecDocUrl2": "https://example.com/ok.pdf",
        "ntceSpecFileNm1": "fail.hwp",
        "ntceSpecFileNm2": "ok.pdf",
    }
    paths = download_attachments(bid, tmp_path)
    # 실패한 fail.hwp는 skip, ok.pdf만 반환
    assert len(paths) == 1
    assert paths[0].name == "ok.pdf"
```

- [ ] **Step 2: 실패 확인**

```bash
cd "/Users/user/Desktop/claude code/genter-nara-bid"
.venv/bin/pytest tests/test_attachment_downloader.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`genter-nara-bid/scripts/lib/attachment_downloader.py`:

```python
import logging
from pathlib import Path
import httpx

logger = logging.getLogger(__name__)


def extract_urls(bid: dict) -> list[tuple[str, str]]:
    """공고 dict에서 (url, filename) 페어를 추출. 최대 10개 슬롯."""
    result: list[tuple[str, str]] = []
    for i in range(1, 11):
        url = bid.get(f"ntceSpecDocUrl{i}") or ""
        name = bid.get(f"ntceSpecFileNm{i}") or ""
        if url and name:
            result.append((url, name))
    return result


def download_attachments(bid: dict, target_dir: Path) -> list[Path]:
    """공고 첨부파일을 다운로드하여 target_dir에 저장. 실패한 파일은 skip."""
    target_dir.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []
    for url, name in extract_urls(bid):
        try:
            r = httpx.get(url, timeout=60, follow_redirects=True)
            r.raise_for_status()
            path = target_dir / name
            path.write_bytes(r.content)
            saved.append(path)
        except Exception as e:
            logger.warning(f"첨부 다운로드 실패 {name}: {e}")
    return saved
```

- [ ] **Step 4: 테스트 통과**

```bash
.venv/bin/pytest tests/test_attachment_downloader.py -v
```

Expected: 4 PASSED.

- [ ] **Step 5: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/scripts/lib/attachment_downloader.py genter-nara-bid/tests/test_attachment_downloader.py
git commit -m "feat(genter-nara-bid): RFP 첨부 다운로드 모듈"
```

---

### Task 3: hwp_convert — 포맷별 텍스트 추출 (TDD)

HWP/HWPX/PDF/DOCX 모두 단일 인터페이스로 텍스트 추출.

**Files:**
- Create: `genter-nara-bid/scripts/lib/hwp_convert.py`
- Create: `genter-nara-bid/tests/test_hwp_convert.py`

- [ ] **Step 1: 테스트 작성**

`genter-nara-bid/tests/test_hwp_convert.py`:

```python
from pathlib import Path
from unittest.mock import MagicMock
from scripts.lib.hwp_convert import extract_text


def test_extract_text_pdf(tmp_path, mocker):
    """PDF는 pdfplumber로 추출."""
    pdf_path = tmp_path / "test.pdf"
    pdf_path.write_bytes(b"%PDF-1.4 fake")

    mock_page = MagicMock()
    mock_page.extract_text.return_value = "PDF 내용 1페이지"
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=None)
    mocker.patch("scripts.lib.hwp_convert.pdfplumber.open", return_value=mock_pdf)

    text = extract_text(pdf_path)
    assert "PDF 내용" in text


def test_extract_text_docx(tmp_path, mocker):
    """DOCX는 python-docx로 추출."""
    docx_path = tmp_path / "test.docx"
    docx_path.write_bytes(b"PK\x03\x04 fake docx")

    mock_para1 = MagicMock(text="첫 문단")
    mock_para2 = MagicMock(text="둘째 문단")
    mock_doc = MagicMock(paragraphs=[mock_para1, mock_para2])
    mocker.patch("scripts.lib.hwp_convert.docx.Document", return_value=mock_doc)

    text = extract_text(docx_path)
    assert "첫 문단" in text and "둘째 문단" in text


def test_extract_text_hwpx(tmp_path, mocker):
    """HWPX는 python-hwpx로 추출."""
    hwpx_path = tmp_path / "test.hwpx"
    hwpx_path.write_bytes(b"PK fake hwpx")

    mock_doc = MagicMock()
    mock_doc.get_text.return_value = "HWPX 본문 텍스트"
    mocker.patch("scripts.lib.hwp_convert._open_hwpx", return_value=mock_doc)

    text = extract_text(hwpx_path)
    assert "HWPX 본문 텍스트" in text


def test_extract_text_hwp_via_libreoffice(tmp_path, mocker):
    """HWP는 LibreOffice headless로 docx 변환 후 추출."""
    hwp_path = tmp_path / "test.hwp"
    hwp_path.write_bytes(b"HWP fake binary")

    # subprocess.run mock — LibreOffice 호출
    run_mock = MagicMock(returncode=0)
    mocker.patch("scripts.lib.hwp_convert.subprocess.run", return_value=run_mock)

    # 변환된 docx 파일이 있다고 가정 — _docx_to_text를 mock
    mocker.patch("scripts.lib.hwp_convert._docx_to_text", return_value="HWP에서 변환된 텍스트")
    # 변환된 docx 파일 존재 시뮬레이션
    converted = tmp_path / "test.docx"
    converted.write_bytes(b"fake")

    text = extract_text(hwp_path)
    assert "HWP에서 변환된 텍스트" in text


def test_extract_text_unsupported_returns_empty(tmp_path):
    """미지원 확장자는 빈 문자열 반환 (raise 안 함)."""
    p = tmp_path / "test.xls"
    p.write_bytes(b"x")
    assert extract_text(p) == ""
```

- [ ] **Step 2: 실패 확인**

```bash
.venv/bin/pytest tests/test_hwp_convert.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`genter-nara-bid/scripts/lib/hwp_convert.py`:

```python
import logging
import subprocess
from pathlib import Path

import docx
import pdfplumber

logger = logging.getLogger(__name__)


def _pdf_to_text(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _docx_to_text(path: Path) -> str:
    doc = docx.Document(path)
    return "\n".join(p.text for p in doc.paragraphs)


def _open_hwpx(path: Path):
    """python-hwpx의 Document 객체 반환 (mock 가능 위해 분리)."""
    from hwpx import Document
    return Document(path)


def _hwpx_to_text(path: Path) -> str:
    return _open_hwpx(path).get_text()


def _hwp_to_text(path: Path) -> str:
    """LibreOffice headless로 HWP → docx 변환 후 텍스트 추출."""
    out_dir = path.parent
    result = subprocess.run(
        ["soffice", "--headless", "--convert-to", "docx", "--outdir", str(out_dir), str(path)],
        capture_output=True,
        timeout=120,
    )
    if result.returncode != 0:
        logger.warning(f"LibreOffice 변환 실패 ({path.name}): {result.stderr.decode(errors='ignore')[:200]}")
        return ""
    docx_path = out_dir / (path.stem + ".docx")
    if not docx_path.exists():
        return ""
    return _docx_to_text(docx_path)


EXTRACTORS = {
    ".pdf": _pdf_to_text,
    ".docx": _docx_to_text,
    ".hwpx": _hwpx_to_text,
    ".hwp": _hwp_to_text,
}


def extract_text(path: Path) -> str:
    """파일 확장자에 따라 텍스트 추출. 미지원 또는 실패 시 빈 문자열."""
    ext = path.suffix.lower()
    extractor = EXTRACTORS.get(ext)
    if not extractor:
        logger.info(f"미지원 확장자 {ext}: {path.name}")
        return ""
    try:
        return extractor(path)
    except Exception as e:
        logger.warning(f"텍스트 추출 실패 {path.name}: {e}")
        return ""
```

- [ ] **Step 4: 테스트 통과**

```bash
.venv/bin/pytest tests/test_hwp_convert.py -v
```

Expected: 5 PASSED.

- [ ] **Step 5: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/scripts/lib/hwp_convert.py genter-nara-bid/tests/test_hwp_convert.py
git commit -m "feat(genter-nara-bid): HWP/HWPX/PDF/DOCX 텍스트 추출 모듈"
```

---

### Task 4: notion_query — DB 조회 + 업데이트 (TDD)

공고번호로 Notion DB에서 해당 page 검색, 분석 결과로 업데이트.

**Files:**
- Create: `genter-nara-bid/scripts/lib/notion_query.py`
- Create: `genter-nara-bid/tests/test_notion_query.py`

- [ ] **Step 1: 테스트 작성**

`genter-nara-bid/tests/test_notion_query.py`:

```python
import httpx
import respx
from scripts.lib.notion_query import find_page_by_bid_no, update_analysis_result

NOTION_API = "https://api.notion.com/v1"


@respx.mock
def test_find_page_by_bid_no_found():
    respx.post(f"{NOTION_API}/databases/test-db-id/query").mock(return_value=httpx.Response(200, json={
        "results": [{"id": "page-abc", "properties": {}}]
    }))
    page_id = find_page_by_bid_no("R26BK01527139")
    assert page_id == "page-abc"


@respx.mock
def test_find_page_by_bid_no_not_found():
    respx.post(f"{NOTION_API}/databases/test-db-id/query").mock(return_value=httpx.Response(200, json={
        "results": []
    }))
    assert find_page_by_bid_no("R99999") is None


@respx.mock
def test_update_analysis_result():
    respx.patch(f"{NOTION_API}/pages/page-abc").mock(return_value=httpx.Response(200, json={"id": "page-abc"}))
    result = {
        "recommendation": "권장",
        "win_probability": "중간",
        "position": "A",
        "rfp_folder_url": "file:///path/to/folder",
        "industry_matched": "가능",
    }
    ok = update_analysis_result("page-abc", result)
    assert ok is True
```

- [ ] **Step 2: 실패 확인**

```bash
.venv/bin/pytest tests/test_notion_query.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`genter-nara-bid/scripts/lib/notion_query.py`:

```python
import os
import httpx

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {os.environ['NOTION_TOKEN']}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def find_page_by_bid_no(bid_no: str) -> str | None:
    """공고번호로 Notion DB에서 page ID 검색. 없으면 None."""
    db_id = os.environ["NOTION_DB_ID"]
    r = httpx.post(
        f"{NOTION_API}/databases/{db_id}/query",
        headers=_headers(),
        json={
            "filter": {
                "property": "공고번호",
                "rich_text": {"equals": bid_no},
            },
        },
        timeout=30,
    )
    r.raise_for_status()
    results = r.json().get("results", [])
    return results[0]["id"] if results else None


def update_analysis_result(page_id: str, result: dict) -> bool:
    """분석 결과를 Notion page에 PATCH로 업데이트."""
    props = {
        "응찰권장등급": {"select": {"name": result["recommendation"]}},
        "예상승률": {"select": {"name": result["win_probability"]}},
        "포지셔닝확정": {"select": {"name": result["position"]}},
        "RFP 분석 폴더": {"url": result["rfp_folder_url"]},
        "업종매칭": {"select": {"name": result["industry_matched"]}},
        "상태": {"select": {"name": "분석완료"}},
    }
    r = httpx.patch(
        f"{NOTION_API}/pages/{page_id}",
        headers=_headers(),
        json={"properties": props},
        timeout=30,
    )
    r.raise_for_status()
    return True
```

- [ ] **Step 4: 테스트 통과**

```bash
.venv/bin/pytest tests/test_notion_query.py -v
```

Expected: 3 PASSED.

- [ ] **Step 5: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/scripts/lib/notion_query.py genter-nara-bid/tests/test_notion_query.py
git commit -m "feat(genter-nara-bid): Notion DB 검색·분석결과 업데이트 모듈"
```

---

### Task 5: industry_check — 업종코드 LLM 추출 (옵션 3, TDD)

RFP 텍스트에서 요구 업종코드를 LLM(Haiku)으로 추출하고 G엔터 보유 코드(9902, 9999)와 매칭.

**Files:**
- Create: `genter-nara-bid/scripts/lib/industry_check.py`
- Create: `genter-nara-bid/tests/test_industry_check.py`

- [ ] **Step 1: 테스트 작성**

`genter-nara-bid/tests/test_industry_check.py`:

```python
import json
from unittest.mock import MagicMock
from scripts.lib.industry_check import check_industry

GENTER_CODES = {"9902", "9999"}  # G엔터 보유


def test_check_industry_match_9999_general(mocker):
    """9999(기타자유업)으로 응찰 가능한 일반 사업."""
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text=json.dumps({
            "required_codes": ["9999", "9902"],
            "industry_limited": False,
            "rationale": "광고대행 또는 기타자유업 가능",
        }))]
    )
    mocker.patch("scripts.lib.industry_check._client", return_value=mock_client)
    result = check_industry("입찰 공고 텍스트 — 광고 대행 사업")
    assert result["matched"] is True
    assert "9999" in result["found_codes"] or "9902" in result["found_codes"]


def test_check_industry_no_match_software(mocker):
    """소프트웨어사업자만 인정되는 사업은 G엔터 미보유."""
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text=json.dumps({
            "required_codes": ["1468"],
            "industry_limited": True,
            "rationale": "소프트웨어사업자 신고 필수",
        }))]
    )
    mocker.patch("scripts.lib.industry_check._client", return_value=mock_client)
    result = check_industry("소프트웨어 개발 용역")
    assert result["matched"] is False
    assert "1468" in result["found_codes"]
    assert result["industry_limited"] is True


def test_check_industry_handles_invalid_json(mocker):
    """LLM 응답 파싱 실패 시 안전한 기본값 — 매칭 알수없음."""
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="이것은 JSON이 아님")]
    )
    mocker.patch("scripts.lib.industry_check._client", return_value=mock_client)
    result = check_industry("어떤 텍스트")
    assert result["matched"] is None  # 불확실
    assert result["found_codes"] == []
    assert "파싱 실패" in result["rationale"]
```

- [ ] **Step 2: 실패 확인**

```bash
.venv/bin/pytest tests/test_industry_check.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`genter-nara-bid/scripts/lib/industry_check.py`:

```python
import json
import os
from functools import lru_cache
import anthropic

MODEL = "claude-haiku-4-5-20251001"
GENTER_CODES = {"9902", "9999"}  # G엔터 보유: 광고대행업·기타자유업


@lru_cache(maxsize=1)
def _client():
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


SYSTEM_PROMPT = """당신은 한국 정부 입찰공고의 참가자격 분석가다.
입찰 공고 텍스트(제안요청서·과업지시서)를 받아 요구되는 업종코드를 추출한다.
다음 JSON으로만 응답하라:
{
  "required_codes": ["9902", "9999" 등 발견된 모든 업종코드 목록 (4~10자리 숫자)],
  "industry_limited": true/false (업종 제한이 명시되어 있는지),
  "rationale": "한 문장 근거"
}
주요 업종코드 참고: 9902=광고대행업, 9999=기타자유업, 1468=소프트웨어사업자, 8213160301=동영상제작서비스.
업종 명시가 없으면 required_codes를 빈 리스트로, industry_limited를 false로 둔다."""


def check_industry(rfp_text: str) -> dict:
    """RFP 텍스트에서 업종코드 추출, G엔터 보유와 매칭."""
    user_msg = f"# 입찰공고 텍스트\n{rfp_text[:8000]}\n\n위 텍스트에서 요구 업종코드를 추출하여 JSON으로 답하라."

    response = _client().messages.create(
        model=MODEL,
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    text = response.content[0].text.strip()
    try:
        if "```" in text:
            text = text.split("```")[1].lstrip("json").strip()
        parsed = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {
            "matched": None,
            "found_codes": [],
            "required_codes": [],
            "industry_limited": None,
            "rationale": "LLM 응답 파싱 실패",
        }

    required = set(parsed.get("required_codes", []))
    found = required & GENTER_CODES
    # 매칭 판정: 요구 코드 없으면 매칭 가능(자유), 있고 G엔터 보유와 교집합 있으면 가능
    if not required:
        matched = True
    else:
        matched = bool(found)

    return {
        "matched": matched,
        "found_codes": sorted(required),
        "required_codes": sorted(required),
        "industry_limited": parsed.get("industry_limited", False),
        "rationale": parsed.get("rationale", ""),
    }
```

- [ ] **Step 4: 테스트 통과**

```bash
.venv/bin/pytest tests/test_industry_check.py -v
```

Expected: 3 PASSED.

- [ ] **Step 5: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/scripts/lib/industry_check.py genter-nara-bid/tests/test_industry_check.py
git commit -m "feat(genter-nara-bid): 업종코드 LLM 추출 + G엔터 보유(9902·9999) 매칭"
```

---

### Task 6: rfp_analyzer_core — 6-STEP LLM 분석 (TDD)

RFP 텍스트 + cowork 컨텍스트 → 6-STEP 분석 결과 JSON.

**Files:**
- Create: `genter-nara-bid/scripts/lib/rfp_analyzer_core.py`
- Create: `genter-nara-bid/tests/test_rfp_analyzer_core.py`

- [ ] **Step 1: 테스트 작성**

`genter-nara-bid/tests/test_rfp_analyzer_core.py`:

```python
import json
from unittest.mock import MagicMock
from scripts.lib.rfp_analyzer_core import analyze_rfp


def test_analyze_rfp_returns_structured_json(mocker):
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text=json.dumps({
            "eligibility": "응찰 권장",
            "win_probability": "중간",
            "position": "A+H",
            "analysis_md": "# RFP 분석\n## STEP 1\n응찰 권장 ...",
            "evaluation_md": "# 평가기준\n| 항목 | 배점 |\n| --- | --- |\n| 사업이해도 | 10 |",
            "rationale": "지자체 + 콘텐츠 제작 + 5천만 이하",
        }))]
    )
    mocker.patch("scripts.lib.rfp_analyzer_core._client", return_value=mock_client)

    bid = {"bidNtceNo": "R26BK01527139", "bidNtceNm": "지자체 SNS 운영", "presmptPrce": "40000000", "ntceInsttNm": "용인시"}
    result = analyze_rfp(bid, rfp_text="과업 내용...", genter_context="회사 자산 요약...", playbook_context="평가 패턴...")

    assert result["eligibility"] == "응찰 권장"
    assert "RFP 분석" in result["analysis_md"]
    assert "평가기준" in result["evaluation_md"]


def test_analyze_rfp_handles_invalid_json(mocker):
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="invalid")]
    )
    mocker.patch("scripts.lib.rfp_analyzer_core._client", return_value=mock_client)
    bid = {"bidNtceNo": "x", "bidNtceNm": "y", "presmptPrce": "0", "ntceInsttNm": ""}
    result = analyze_rfp(bid, rfp_text="x", genter_context="x", playbook_context="x")
    assert result["eligibility"] == "분석 실패"
    assert result["analysis_md"].startswith("# RFP 분석 실패")
```

- [ ] **Step 2: 실패 확인**

```bash
.venv/bin/pytest tests/test_rfp_analyzer_core.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`genter-nara-bid/scripts/lib/rfp_analyzer_core.py`:

```python
import json
import os
from functools import lru_cache
import anthropic

MODEL = "claude-sonnet-4-6"


@lru_cache(maxsize=1)
def _client():
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


SYSTEM_PROMPT = """당신은 G엔터(GENTER ENT)의 공공 입찰 분석가다.
G엔터 회사 자산·공공입찰 playbook·실제 RFP 텍스트를 입력받아 6-STEP 분석을 수행한다.

다음 JSON 형식으로만 응답하라:
{
  "eligibility": "응찰 강력 권장" | "응찰 권장" | "조건부 응찰" | "응찰 비권장" | "응찰 불가",
  "win_probability": "높음" | "중간" | "낮음",
  "position": "A" | "B" | "A+H" | "B+H" (포지셔닝),
  "analysis_md": "# RFP 분석\\n## STEP 1: 응찰 가능 여부\\n...\\n## STEP 2: 기본 정보\\n...\\n## STEP 3: 평가기준\\n...\\n## STEP 4: 과업\\n...\\n## STEP 5: G엔터 매칭\\n...\\n## STEP 6: 응찰 전략\\n...",
  "evaluation_md": "# 평가기준\\n| 항목 | 배점 | G엔터 예상 |\\n...",
  "rationale": "두 문장 핵심 근거"
}

판단 기준 (cowork 00_CLAUDE.md):
- 응찰 불가: 단일건 5천만 이상 실적 요구 / 재무 3개년 / 추정 3억 이상 / 공동수급 의무 / 직접생산확인증명서 요구
- 포지셔닝: A=SNS홍보대행 보수적, B=AI 인플루언서 혁신, H=중화권·의료관광 하이브리드
- analysis_md와 evaluation_md는 그대로 .md 파일로 저장될 텍스트다."""


def analyze_rfp(bid: dict, rfp_text: str, genter_context: str, playbook_context: str) -> dict:
    """RFP를 6-STEP 분석하여 JSON 반환."""
    user_msg = f"""# 공고 메타
공고명: {bid.get('bidNtceNm', '')}
공고번호: {bid.get('bidNtceNo', '')}
수요기관: {bid.get('ntceInsttNm', '')}
추정가격: {bid.get('presmptPrce', 0)}원

# G엔터 회사 자산
{genter_context[:4000]}

# 공공입찰 playbook
{playbook_context[:4000]}

# RFP 원문 텍스트
{rfp_text[:20000]}

위 정보를 바탕으로 6-STEP 분석을 수행하여 JSON으로 답하라."""

    response = _client().messages.create(
        model=MODEL,
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    text = response.content[0].text.strip()
    try:
        if "```" in text:
            text = text.split("```")[1].lstrip("json").strip()
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {
            "eligibility": "분석 실패",
            "win_probability": "낮음",
            "position": "A",
            "analysis_md": "# RFP 분석 실패\n\nLLM 응답 파싱 실패. 원본 응답:\n\n" + text[:2000],
            "evaluation_md": "# 평가기준\n\n분석 실패로 추출 불가.",
            "rationale": "LLM 응답 파싱 실패",
        }
```

- [ ] **Step 4: 테스트 통과**

```bash
.venv/bin/pytest tests/test_rfp_analyzer_core.py -v
```

Expected: 2 PASSED.

- [ ] **Step 5: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/scripts/lib/rfp_analyzer_core.py genter-nara-bid/tests/test_rfp_analyzer_core.py
git commit -m "feat(genter-nara-bid): RFP 6-STEP LLM 분석 코어 (Sonnet)"
```

---

### Task 7: analyze_rfp.py CLI — 통합 entry point (TDD)

5개 모듈 + nara_api.py를 묶어 CLI로 실행.

**Files:**
- Create: `genter-nara-bid/scripts/analyze_rfp.py`
- Create: `genter-nara-bid/tests/test_analyze_rfp.py`

- [ ] **Step 1: 테스트 작성**

`genter-nara-bid/tests/test_analyze_rfp.py`:

```python
from pathlib import Path
from scripts.analyze_rfp import slugify_folder, build_sub_folder


def test_slugify_folder_basic():
    assert slugify_folder("용인시") == "용인시"
    assert slugify_folder("국립공주박물관 (공주박물관)") == "국립공주박물관_공주박물관"
    assert slugify_folder("문화체육관광부/국립중앙박물관") == "문화체육관광부_국립중앙박물관"


def test_build_sub_folder():
    bid = {
        "ntceInsttNm": "용인시",
        "bidNtceNm": "지자체 SNS 운영 대행",
        "bidNtceDt": "2026-05-17 10:00:00",
    }
    folder = build_sub_folder(bid, Path("/tmp/archive"))
    assert folder.name.startswith("용인시_지자체 SNS 운영 대행_2026")
```

- [ ] **Step 2: 실패 확인**

```bash
.venv/bin/pytest tests/test_analyze_rfp.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`genter-nara-bid/scripts/analyze_rfp.py`:

```python
"""CLI: python -m scripts.analyze_rfp <공고번호>

Notion DB에서 공고를 찾아 첨부 다운로드 → 텍스트 변환 → 업종 체크 → 6-STEP 분석.
결과는 02_rfp_archive/{발주처_사업명_연도}/ 에 rfp_analysis.md + evaluation_criteria.md 로 저장.
"""
import argparse
import logging
import re
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from scripts.lib.nara_api import fetch_new_bids
from scripts.lib.attachment_downloader import download_attachments
from scripts.lib.hwp_convert import extract_text
from scripts.lib.industry_check import check_industry
from scripts.lib.rfp_analyzer_core import analyze_rfp
from scripts.lib.notion_query import find_page_by_bid_no, update_analysis_result

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent
ARCHIVE_DIR = PROJECT_ROOT / "02_rfp_archive"
COMPANY_ASSETS = PROJECT_ROOT / "01_company_assets"
PLAYBOOK = PROJECT_ROOT / "06_playbook"


def slugify_folder(name: str) -> str:
    """파일시스템 안전한 폴더명 변환."""
    name = re.sub(r"[\s\(\)\[\]/\\:*?<>|]+", "_", name.strip())
    return name.strip("_")


def build_sub_folder(bid: dict, archive: Path) -> Path:
    """02_rfp_archive/{발주처}_{사업명}_{연도}/ 경로 빌드."""
    insttu = slugify_folder(bid.get("ntceInsttNm", "미정"))
    name = bid.get("bidNtceNm", "미정")[:60]
    year = bid.get("bidNtceDt", "2026-01-01")[:4]
    return archive / f"{insttu}_{name}_{year}"


def load_context(folder: Path) -> str:
    """폴더 안 모든 .md 파일 본문을 단일 문자열로 합침."""
    parts = []
    for f in sorted(folder.glob("*.md")):
        parts.append(f"## {f.name}\n{f.read_text()}")
    return "\n\n".join(parts)


def find_bid_by_no(bid_no: str) -> dict | None:
    """나라장터 API에서 공고번호로 검색 (최근 30일)."""
    end = datetime.now()
    start = end.replace(day=1) if end.day > 30 else end - __import__("datetime").timedelta(days=30)
    bids = fetch_new_bids(start=start, end=end)
    for b in bids:
        if b.get("bidNtceNo") == bid_no:
            return b
    return None


def run(bid_no: str) -> dict:
    """단일 공고에 대한 RFP 분석 실행."""
    logger.info(f"분석 시작: {bid_no}")

    # 1. nara API에서 공고 메타 가져오기
    bid = find_bid_by_no(bid_no)
    if not bid:
        logger.error(f"공고 {bid_no} 못 찾음 (최근 30일 범위 밖)")
        return {"status": "not_found"}

    # 2. 사업 폴더 생성
    folder = build_sub_folder(bid, ARCHIVE_DIR)
    folder.mkdir(parents=True, exist_ok=True)
    logger.info(f"폴더: {folder}")

    # 3. 첨부 다운로드
    files = download_attachments(bid, folder)
    logger.info(f"첨부 {len(files)}건 다운로드")

    # 4. 텍스트 추출
    rfp_text_parts = []
    for f in files:
        text = extract_text(f)
        if text:
            rfp_text_parts.append(f"## {f.name}\n{text}")
    rfp_text = "\n\n".join(rfp_text_parts)

    if not rfp_text:
        logger.warning("첨부 텍스트 추출 실패")
        rfp_text = bid.get("bidNtceNm", "")

    # 5. 업종 체크
    industry = check_industry(rfp_text)
    logger.info(f"업종 매칭: {industry['matched']} (요구={industry['found_codes']})")

    # 6. cowork 컨텍스트 로드
    genter_context = load_context(COMPANY_ASSETS)
    playbook_context = load_context(PLAYBOOK)

    # 7. 6-STEP 분석
    result = analyze_rfp(bid, rfp_text, genter_context, playbook_context)
    logger.info(f"분석 결과: {result['eligibility']} (포지셔닝 {result['position']})")

    # 8. 결과 파일 저장
    (folder / "rfp_analysis.md").write_text(result["analysis_md"], encoding="utf-8")
    (folder / "evaluation_criteria.md").write_text(result["evaluation_md"], encoding="utf-8")
    (folder / "_meta.json").write_text(
        __import__("json").dumps({"bid_no": bid_no, "industry": industry, "result": {k: v for k, v in result.items() if k not in ("analysis_md", "evaluation_md")}}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # 9. Notion 업데이트
    page_id = find_page_by_bid_no(bid_no)
    if page_id:
        update_analysis_result(page_id, {
            "recommendation": result["eligibility"],
            "win_probability": result["win_probability"],
            "position": result["position"],
            "rfp_folder_url": f"file://{folder}",
            "industry_matched": "가능" if industry["matched"] else ("불가" if industry["matched"] is False else "확인필요"),
        })
        logger.info(f"Notion 업데이트 완료: {page_id}")
    else:
        logger.warning(f"Notion에서 {bid_no} 못 찾음 (Phase 1 폴링 안 됐을 수 있음)")

    return {"status": "ok", "folder": str(folder), "result": result, "industry": industry}


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("bid_no", help="공고번호 (예: R26BK01527139)")
    args = parser.parse_args()
    summary = run(args.bid_no)
    print(summary)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 테스트 통과**

```bash
.venv/bin/pytest tests/test_analyze_rfp.py -v
```

Expected: 2 PASSED.

- [ ] **Step 5: 전체 테스트 통과**

```bash
.venv/bin/pytest -v 2>&1 | tail -3
```

Expected: 29(기존) + 4(Task2) + 5(Task3) + 3(Task4) + 3(Task5) + 2(Task6) + 2(Task7) = **48 passed**.

- [ ] **Step 6: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/scripts/analyze_rfp.py genter-nara-bid/tests/test_analyze_rfp.py
git commit -m "feat(genter-nara-bid): analyze_rfp CLI — 첨부 다운로드 + 업종 체크 + 6-STEP 분석 통합"
```

---

### Task 8: Notion DB 필드 추가 (분석 결과용)

라이브 PATCH로 새 컬럼 4개 추가 + setup script 업데이트.

**Files:**
- Modify: `genter-nara-bid/scripts/setup/create_notion_db.py`

- [ ] **Step 1: Notion DB에 PATCH로 컬럼 추가**

```bash
cd "/Users/user/Desktop/claude code/genter-nara-bid"
.venv/bin/python -c "
import os, httpx
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path('.env'))
r = httpx.patch(
    f'https://api.notion.com/v1/databases/{os.environ[\"NOTION_DB_ID\"]}',
    headers={
        'Authorization': f\"Bearer {os.environ['NOTION_TOKEN']}\",
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
    },
    json={'properties': {
        '포지셔닝확정': {'select': {'options': [
            {'name': 'A', 'color': 'blue'},
            {'name': 'B', 'color': 'purple'},
            {'name': 'A+H', 'color': 'green'},
            {'name': 'B+H', 'color': 'orange'},
        ]}},
        '업종매칭': {'select': {'options': [
            {'name': '가능', 'color': 'green'},
            {'name': '불가', 'color': 'red'},
            {'name': '확인필요', 'color': 'yellow'},
        ]}},
    }},
    timeout=30,
)
print('Status:', r.status_code)
if r.status_code != 200:
    print(r.json())
else:
    print('✅ 컬럼 추가 완료 (포지셔닝확정·업종매칭)')
"
```

Expected: `Status: 200` + `✅ 컬럼 추가 완료`.

(`응찰권장등급`, `예상승률`, `RFP 분석 폴더`는 setup_notion_db.py에서 이미 만들어진 상태.)

- [ ] **Step 2: setup_notion_db.py도 업데이트 (재현 가능성)**

`genter-nara-bid/scripts/setup/create_notion_db.py`의 `build_database_schema` 안에 다음 2개 properties를 추가 (위치는 "예상승률" 다음 줄):

```python
            "포지셔닝확정": {
                "select": {
                    "options": [
                        {"name": "A", "color": "blue"},
                        {"name": "B", "color": "purple"},
                        {"name": "A+H", "color": "green"},
                        {"name": "B+H", "color": "orange"},
                    ]
                }
            },
            "업종매칭": {
                "select": {
                    "options": [
                        {"name": "가능", "color": "green"},
                        {"name": "불가", "color": "red"},
                        {"name": "확인필요", "color": "yellow"},
                    ]
                }
            },
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/scripts/setup/create_notion_db.py
git commit -m "feat(genter-nara-bid): Notion DB에 포지셔닝확정·업종매칭 필드 추가"
```

---

### Task 9: 라이브 검증 — 실제 공고 1건 분석

코드 없음. Phase 1에서 적재된 `R26BK01527139`(국립공주박물관 디지털콘텐츠 제작) 또는 평일 첫 자동 실행 후 적재된 공고로 분석 1회 실행.

- [ ] **Step 1: 실제 분석 실행**

```bash
cd "/Users/user/Desktop/claude code/genter-nara-bid"
.venv/bin/python -m scripts.analyze_rfp R26BK01527139 2>&1 | tail -30
```

Expected:
- 첨부 다운로드 1건 이상 (없으면 BLOCKED — RFP 첨부가 없는 공고일 수 있음)
- 텍스트 추출 성공 (또는 부분적 성공)
- 업종 매칭 결과 출력
- `02_rfp_archive/문화체육관광부_국립중앙박물관_공주박물관_2026년...` 폴더 생성
- `rfp_analysis.md` + `evaluation_criteria.md` + `_meta.json` 생성
- Notion 업데이트 200 OK

- [ ] **Step 2: 결과 육안 검증**

```bash
ls "/Users/user/Desktop/claude code/genter-nara-bid/02_rfp_archive/"
cat "/Users/user/Desktop/claude code/genter-nara-bid/02_rfp_archive/문화체육관광부*/rfp_analysis.md" | head -50
cat "/Users/user/Desktop/claude code/genter-nara-bid/02_rfp_archive/문화체육관광부*/_meta.json"
```

확인:
- 응찰 권장 등급이 합리적인지 (1.8억 박물관 디지털콘텐츠 = G엔터 1단계 capacity 너머라 "조건부" 또는 "비권장" 기대)
- 업종 매칭 결과 (광고대행업·기타자유업 매칭 여부)
- 6-STEP 분석 내용이 빈 placeholder 없이 채워져 있는지

- [ ] **Step 3: Notion 검증**

브라우저로 [내부 Notion 링크] 열어 해당 row 확인:
- 응찰권장등급·예상승률·포지셔닝확정·업종매칭 필드 채워졌는지
- RFP 분석 폴더 링크 클릭 시 로컬 폴더 열림 (`file://...`)
- 상태 = "분석완료"

- [ ] **Step 4: 검증 리포트 작성**

`genter-nara-bid/logs/phase2_validation.md` 생성 (force-add for gitignore):

```markdown
# Phase 2 검증 (YYYY-MM-DD)

## 실행 공고
- 공고번호:
- 공고명:
- 추정가격:

## 결과 요약
- 첨부 다운로드: N건
- 텍스트 추출 성공: N건 / N건
- 업종 매칭: 가능 / 불가 / 확인필요
- 응찰 권장 등급:
- 예상 승률:
- 포지셔닝:

## 사용자 검토
- 분석 내용 합리성:
- 업종 매칭 정확성:
- 개선 필요 항목:
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add -f genter-nara-bid/logs/phase2_validation.md
git commit -m "test(genter-nara-bid): Phase 2 라이브 검증 결과"
```

---

## Phase 2 완료 기준

- [ ] 48개 단위 테스트 모두 PASS (29 기존 + 19 신규)
- [ ] 라이브 분석 1건 성공 (`02_rfp_archive/`에 결과 폴더 생성, Notion 업데이트)
- [ ] HWP 변환 성공 (LibreOffice 설치된 환경에서)
- [ ] 업종 매칭 LLM이 합리적 결과 반환 (R26BK01527139 박물관 디지털콘텐츠 → 광고대행업 또는 기타자유업 매칭 기대)
- [ ] cowork `02_rfp_archive/` 폴더 규약 준수

## 다음 Phase

- **Phase 3**: HWP 변환 정확도 개선 + 변환 실패 Plan B (별도 plan, 라이브 데이터로 실패 케이스 수집 후 작성)
- **Phase 4**: `proposal_builder.py` — cowork 마스터 템플릿 9챕터 자동 생성
- **Phase 5**: `draft_dispatcher.py` — Notion `RFP 분석`·`제안서 초안` 체크박스 매 5분 폴링, 자동 트리거
