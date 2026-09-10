import WaitlistForm from "./WaitlistForm";

export default function WaitlistPage({ searchParams }) {
  const utm = {
    source: searchParams.utm_source || "direct",
    medium: searchParams.utm_medium || "none",
    campaign: searchParams.utm_campaign || "",
    content: searchParams.utm_content || "",
  };

  return (
    <div>
      <p className="section-title">JULIE OS · WAITLIST</p>
      <h1>Julie OS 웨이트리스트</h1>
      <p>관계를 준비하는 운영체제, Julie OS의 다음 소식을 가장 먼저 받아보세요.</p>
      <WaitlistForm utm={utm} />
    </div>
  );
}
