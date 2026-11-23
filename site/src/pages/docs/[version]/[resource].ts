import { getVersions, type KoiVersion } from '../../../lib/versions';
import { searchEntries } from '../../../lib/documentation';
import {
  getAgentGuidance,
  getFullDocumentation,
} from '../../../lib/agent-guidance';
export function getStaticPaths() {
  return getVersions()
    .filter((version) => version.id !== 'unreleased')
    .flatMap((version) =>
      ['search.json', 'llms.txt', 'llms-full.txt'].map((resource) => ({
        params: { version: version.id, resource },
        props: { version, resource },
      })),
    );
}
export async function GET({
  props,
}: {
  props: { version: KoiVersion; resource: string };
}) {
  const { version, resource } = props;
  if (resource === 'search.json')
    return Response.json(await searchEntries(version));
  return new Response(
    await (resource === 'llms.txt'
      ? getAgentGuidance(version)
      : getFullDocumentation(version)),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
