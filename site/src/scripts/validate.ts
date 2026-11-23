import { getDocs } from '../lib/content';
import { getVersions } from '../lib/versions';
for (const version of getVersions()) {
  const docs = await getDocs(version);
  console.log(
    `Validated ${docs.length} published documentation sections (${version.label}).`,
  );
}
