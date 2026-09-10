"use client";

export default function BarChart({ series }) {
  if (!series || series.length === 0) {
    return <p style={{ color: "var(--muted)" }}>표시할 데이터가 없어요.</p>;
  }

  const max = Math.max(1, ...series.map((d) => Math.max(d.clicks, d.signups)));
  const barWidth = 18;
  const gap = 24;
  const height = 160;
  const width = series.length * gap + 40;

  return (
    <svg width={width} height={height + 24} role="img" aria-label="일별 클릭/신청 추이">
      {series.map((d, i) => {
        const x = 20 + i * gap;
        const clickH = (d.clicks / max) * height;
        const signupH = (d.signups / max) * height;
        return (
          <g key={d.day}>
            <rect x={x} y={height - clickH} width={barWidth / 2} height={clickH} fill="#111111" />
            <rect x={x + barWidth / 2} y={height - signupH} width={barWidth / 2} height={signupH} fill="#f5c518" />
            <text x={x} y={height + 16} fontSize="9" fill="#6b6b6b">
              {d.day.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
