import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function image(page: Page) {
  return page
    .locator('swimming-surface canvas')
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
}

async function openPaused(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/swim');
  await expect(page.locator('swimming-surface')).toHaveAttribute(
    'data-state',
    'paused',
  );
  await expect(
    page.getByRole('button', { name: 'Resume', exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
}

test('the demo draws a fin, updates controls, and resets its appearance', async ({
  page,
}) => {
  await openPaused(page);
  await expect(
    page
      .getByRole('button', { name: 'Resume', exact: true })
      .locator('[data-play-icon]'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset defaults' })).toHaveText(
    '',
  );
  const canvas = page.locator('swimming-surface canvas');
  expect(
    await canvas.evaluate((node: HTMLCanvasElement) =>
      node
        .getContext('2d')!
        .getImageData(0, 0, node.width, node.height)
        .data.some((value, index) => index % 4 === 3 && value > 0),
    ),
  ).toBe(true);
  const initial = await image(page);
  const depth = page.getByRole('slider', {
    name: 'Surface depth',
    exact: true,
  });
  await depth.fill('0');
  await expect(page.locator('output[for="swim-depth"]')).toHaveText('0%');
  expect(
    await canvas.evaluate((node: HTMLCanvasElement) =>
      node
        .getContext('2d')!
        .getImageData(0, 0, node.width, node.height)
        .data.every((value) => value === 0),
    ),
  ).toBe(true);
  await page.getByRole('switch', { name: 'Show glass' }).click();
  await expect(page.locator('[data-glass-overlay]')).toBeVisible();
  await expect(page.locator('.glass-squircle')).toHaveCount(3);
  await page.getByRole('switch', { name: 'Show route', exact: true }).click();
  expect(await image(page)).not.toBe(initial);
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(depth).toHaveValue('85');
  await expect(page.locator('output[for="swim-depth"]')).toHaveText('85%');
  await expect(page.locator('[data-glass-overlay]')).toBeHidden();
  await expect(
    page.getByRole('switch', { name: 'Show route', exact: true }),
  ).toHaveAttribute('aria-checked', 'false');
  expect(await image(page)).toBe(initial);
});

test('reduced motion starts static, explicit playback moves, and pause freezes', async ({
  page,
}) => {
  await page.clock.install();
  await openPaused(page);
  const initial = await image(page);
  await page.clock.runFor(500);
  expect(await image(page)).toBe(initial);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('[data-swimming-preview]').scrollIntoViewIfNeeded();
  await page.clock.runFor(1000);
  expect(await image(page)).not.toBe(initial);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await image(page);
  await page.clock.runFor(1000);
  expect(await image(page)).toBe(paused);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('swimming-surface')).toHaveAttribute(
    'data-state',
    'playing',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('swimming-surface')).toHaveAttribute(
    'data-state',
    'paused',
  );
});

test('builder-style switches independently show route and spine and reset together', async ({
  page,
}) => {
  await openPaused(page);
  const route = page.getByRole('switch', { name: 'Show route', exact: true });
  const spine = page.getByRole('switch', { name: 'Show spine', exact: true });
  const glass = page.getByRole('switch', { name: 'Show glass', exact: true });
  await expect(page.getByRole('switch')).toHaveCount(3);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  const initial = await image(page);
  await route.click();
  await expect(route).toHaveAttribute('aria-checked', 'true');
  await expect(spine).toHaveAttribute('aria-checked', 'false');
  const routeOnly = await image(page);
  expect(routeOnly).not.toBe(initial);
  await spine.click();
  const both = await image(page);
  expect(both).not.toBe(routeOnly);
  await route.focus();
  await page.keyboard.press('Space');
  await expect(route).toHaveAttribute('aria-checked', 'false');
  await expect(spine).toHaveAttribute('aria-checked', 'true');
  const spineOnly = await image(page);
  expect(spineOnly).not.toBe(initial);
  expect(spineOnly).not.toBe(routeOnly);
  expect(spineOnly).not.toBe(both);
  await glass.focus();
  await page.keyboard.press('Enter');
  await expect(glass).toHaveAttribute('aria-checked', 'true');
  expect(await image(page)).toBe(spineOnly);
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  for (const toggle of [route, spine, glass])
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(await image(page)).toBe(initial);
});

test('both themes and the glass overlay are accessible and responsive', async ({
  page,
}) => {
  await openPaused(page);
  await page.getByRole('switch', { name: 'Show glass' }).click();
  const light = await image(page);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
  await expect.poll(() => image(page)).not.toBe(light);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      report.violations.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map(({ target }) => target),
      })),
    ).toEqual([]);
  }
  await page.getByRole('slider', { name: 'Swimming speed' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('slider', { name: 'Swimming speed' }),
  ).toHaveValue('1.45');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  );
  expect(await (await page.request.get('/sitemap.xml')).text()).not.toContain(
    '/swim',
  );
});

