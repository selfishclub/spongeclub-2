import "./globals.css";

export const metadata = {
  title: "GTM Tracker · Julie OS",
  description: "Julie OS 웨이트리스트 UTM 링크 빌더와 대시보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header className="topbar">
          <span className="brand">JULIE OS · GTM</span>
          <nav>
            <a href="/admin">링크 만들기</a>
            <a href="/dashboard">대시보드</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
