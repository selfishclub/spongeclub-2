import { loadCatalog } from '@/lib/catalog';
import CatalogView from './CatalogView';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const catalog = await loadCatalog();

  return (
    <div className="wrap">
      <a className="top" href="/">
        🧽 이기적인 스킬러스
      </a>

      <div className="hero">
        <h1>
          이기적으로 공유하고,
          <br />
          함께 성장하는 스폰지들
        </h1>
        <p>
          스폰지크루가 검증한 클로드코드 스킬을 카테고리별로 둘러봐요. 올리기 <code>/스킬등록</code> · 찾기{' '}
          <code>/스킬검색</code>
        </p>
      </div>

      <CatalogView sections={catalog.sections} />

      <footer>이기적인 스킬러스 · 스폰지클럽</footer>
    </div>
  );
}
