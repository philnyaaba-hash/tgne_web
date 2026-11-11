import { redirect } from 'next/navigation';

export default async function OfficeEmbedPage({ searchParams }) {
  const params = await searchParams;
  const query = typeof params?.panel === 'string' ? '?panel=' + encodeURIComponent(params.panel) : '';
  redirect('/admin/embed' + query);
}
