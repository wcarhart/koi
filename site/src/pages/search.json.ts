import { searchEntries } from '../lib/documentation';
import { getVersion } from '../lib/versions';
export async function GET() {
  return Response.json(await searchEntries(getVersion()));
}
