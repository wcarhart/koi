import {
  versionDestination,
  type VersionDestination,
} from '../lib/version-navigation';
const data = document.querySelector('#documentation-versions');
const versions: VersionDestination[] = data
  ? JSON.parse(data.textContent!)
  : [];
for (const root of document.querySelectorAll<HTMLElement>(
  '[data-version-selector]',
)) {
  const panel = root.querySelector<HTMLElement>('.version-options')!;
  const updateLinks = () => {
    const source = versions.find(
      (version) =>
        location.pathname === version.base ||
        location.pathname.startsWith(version.base + '/'),
    );
    // Explicit version bases must win over the unversioned /docs prefix.
    const current =
      versions.find(
        (version) =>
          version.id !== 'unreleased' &&
          (location.pathname === version.base ||
            location.pathname.startsWith(version.base + '/')),
      ) || source;
    if (!current) return;
    for (const link of panel.querySelectorAll<HTMLAnchorElement>(
      'a[data-version-id]',
    )) {
      const target = versions.find(
        (version) => version.id === link.dataset.versionId,
      );
      if (target)
        link.href = versionDestination(
          current,
          target,
          location.pathname,
          location.hash,
        );
    }
  };
  root.addEventListener('koi:version-open', updateLinks);
  // Continuous scrolling can change the document while a selector is open.
  panel.addEventListener('pointerdown', updateLinks);
}
