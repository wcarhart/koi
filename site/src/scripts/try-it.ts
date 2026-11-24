for (const dialog of document.querySelectorAll<HTMLDialogElement>(
  '[data-try-dialog]',
)) {
  const section = dialog.closest<HTMLElement>('[data-doc-section]')!;
  const template =
    section.querySelector<HTMLTemplateElement>('[data-try-button]')!;
  const callout = section.querySelector<HTMLElement>('[data-try-it-callout]')!;
  const heading = section.querySelector<HTMLElement>(
    '.doc-example [data-try-sample-heading]',
  )!;
  for (const target of [callout, heading])
    target.append(template.content.cloneNode(true));
  let previous: HTMLElement | undefined;
  let pageY = 0;
  let navigating = false;
  const title = dialog.querySelector<HTMLElement>('h2')!;
  const dismiss = (restoreFocus = true) => {
    navigating = !restoreFocus;
    // Release scrolling before the documentation router handles a link.
    document.documentElement.classList.remove('try-dialog-open');
    dialog.close();
  };
  for (const button of section.querySelectorAll<HTMLButtonElement>(
    '[data-open-try]',
  ))
    button.addEventListener('click', () => {
      previous = button;
      pageY = window.scrollY;
      navigating = false;
      dialog.showModal();
      document.documentElement.classList.add('try-dialog-open');
      title.focus({ preventScroll: true });
    });
  dialog
    .querySelector('[data-close-try]')!
    .addEventListener('click', () => dismiss());
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('try-dialog-open');
    dialog.dispatchEvent(new Event('try-it-close'));
    if (!navigating) {
      window.scrollTo({ top: pageY, behavior: 'instant' });
      previous?.focus({ preventScroll: true });
    }
  });
  dialog.addEventListener('click', (event) => {
    const mouse = event as MouseEvent;
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      'a[href]',
    );
    if (
      link &&
      !link.target &&
      !mouse.metaKey &&
      !mouse.ctrlKey &&
      !mouse.shiftKey &&
      !mouse.altKey &&
      mouse.button === 0
    )
      dismiss(false);
  });
  window.addEventListener('popstate', () => {
    if (dialog.open) dismiss(false);
  });
}