test('resize preserves a usable drawing surface', async ({ page }) => {
  await openPaused(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect
    .poll(() =>
      page
        .locator('swimming-surface canvas')
        .evaluate((node: HTMLCanvasElement) => node.width),
    )
    .toBeGreaterThan(0);
  await page.getByRole('switch', { name: 'Show glass' }).click();
  await expect(page.locator('[data-glass-overlay]')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('custom sliders align metadata and keep their divider, value, and simulation in sync', async ({
  page,
}) => {
  await openPaused(page);
  await expect(page.locator('range-slider')).toHaveCount(10);
  const slider = page.getByRole('slider', {
    name: 'Swimming speed',
    exact: true,
  });
  const component = page.locator('range-slider').filter({ has: slider });
  const value = component.locator('output');
  const label = component.locator('label');
  const metadata = await component.evaluate((node) => {
    const output = node.querySelector('output')!;
    const label = node.querySelector('label')!;
    return {
      value: output.getBoundingClientRect().toJSON(),
      label: label.getBoundingClientRect().toJSON(),
      valueSize: parseFloat(getComputedStyle(output).fontSize),
      labelSize: parseFloat(getComputedStyle(label).fontSize),
    };
  });
  expect(metadata.value.right).toBeLessThan(metadata.label.left);
  expect(metadata.value.bottom).toBeCloseTo(metadata.label.bottom, 1);
  expect(metadata.valueSize).toBeGreaterThan(metadata.labelSize);
  expect(await value.evaluate((node) => getComputedStyle(node).color)).not.toBe(
    await label.evaluate((node) => getComputedStyle(node).color),
  );
  const progress = () =>
    component.evaluate((node) => {
      const track = node
        .querySelector('.slider-track')!
        .getBoundingClientRect();
      const divider = node
        .querySelector('.slider-divider')!
        .getBoundingClientRect();
      return (divider.x + divider.width / 2 - track.x - 2) / (track.width - 4);
    });
  await slider.fill('2');
  await expect(value).toHaveText('2×');
  await expect(slider).toHaveAttribute('aria-valuetext', '2×');
  expect(await progress()).toBeCloseTo(1, 2);
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(slider).toHaveValue('0.25');
  await expect(value).toHaveText('0.25×');
  expect(await progress()).toBeCloseTo(0, 2);
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft');
  await expect(value).toHaveText('1.95×');
  await slider.click({ position: { x: 2, y: 22 } });
  await expect(slider).toHaveValue('0.25');
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(value).toHaveText('1.4×');
  await expect(slider).toHaveAttribute('aria-valuetext', '1.4×');
  expect(await progress()).toBeCloseTo((1.4 - 0.25) / (2 - 0.25), 2);
});

test('percentage sliders map the display scale to simulation values and reset original defaults', async ({
  page,
}) => {
  await openPaused(page);
  await expect(page.getByRole('slider', { name: 'Fin length' })).toHaveValue(
    '65',
  );
  await expect(page.getByRole('slider', { name: 'Fin width' })).toHaveValue(
    '70',
  );
  const spacing = page.getByRole('slider', { name: 'Character spacing' });
  await expect(spacing).toHaveAttribute('min', '4');
  await expect(spacing).toHaveAttribute('max', '20');
  await expect(spacing).toHaveValue('8');
  for (const slider of await page
    .locator('range-slider[data-unit="%"] input')
    .all()) {
    await expect(slider).toHaveAttribute('min', '0');
    await expect(slider).toHaveAttribute('max', '100');
  }
  await page.evaluate(() => {
    const surface = document.querySelector(
      'swimming-surface',
    ) as HTMLElement & {
      controller: { update(settings: Record<string, number>): void };
    };
    const original = surface.controller.update;
    surface.controller.update = (settings) => {
      surface.dataset.lastUpdate = JSON.stringify(settings);
      original(settings);
    };
  });
  for (const [label, key, samples] of [
    [
      'Fin length',
      'length',
      [
        [0, 15],
        [50, 35],
        [100, 55],
      ],
    ],
    [
      'Fin width',
      'width',
      [
        [0, 1],
        [50, 4.5],
        [100, 8],
      ],
    ],
  ] as const) {
    const slider = page.getByRole('slider', { name: label });
    for (const [display, actual] of samples) {
      await slider.fill(String(display));
      await expect(page.locator('swimming-surface')).toHaveAttribute(
        'data-last-update',
        JSON.stringify({ [key]: actual }),
      );
      await expect(page.locator(`output[for="swim-${key}"]`)).toHaveText(
        `${display}%`,
      );
    }
  }
  await spacing.fill('4');
  await expect(page.locator('swimming-surface')).toHaveAttribute(
    'data-last-update',
    '{"spacing":4}',
  );
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(page.locator('output[for="swim-length"]')).toHaveText('65%');
  await expect(page.locator('output[for="swim-width"]')).toHaveText('70%');
  await expect(spacing).toHaveValue('8');
});

test('visibility toggles precede their labels and share the top toolbar with solid playback icons', async ({
  page,
  isMobile,
}) => {
  await openPaused(page);
  const toolbar = page.locator('.controls-toolbar');
  await expect(toolbar.getByRole('switch')).toHaveCount(3);
  await expect(
    toolbar.getByRole('button', { name: 'Resume', exact: true }),
  ).toBeVisible();
  const svg = toolbar.locator('[data-play-icon] svg');
  expect(await svg.evaluate((node) => getComputedStyle(node).fill)).not.toBe(
    'none',
  );
  await expect(svg).toHaveCSS('stroke', 'none');
  for (const toggle of await toolbar.getByRole('switch').all()) {
    const positions = await toggle.evaluate((node) => ({
      toggle: node.getBoundingClientRect().toJSON(),
      label: document
        .getElementById(node.getAttribute('aria-labelledby')!)!
        .getBoundingClientRect()
        .toJSON(),
    }));
    expect(positions.toggle.right).toBeLessThan(positions.label.left);
  }
  if (!isMobile) {
    const centers = await toolbar
      .locator('.preview-options, .playback-controls')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const bounds = node.getBoundingClientRect();
          return bounds.y + bounds.height / 2;
        }),
      );
    expect(centers[0]).toBeCloseTo(centers[1], 1);
  }
  const bounds = (await toolbar.boundingBox())!;
  const route = (await page.locator('.route-picker').boundingBox())!;
  expect(bounds.y + bounds.height).toBeLessThan(route.y);
});

test('non-docs footers link to Swim after Agents', async ({ page }) => {
  for (const path of [
    '/',
    '/install',
    '/agents',
    '/playground',
    '/swim',
    '/missing-page',
  ]) {
    await page.goto(path);
    const footer = page.getByRole('navigation', { name: 'Footer navigation' });
    await expect(footer.getByRole('link')).toHaveText([
      'Install',
      'Docs',
      'Terminal',
      'Agents',
      'Swim',
    ]);
    await expect(
      footer.getByRole('link', { name: 'Swim', exact: true }),
    ).toHaveAttribute('href', '/swim');
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole('navigation', { name: 'Footer navigation' })
    .getByRole('link', { name: 'Swim', exact: true })
    .click();
  await expect(page).toHaveURL('/swim');
  await page.goto('/docs');
  await expect(page.locator('.site-footer')).toHaveCount(0);
});

test('swim is a compact easter egg with shape-only keyboard-accessible routes', async ({
  page,
}) => {
  await openPaused(page);
  await expect(
    page.getByRole('group', { name: 'Route', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.route-option')).toHaveCount(8);
  const routeRows = await page
    .locator('.route-option')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    );
  expect(new Set(routeRows).size).toBe(1);
  await expect(page.locator('main h1')).toContainText('$ koi swim');
  await expect(page.locator('main')).not.toContainText(
    'Something beneath the surface',
  );
  await expect(page.locator('main')).not.toContainText(
    'surface: character field',
  );
  await expect(page.locator('main')).not.toContainText('Surface parameters');
  await expect(
    page.getByRole('group', { name: 'Controls', exact: true }),
  ).toBeVisible();
  const header = (await page.locator('.site-header').boundingBox())!;
  const preview = (await page
    .locator('[data-swimming-preview]')
    .boundingBox())!;
  expect(preview.y - header.y - header.height).toBeLessThan(70);
  for (const card of await page.locator('.route-option').all()) {
    expect((await card.textContent())!.trim()).toBe('');
    await expect(card.locator('svg')).toBeVisible();
    await expect(card.locator('input')).toHaveCSS('opacity', '0');
  }
  await page.getByRole('radio', { name: 'Pond loop', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('radio', { name: 'Figure eight', exact: true }),
  ).toBeChecked();
  await expect(page.locator('swimming-surface')).toHaveAttribute(
    'data-route',
    'eight',
  );
  const old = await page.request.get('/demo');
  expect(old.status()).toBe(404);
});

test('glass transparency updates without moving the three random non-overlapping squircles', async ({
  page,
}) => {
  await openPaused(page);
  const toggle = page.getByRole('switch', {
    name: 'Show glass',
    exact: true,
  });
  await toggle.click();
  const layout = () =>
    page.locator('[data-glass-overlay]').evaluate((overlay) => {
      const bounds = overlay.getBoundingClientRect();
      return [...overlay.children].map((panel) => {
        const rect = panel.getBoundingClientRect();
        return {
          x: rect.x - bounds.x,
          y: rect.y - bounds.y,
          width: rect.width,
          height: rect.height,
          inside:
            rect.x >= bounds.x &&
            rect.y >= bounds.y &&
            rect.right <= bounds.right &&
            rect.bottom <= bounds.bottom,
        };
      });
    });
  const validate = async () => {
    const panels = await layout();
    expect(panels).toHaveLength(3);
    for (const panel of panels) {
      expect(panel.inside).toBe(true);
      expect(panel.width).toBeGreaterThan(0);
      expect(panel.width).toBe(panel.height);
    }
    for (let i = 0; i < panels.length; i++) {
      for (let j = i + 1; j < panels.length; j++) {
        const a = panels[i],
          b = panels[j];
        expect(
          a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y,
        ).toBe(true);
      }
    }
    return panels;
  };
  const original = await validate();
  const slider = page.getByRole('slider', { name: 'Glass transparency' });
  await expect(slider).toHaveValue('65');
  await slider.fill('90');
  await expect(page.locator('output[for="swim-transparency"]')).toHaveText(
    '90%',
  );
  expect(await layout()).toEqual(original);
  expect(
    await page
      .locator('.surface-preview')
      .evaluate((node) =>
        getComputedStyle(node).getPropertyValue('--glass-opacity'),
      ),
  ).toBe('0.1');
  await slider.fill('0');
  expect(
    await page
      .locator('.surface-preview')
      .evaluate((node) =>
        getComputedStyle(node).getPropertyValue('--glass-opacity'),
      ),
  ).toBe('1');
  await slider.fill('100');
  expect(
    await page
      .locator('.surface-preview')
      .evaluate((node) =>
        getComputedStyle(node).getPropertyValue('--glass-opacity'),
      ),
  ).toBe('0');
  await toggle.click();
  await toggle.click();
  expect(await layout()).not.toEqual(original);
  await page.setViewportSize({ width: 320, height: 800 });
  await expect
    .poll(async () => (await layout()).every((panel) => panel.inside))
    .toBe(true);
  await validate();
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('[data-glass-overlay]')).toBeHidden();
  await expect(slider).toHaveValue('65');
  await expect(page.locator('output[for="swim-transparency"]')).toHaveText(
    '65%',
  );
});

test('control and route hover changes only the fill in both themes', async ({
  page,
}) => {
  await openPaused(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    for (const target of [
      page.getByRole('button', { name: 'Resume', exact: true }),
      page.getByRole('button', { name: 'Reset defaults' }),
      ...(await page.locator('.route-option').all()),
    ]) {
      await target.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const before = await target.evaluate((node) => ({
        fill: getComputedStyle(node).backgroundColor,
        color: getComputedStyle(node).color,
        rect: node.getBoundingClientRect().toJSON(),
      }));
      await target.hover();
      expect(
        await target.evaluate((node) => getComputedStyle(node).backgroundColor),
      ).not.toBe(before.fill);
      await expect(target).toHaveCSS('color', before.color);
      await expect(target).toHaveCSS('transform', 'none');
      expect(
        await target.evaluate((node) => node.getBoundingClientRect().toJSON()),
      ).toEqual(before.rect);
    }
  }
});

test('route cards switch the preview without changing tuning or playback and reset restores the preset', async ({
  page,
}) => {
  await openPaused(page);
  const original = await image(page);
  for (const [name, id] of [
    ['Figure eight', 'eight'],
    ['Meander', 'meander'],
    ['Long wander', 'wander'],
    ['River weave', 'weave'],
    ['Serpentine', 'serpentine'],
    ['Twin loops', 'twin-loops'],
    ['Braided loops', 'braid'],
  ]) {
    await page.getByRole('radio', { name, exact: true }).check();
    await expect(page.locator('swimming-surface')).toHaveAttribute(
      'data-route',
      id,
    );
    await expect(page.locator('swimming-surface')).toHaveAttribute(
      'data-state',
      'paused',
    );
    await expect(
      page.getByRole('slider', { name: 'Swimming speed' }),
    ).toHaveValue('1.4');
    await expect(page.getByRole('slider', { name: 'Fin width' })).toHaveValue(
      '70',
    );
    expect(await image(page)).not.toBe(original);
  }
  await page.getByRole('switch', { name: 'Show route', exact: true }).click();
  await page.getByRole('slider', { name: 'Fin length' }).fill('25');
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(
    page.getByRole('radio', { name: 'Pond loop', exact: true }),
  ).toBeChecked();
  await expect(page.getByRole('slider', { name: 'Fin length' })).toHaveValue(
    '65',
  );
  await expect(page.locator('output[for="swim-length"]')).toHaveText('65%');
  await expect(page.locator('swimming-surface')).toHaveAttribute(
    'data-route',
    'loop',
  );
  expect(await image(page)).toBe(original);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('radio', { name: 'Long wander', exact: true }).check();
  await expect(page.locator('swimming-surface')).toHaveAttribute(
    'data-state',
    'playing',
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator('swimming-surface')).toHaveAttribute(
    'data-route',
    'wander',
  );
});

test('without JavaScript the preview explains its fallback and controls stay disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/swim');
  await expect(
    page.locator('swimming-surface').getByRole('status'),
  ).toContainText('Animation preview unavailable');
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeDisabled();
  await context.close();
});

test('unavailable Canvas leaves a readable fallback', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto('/swim');
  await expect(
    page.locator('swimming-surface').getByRole('status'),
  ).toContainText('Animation preview unavailable');
  await expect(page.getByRole('slider', { name: 'Fin length' })).toBeDisabled();
});
