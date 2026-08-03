'use client';

import { useMemo, useState } from 'react';
import type { CatalogItem, CatalogSection } from '@/lib/catalog';

const ALL = '전체';

const EMOJI: Record<string, string> = {
  raising_hand: '🙋',
  speech_balloon: '💬',
  jigsaw: '🧩',
  sparkles: '✨',
  memo: '📝',
  link: '🔗',
  pushpin: '📌',
  mag: '🔍',
  hammer_and_wrench: '🛠️',
  star: '⭐',
};

/** 슬랙 mrkdwn 정리: 멘션 제거, <url|label>→label, :emoji:→진짜 이모지(모르면 제거), *bold* 해제 */
function cleanMrkdwn(t: string): string {
  return t
    .replace(/<@[^>]+>/g, '') // 유저 멘션 제거
    .replace(/<#[^>]+>/g, '') // 채널 멘션 제거
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2') // <url|label> → label
    .replace(/<([^>]+)>/g, '$1') // <url> → url
    .replace(/:([a-z0-9_+-]+):/gi, (_, n) => EMOJI[n] ?? '') // 이모지 코드
    .replace(/\*([^*]+)\*/g, '$1') // *bold* → bold
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function itemKey(it: CatalogItem): string {
  return `${it.name}-${it.ts}`;
}

function Card({ item }: { item: CatalogItem }) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && replies === null && !loading) {
      setLoading(true);
      try {
        const res = await fetch(`/api/thread?ts=${encodeURIComponent(item.ts)}`);
        const data = await res.json();
        setReplies(Array.isArray(data.replies) ? data.replies : []);
      } catch {
        setReplies([]);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className={`card${open ? ' open' : ''}`}>
      <button className="card-head" onClick={toggle} aria-expanded={open}>
        <span className="name">{item.name}</span>
        <span className="chev" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      <div className="desc">{item.desc}</div>
      <div className="meta">
        {item.avgScore !== undefined && <span className="star">★ {item.avgScore}</span>}
        <span className="cat-tag">{item.category}</span>
      </div>

      {open && (
        <div className="detail">
          {loading && <div className="detail-loading">불러오는 중…</div>}
          {replies && replies.length > 0 && (
            <div className="detail-body">
              {replies.map((r, i) => (
                <p key={i}>{cleanMrkdwn(r)}</p>
              ))}
            </div>
          )}
          {replies && replies.length === 0 && !loading && (
            <div className="detail-loading">등록된 상세 설명이 없어요.</div>
          )}
          <a className="link" href={item.slackLink} target="_blank" rel="noreferrer">
            슬랙에서 보기 →
          </a>
        </div>
      )}
    </div>
  );
}

export default function CatalogView({ sections }: { sections: CatalogSection[] }) {
  const [active, setActive] = useState<string>(ALL);
  const [query, setQuery] = useState('');

  const total = useMemo(() => sections.reduce((n, s) => n + s.items.length, 0), [sections]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    return sections
      .filter((s) => active === ALL || s.category === active)
      .map((s) => ({
        category: s.category,
        items: s.items.filter(
          (it) =>
            !q ||
            it.name.toLowerCase().includes(q) ||
            it.desc.toLowerCase().includes(q) ||
            it.category.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [sections, active, q]);

  const visibleCount = visible.reduce((n, s) => n + s.items.length, 0);

  return (
    <>
      <div className="controls">
        <div className="search">
          <span className="search-ico" aria-hidden>
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="스킬 이름이나 키워드로 검색"
            aria-label="스킬 검색"
          />
        </div>
        <div className="pills">
          <button
            className={`pill${active === ALL ? ' on' : ''}`}
            onClick={() => setActive(ALL)}
          >
            전체 <b>{total}</b>
          </button>
          {sections.map((s) => (
            <button
              key={s.category}
              className={`pill${active === s.category ? ' on' : ''}`}
              onClick={() => setActive(s.category)}
            >
              {s.category} <b>{s.items.length}</b>
            </button>
          ))}
        </div>
      </div>

      {visibleCount === 0 ? (
        <div className="empty">
          {q ? `"${query}" — 맞는 스킬이 없어요.` : '아직 카탈로그가 비었어요.'}
        </div>
      ) : (
        visible.map((s) => (
          <section className="section" key={s.category}>
            <h2>
              {s.category}
              <span className="n">{s.items.length}</span>
            </h2>
            <div className="grid">
              {s.items.map((it) => (
                <Card key={itemKey(it)} item={it} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
