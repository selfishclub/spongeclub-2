import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '이기적인 스킬러스 — 스킬 카탈로그',
  description: '스폰지크루가 검증한 클로드코드 스킬, 카테고리별로 둘러보기',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
