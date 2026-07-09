"""공유 데이터 타입 (순환 import 방지용 단독 모듈)."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Recording:
    id: str
    title: str
    date: str            # 'YYYY-MM-DD'
    summary: str | None = None
    transcript: str | None = None
