import { exportMarkdown, getDocs, type Doc } from '../../lib/content';
export async function getStaticPaths() {
  return (await getDocs())
    .filter((d) => d.slug)
    .map((doc) => ({ params: { slug: doc.slug }, props: { doc } }));
}
export function GET({ props }: { props: { doc: Doc } }) {
  return new Response(exportMarkdown(props.doc), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
