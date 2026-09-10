"use client";

import { useEffect, useState } from "react";
import BarChart from "./BarChart";

const RANGES = [
  { key: "today", label: "오늘" },
  { key: "7d", label: "7일" },
  { key: "30d", label: "30일" },
  { key: "all", label: "전체" },
];

function rangeToDates(key) {
  const today = new Date();
  const toStr = today.toISOString().slice(0, 10);
  if (key === "all") return { from: "", to: "" };
  const days = key === "today" ? 0 : key === "7d" ? 6 : 29;
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: toStr };
}

export default function DashboardPage() {
  const [rangeKey, setRangeKey] = useState("30d");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const { from, to } = rangeToDates(rangeKey);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/dashboard?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setStats(d && typeof d === "object" ? d : null))
      .catch(() => setStats(null));
  }, [rangeKey]);

  return (
    <div>
      <p className="section-title">FIRST 100 · PERFORMANCE</p>
      <h1>채널별 성과</h1>
      <p>짧은 링크를 거친 클릭과, 같은 UTM으로 들어온 신청을 채널·소재·날짜별로 봅니다.</p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        {RANGES.map((r) => (
          <button key={r.key} className={rangeKey === r.key ? "" : "secondary"} onClick={() => setRangeKey(r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      {!stats ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <div className="tiles">
            <div className="tile">
              <div>클릭</div>
              <div className="value">{stats.totalClicks}</div>
            </div>
            <div className="tile">
              <div>신청</div>
              <div className="value">{stats.totalSignups}</div>
            </div>
            <div className="tile">
              <div>전환율</div>
              <div className="value">{Math.round(stats.conversionRate * 100)}%</div>
            </div>
            <div className="tile">
              <div>활성 링크</div>
              <div className="value">{stats.activeLinks}</div>
            </div>
          </div>

          <p className="section-title">일별 추이</p>
          <BarChart series={stats.dailySeries} />

          <p className="section-title">채널별</p>
          <table>
            <thead>
              <tr>
                <th>채널</th>
                <th>링크</th>
                <th>클릭</th>
                <th>신청</th>
                <th>전환율</th>
              </tr>
            </thead>
            <tbody>
              {(stats.channelBreakdown || []).map((c) => (
                <tr key={c.channelId}>
                  <td>{c.name}</td>
                  <td>{c.linkCount}</td>
                  <td>{c.clicks}</td>
                  <td>{c.signups}</td>
                  <td>{c.clicks > 0 ? `${Math.round(c.conversionRate * 100)}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="section-title">소재 상위 10 · 전환율 기준</p>
          <table>
            <thead>
              <tr>
                <th>채널</th>
                <th>소재</th>
                <th>짧은 링크</th>
                <th>클릭</th>
                <th>신청</th>
                <th>전환율</th>
              </tr>
            </thead>
            <tbody>
              {(stats.topContent || []).map((t) => (
                <tr key={t.linkId}>
                  <td>{t.channelName}</td>
                  <td>{t.contentCode || "-"}</td>
                  <td>/l/{t.shortCode}</td>
                  <td>{t.clicks}</td>
                  <td>{t.signups}</td>
                  <td>{t.clicks > 0 ? `${Math.round(t.conversionRate * 100)}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
