"use client";

import { useState } from "react";

export default function WaitlistForm({ utm }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          utm_source: utm.source,
          utm_medium: utm.medium,
          utm_campaign: utm.campaign,
          utm_content: utm.content,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "신청에 실패했어요");
        setStatus("idle");
        return;
      }
      setStatus("done");
    } catch {
      setError("신청 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return <p className="tile">신청 완료! 곧 소식을 전해드릴게요.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="tile" style={{ maxWidth: 420 }}>
      <div style={{ marginBottom: 12 }}>
        <label>이름</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>이메일 *</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "신청 중..." : "신청하기"}
      </button>
    </form>
  );
}
