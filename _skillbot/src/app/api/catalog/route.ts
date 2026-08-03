import { loadCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const catalog = await loadCatalog();
  return Response.json(catalog);
}
