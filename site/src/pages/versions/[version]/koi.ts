import { readFileSync } from 'node:fs';
import { getVersions, type KoiVersion } from '../../../lib/versions';
export function getStaticPaths() {
  return getVersions().map((version) => ({
    params: { version: version.id },
    props: { version },
  }));
}
export function GET({ props }: { props: { version: KoiVersion } }) {
  return new Response(readFileSync(props.version.sourceFile, 'utf8'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
