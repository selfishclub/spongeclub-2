"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [channels, setChannels] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState([]);
  const [contentCode, setContentCode] = useState("");
  const [memo, setMemo] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [justCreated, setJustCreated] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState({ channelId: "", search: "", includeArchived: false });
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((d) => setChannels(d.channels));
  }, []);

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerFilter]);

  function loadLinks() {
    const params = new URLSearchParams();
    if (ledgerFilter.channelId) params.set("channelId", ledgerFilter.channelId);
    if (ledgerFilter.search) params.set("search", ledgerFilter.search);
    if (ledgerFilter.includeArchived) params.set("includeArchived", "true");
    fetch(`/api/links?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setLinks(d.links));
  }

  function toggleChannel(id) {
    setSelectedChannelIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (!selectedChannelIds.length) {
      setStatus("채널을 하나 이상 선택해주세요");
      return;
    }
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelIds: selectedChannelIds, contentCode, memo, createdBy }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "만들기에 실패했어요");
      return;
    }
    setJustCreated(data.links);
    const firstShortUrl = `${window.location.origin}${data.links[0].shortUrl}`;
    try {
      await navigator.clipboard.writeText(firstShortUrl);
      setStatus("짧은 링크를 복사했어요.");
    } catch {
      setStatus("링크를 만들었어요. (이 환경에서는 자동 복사가 지원되지 않아요)");
    }
    setContentCode("");
    setMemo("");
    loadLinks();
  }

  async function toggleArchive(id) {
    await fetch(`/api/links/${id}/archive`, { method: "POST" });
    loadLinks();
  }

  return (
    <div>
      <p className="section-title">FIRST 100 · ATTRIBUTION</p>
      <h1>UTM 링크 만들기</h1>
      <p>채널을 고르고 만들기를 누르면 끝입니다. 소재 코드는 비워두면 자동으로 제안됩니다.</p>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div>
          <p className="section-title">1 · 어디에 걸 링크인가요</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {channels.map((c) => {
              const selected = selectedChannelIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 12,
                    display: "block",
                    background: selected ? "var(--brand-black)" : "white",
                    color: selected ? "white" : "inherit",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleChannel(c.id)}
                    style={{ width: "auto", marginRight: 8 }}
                  />
                  <strong>{c.name}</strong>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {c.source} / {c.medium}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{c.note}</div>
                </label>
              );
            })}
          </div>

          <p className="section-title">2 · 소재</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>소재 코드</label>
              <input value={contentCode} onChange={(e) => setContentCode(e.target.value)} placeholder="비우면 자동 번호" />
            </div>
            <div>
              <label>메모</label>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="비우면 자동" />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label>만든 사람</label>
            <input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
          </div>
        </div>

        <div>
          <p className="section-title">3 · 만들기</p>
          <div className="tile">
            <button onClick={handleCreate}>만들기</button>
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>{status}</p>
          </div>

          {justCreated.length > 0 && (
            <div className="tile" style={{ marginTop: 16 }}>
              <p className="section-title">방금 만든 링크</p>
              {justCreated.map((link) => (
                <div key={link.id} style={{ marginBottom: 12 }}>
                  <strong>{link.content_code || link.short_code}</strong>
                  <div>
                    {window.location.origin}
                    {link.shortUrl}
                  </div>
                  <a
                    href={`/api/qr?text=${encodeURIComponent(window.location.origin + link.shortUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    QR 보기
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="section-title">장부</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <select
          value={ledgerFilter.channelId}
          onChange={(e) => setLedgerFilter((f) => ({ ...f, channelId: e.target.value }))}
          style={{ width: 180 }}
        >
          <option value="">모든 채널</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          placeholder="메모·코드 검색"
          value={ledgerFilter.search}
          onChange={(e) => setLedgerFilter((f) => ({ ...f, search: e.target.value }))}
        />
        <label style={{ whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={ledgerFilter.includeArchived}
            onChange={(e) => setLedgerFilter((f) => ({ ...f, includeArchived: e.target.checked }))}
          />
          보관한 링크도 보기
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>채널</th>
            <th>소재</th>
            <th>메모</th>
            <th>짧은 링크</th>
            <th>클릭</th>
            <th>신청</th>
            <th>전환</th>
            <th>만든 날</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} style={{ opacity: link.archived ? 0.5 : 1 }}>
              <td>{link.channel_name}</td>
              <td>{link.content_code || "-"}</td>
              <td>{link.memo}</td>
              <td>{link.shortUrl}</td>
              <td>{link.clicks}</td>
              <td>{link.signups}</td>
              <td>{link.clicks > 0 ? `${Math.round(link.conversionRate * 100)}%` : "-"}</td>
              <td>{link.created_at.slice(5, 10)}</td>
              <td>
                <button className="secondary" onClick={() => toggleArchive(link.id)}>
                  {link.archived ? "복원" : "보관"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
