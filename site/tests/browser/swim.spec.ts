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
    name: 'Koi depth',
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
  await page.getByRole('slider', { name: 'Koi speed' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('slider', { name: 'Koi speed' })).toHaveValue(
    '1.45',
  );
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
  await expect(page.locator('range-slider')).toHaveCount(11);
  const slider = page.getByRole('slider', {
    name: 'Koi speed',
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
  await expect(page.getByRole('slider', { name: 'Koi length' })).toHaveValue(
    '65',
  );
  await expect(page.getByRole('slider', { name: 'Koi width' })).toHaveValue(
    '70',
  );
  const spacing = page.getByRole('slider', { name: 'Glyph spacing' });
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
      'Koi length',
      'length',
      [
        [0, 15],
        [50, 35],
        [100, 55],
      ],
    ],
    [
      'Koi width',
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

test('pane sliders hide their values when disabled, remember settings, and render one to five panes', async ({
  page,
}) => {
  await openPaused(page);
  const toggle = page.getByRole('switch', { name: 'Show glass', exact: true });
  const frost = page.getByRole('slider', { name: 'Pane frost', exact: true });
  const count = page.getByRole('slider', { name: 'Pane count', exact: true });
  const components = [frost, count].map((input) =>
    page.locator('range-slider').filter({ has: input }),
  );
  const checkDisabled = async () => {
    for (const [i, input] of [frost, count].entries()) {
      const component = components[i];
      await expect(input).toBeDisabled();
      const tooltip = `Enable glass to adjust pane ${i === 0 ? 'frost' : 'count'}.`;
      await expect(component).not.toHaveAttribute('title');
      const bubble = component.getByRole('tooltip', { includeHidden: true });
      await expect(bubble).toHaveText(tooltip);
      await component.hover();
      // Check the style in the hover event's next frame without waiting for a delay.
      expect(
        await bubble.evaluate((node) => getComputedStyle(node).visibility),
      ).toBe('visible');
      await page.keyboard.press('Escape');
      await expect(bubble).toBeHidden();
      await page.mouse.move(0, 0);
      await component.hover();
      await expect(bubble).toBeVisible();
      await page.mouse.move(0, 0);
      await expect(bubble).toBeHidden();
      await expect(input).toHaveAttribute('aria-description', tooltip);
      for (const target of [
        component,
        component.locator('label'),
        component.locator('output'),
      ])
        await expect(target).toHaveCSS('cursor', 'not-allowed');
      await expect(component.locator('output')).toHaveCSS('font-size', '24px');
      await expect(component.locator('output')).toHaveText('∅');
      await expect(input).toHaveAttribute('aria-valuetext', '∅');
      await expect(component.locator('.slider-divider')).toBeHidden();
      await expect(component.locator('.slider-after')).toBeHidden();
      const track = await component.evaluate((node) => {
        const before = node.querySelector('.slider-before')!;
        return {
          fill: getComputedStyle(before).backgroundColor,
          width: before.getBoundingClientRect().width,
          trackWidth: node
            .querySelector('.slider-track')!
            .getBoundingClientRect().width,
          line: getComputedStyle(document.documentElement)
            .getPropertyValue('--line')
            .trim(),
        };
      });
      expect(track.width).toBe(track.trackWidth);
      // Resolve the theme token through a color property before comparing.
      const grey = await component.evaluate((node) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--line)';
        node.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      expect(track.fill).toBe(grey);
    }
  };
  await checkDisabled();
  const emptyHeight = await components[0].locator('output').evaluate((node) => {
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = getComputedStyle(node).font;
    const glyph = context.measureText('∅');
    return glyph.actualBoundingBoxAscent + glyph.actualBoundingBoxDescent;
  });
  await toggle.click();
  const valueHeight = await components[0].locator('output').evaluate((node) => {
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = getComputedStyle(node).font;
    const glyph = context.measureText('0');
    return glyph.actualBoundingBoxAscent + glyph.actualBoundingBoxDescent;
  });
  expect(Math.abs(emptyHeight - valueHeight)).toBeLessThan(1);
  await expect(frost).toBeEnabled();
  await expect(count).toBeEnabled();
  await expect(count).toHaveValue('3');
  await expect(count).toHaveAttribute('min', '1');
  await expect(count).toHaveAttribute('max', '5');
  for (const value of [1, 2, 3, 4, 5]) {
    await count.fill(String(value));
    await expect(page.locator('.glass-squircle')).toHaveCount(value);
    await expect(components[1].locator('output')).toHaveText(String(value));
  }
  await frost.fill('72');
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await toggle.click();
    await checkDisabled();
    await expect(page.locator('[data-glass-overlay]')).toBeHidden();
    await expect(frost).toHaveValue('72');
    await expect(count).toHaveValue('5');
    await toggle.click();
    for (const component of components) {
      await expect(component).not.toHaveAttribute('title');
      await component.hover();
      await expect(
        component.getByRole('tooltip', { includeHidden: true }),
      ).toBeHidden();
      await expect(component.locator('input')).not.toHaveAttribute(
        'aria-description',
      );
      await expect(component.locator('input')).toHaveCSS('cursor', 'pointer');
      await expect(component.locator('output')).toHaveCSS('font-size', '24px');
    }
    await expect(components[0].locator('output')).toHaveText('72%');
    await expect(components[1].locator('output')).toHaveText('5');
    await expect(components[0].locator('.slider-divider')).toBeVisible();
    await expect(components[1].locator('.slider-divider')).toBeVisible();
    await expect(page.locator('.glass-squircle')).toHaveCount(5);
  }
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await checkDisabled();
  await toggle.click();
  await expect(frost).toHaveValue('35');
  await expect(count).toHaveValue('3');
  await expect(page.locator('.glass-squircle')).toHaveCount(3);
});

test('custom sliders react to inherited fieldset disabled state without losing their value', async ({
  page,
}) => {
  await openPaused(page);
  const speed = page.getByRole('slider', { name: 'Koi speed' });
  const component = page.locator('range-slider').filter({ has: speed });
  await speed.fill('1.75');
  await speed.evaluate((node) => {
    node.closest('fieldset')!.disabled = true;
  });
  await expect(component.locator('output')).toHaveText('∅');
  await expect(component.locator('.slider-divider')).toBeHidden();
  await speed.evaluate((node) => {
    node.closest('fieldset')!.disabled = false;
  });
  await expect(component.locator('output')).toHaveText('1.75×');
  await expect(component.locator('.slider-divider')).toBeVisible();
  await expect(speed).toHaveValue('1.75');
});

test('glass frost updates without moving the three random non-overlapping squircles', async ({
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
  const slider = page.getByRole('slider', { name: 'Pane frost' });
  await expect(slider).toHaveValue('35');
  await slider.fill('90');
  await expect(page.locator('output[for="swim-frost"]')).toHaveText('90%');
  expect(await layout()).toEqual(original);
  expect(
    await page
      .locator('.surface-preview')
      .evaluate((node) =>
        getComputedStyle(node).getPropertyValue('--glass-opacity'),
      ),
  ).toBe('0.9');
  await slider.fill('0');
  expect(
    await page
      .locator('.surface-preview')
      .evaluate((node) =>
        getComputedStyle(node).getPropertyValue('--glass-opacity'),
      ),
  ).toBe('0');
  await slider.fill('100');
  expect(
    await page
      .locator('.surface-preview')
      .evaluate((node) =>
        getComputedStyle(node).getPropertyValue('--glass-opacity'),
      ),
  ).toBe('1');
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
  await expect(slider).toHaveValue('35');
  await expect(page.locator('output[for="swim-frost"]')).toHaveText('∅');
});

test('glass panels drag independently, stay inside the preview, and stop on release', async ({
  page,
}) => {
  await openPaused(page);
  await page.getByRole('switch', { name: 'Show glass', exact: true }).click();
  const panels = page.locator('.glass-squircle');
  const panel = panels.first();
  await panel.scrollIntoViewIfNeeded();
  const original = (await panel.boundingBox())!;
  const other = (await panels.nth(1).boundingBox())!;
  const bounds = (await page.locator('[data-glass-overlay]').boundingBox())!;
  await page.mouse.move(
    original.x + original.width / 2,
    original.y + original.height / 2,
  );
  await page.mouse.down();
  await expect(panel).toHaveCSS('cursor', 'grabbing');
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  const moved = (await panel.boundingBox())!;
  expect(moved.x).toBeCloseTo(
    bounds.x + bounds.width / 2 - original.width / 2,
    1,
  );
  expect(moved.y).toBeCloseTo(
    bounds.y + bounds.height / 2 - original.height / 2,
    1,
  );
  expect(await panels.nth(1).boundingBox()).toEqual(other);
  await page.mouse.move(bounds.x - 50, bounds.y - 50);
  const corner = (await panel.boundingBox())!;
  expect(corner.x).toBeCloseTo(bounds.x + 16, 1);
  expect(corner.y).toBeCloseTo(bounds.y + 16, 1);
  await page.mouse.move(
    bounds.x + bounds.width + 50,
    bounds.y + bounds.height + 50,
  );
  const opposite = (await panel.boundingBox())!;
  expect(opposite.x + opposite.width).toBeCloseTo(
    bounds.x + bounds.width - 16,
    1,
  );
  expect(opposite.y + opposite.height).toBeCloseTo(
    bounds.y + bounds.height - 16,
    1,
  );
  await page.mouse.up();
  await expect(panel).toHaveCSS('cursor', 'grab');
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  expect(await panel.boundingBox()).toEqual(opposite);
});

test('glass panels support touch dragging and cancel cleanly', async ({
  page,
}) => {
  await openPaused(page);
  await page.getByRole('switch', { name: 'Show glass', exact: true }).click();
  const panel = page.locator('.glass-squircle').first();
  await panel.scrollIntoViewIfNeeded();
  const original = (await panel.boundingBox())!;
  const bounds = (await page.locator('[data-glass-overlay]').boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const touch = async (
    type: 'touchStart' | 'touchMove' | 'touchCancel',
    x = 0,
    y = 0,
  ) =>
    client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchCancel' ? [] : [{ x, y, id: 1 }],
    });
  await touch(
    'touchStart',
    original.x + original.width / 2,
    original.y + original.height / 2,
  );
  await touch(
    'touchMove',
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await expect(panel).toHaveClass(/dragging/);
  await expect
    .poll(async () => (await panel.boundingBox())!.x)
    .toBeCloseTo(bounds.x + bounds.width / 2 - original.width / 2, 1);
  await touch('touchCancel');
  await expect(panel).not.toHaveClass(/dragging/);
  await client.detach();
});

async function cornerPoint(handle: import('@playwright/test').Locator) {
  return handle.locator('.handle-bar').evaluate((node) => {
    const path = node as SVGPathElement;
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const screen = point.matrixTransform(path.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  });
}

test('glass corner bars reveal on hover and resize freely around every opposite corner', async ({
  page,
}) => {
  await openPaused(page);
  await page.getByRole('switch', { name: 'Show glass', exact: true }).click();
  const panel = page.locator('.glass-squircle').first();
  const handles = panel.locator('.glass-resize');
  await page.mouse.move(0, 0);
  await expect(handles.first()).toHaveCSS('opacity', '0');
  await panel.scrollIntoViewIfNeeded();
  const initial = (await panel.boundingBox())!;
  const bounds = (await page.locator('[data-glass-overlay]').boundingBox())!;
  await page.mouse.move(
    initial.x + initial.width / 2,
    initial.y + initial.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.up();
  const other = await page.locator('.glass-squircle').nth(1).boundingBox();
  for (const corner of ['nw', 'ne', 'se', 'sw']) {
    const before = (await panel.boundingBox())!;
    await panel.locator('.glass-material').hover();
    const handle = panel.locator(`[data-corner="${corner}"]`);
    await expect(handle).toHaveCSS('opacity', '1');
    const point = await cornerPoint(handle);
    await page.mouse.move(point.x, point.y);
    await expect(handle).toHaveCSS('opacity', '1');
    const cursor = await handle.evaluate(
      (node) => getComputedStyle(node).cursor,
    );
    await page.mouse.down();
    await expect(panel).toHaveCSS('cursor', cursor);
    await expect(page.locator('html')).toHaveCSS('cursor', cursor);
    await expect(handle).toHaveClass(/active/);
    await expect(panel).toHaveClass(/resizing/);
    await page.mouse.move(
      point.x + (corner.includes('w') ? -20 : 20),
      point.y + (corner.includes('n') ? -30 : 30),
    );
    const after = (await panel.boundingBox())!;
    expect(after.width).toBeCloseTo(before.width + 20, 0);
    expect(after.height).toBeCloseTo(before.height + 30, 0);
    expect(corner.includes('w') ? after.x + after.width : after.x).toBeCloseTo(
      corner.includes('w') ? before.x + before.width : before.x,
      1,
    );
    expect(corner.includes('n') ? after.y + after.height : after.y).toBeCloseTo(
      corner.includes('n') ? before.y + before.height : before.y,
      1,
    );
    await page.mouse.up();
    await expect(handle).not.toHaveClass(/active/);
    await expect(page.locator('html')).not.toHaveAttribute('data-swim-resize');
  }
  expect(await page.locator('.glass-squircle').nth(1).boundingBox()).toEqual(
    other,
  );
  const geometry = await panel.getAttribute('style');
  await page.getByRole('slider', { name: 'Pane frost' }).fill('80');
  expect(await panel.getAttribute('style')).toBe(geometry);
  await page.mouse.move(0, 0);
  await expect(handles.first()).toHaveCSS('opacity', '0');
});

test('glass resize handles support keyboard focus, step sizes, and minimum dimensions', async ({
  page,
}) => {
  await openPaused(page);
  await page.getByRole('switch', { name: 'Show glass', exact: true }).click();
  const panel = page.locator('.glass-squircle').first();
  const handle = panel.getByRole('button', {
    name: 'Resize glass pane 1 from bottom right',
  });
  await panel.scrollIntoViewIfNeeded();
  const start = (await panel.boundingBox())!;
  const preview = (await page.locator('[data-glass-overlay]').boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    preview.x + preview.width / 2,
    preview.y + preview.height / 2,
  );
  await page.mouse.up();
  await handle.focus();
  await expect(handle).toHaveCSS('opacity', '1');
  const before = (await panel.boundingBox())!;
  await handle.press('ArrowRight');
  await handle.press('Shift+ArrowDown');
  const after = (await panel.boundingBox())!;
  expect(after.width).toBeCloseTo(before.width + 4, 1);
  expect(after.height).toBeCloseTo(before.height + 16, 1);
  for (let i = 0; i < 30; i++) {
    await handle.press('Shift+ArrowLeft');
    await handle.press('Shift+ArrowUp');
  }
  const minimum = (await panel.boundingBox())!;
  expect(minimum.width).toBe(48);
  expect(minimum.height).toBe(48);
});

test('touch reveals glass resize bars, supports resizing, and dismisses outside the pane', async ({
  page,
}) => {
  await openPaused(page);
  await page.getByRole('switch', { name: 'Show glass', exact: true }).click();
  const panel = page.locator('.glass-squircle').first();
  await panel.scrollIntoViewIfNeeded();
  const before = (await panel.boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
    x = 0,
    y = 0,
  ) =>
    client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints:
        type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }],
    });
  await touch(
    'touchStart',
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await touch('touchEnd');
  await expect(panel).toHaveClass(/selected/);
  const handle = panel.locator('[data-corner="se"]');
  await expect(handle).toHaveCSS('opacity', '1');
  const point = await cornerPoint(handle);
  await touch('touchStart', point.x, point.y);
  await touch('touchMove', point.x + 20, point.y + 25);
  await expect(panel).toHaveClass(/resizing/);
  await expect
    .poll(async () => (await panel.boundingBox())!.width)
    .toBeCloseTo(before.width + 20, 0);
  await touch('touchCancel');
  await expect(panel).not.toHaveClass(/resizing/);
  await expect(handle).not.toHaveClass(/active/);
  const bounds = (await page.locator('[data-glass-overlay]').boundingBox())!;
  await touch('touchStart', bounds.x + 2, bounds.y + 2);
  await touch('touchEnd');
  await expect(panel).not.toHaveClass(/selected/);
  await expect(handle).toHaveCSS('opacity', '0');
  await client.detach();
});

test('glass resize tint responds to press in both themes and hiding cancels capture', async ({
  page,
}) => {
  await openPaused(page);
  const toggle = page.getByRole('switch', { name: 'Show glass', exact: true });
  await toggle.click();
  const panel = page.locator('.glass-squircle').first();
  const handle = panel.locator('[data-corner="se"]');
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await panel.scrollIntoViewIfNeeded();
    await panel.locator('.glass-material').hover();
    const point = await cornerPoint(handle);
    await page.mouse.move(point.x, point.y);
    const hoverColor = await handle.evaluate(
      (node) => getComputedStyle(node).color,
    );
    await page.mouse.down();
    const activeColor = await handle.evaluate(
      (node) => getComputedStyle(node).color,
    );
    expect(activeColor).not.toBe(hoverColor);
    const bounds = (await page.locator('[data-glass-overlay]').boundingBox())!;
    await page.mouse.move(bounds.x - 100, bounds.y - 100);
    let rect = (await panel.boundingBox())!;
    expect(rect.width).toBe(48);
    expect(rect.height).toBe(48);
    await page.mouse.move(
      bounds.x + bounds.width + 100,
      bounds.y + bounds.height + 100,
    );
    rect = (await panel.boundingBox())!;
    expect(rect.x + rect.width).toBeCloseTo(bounds.x + bounds.width - 16, 1);
    expect(rect.y + rect.height).toBeCloseTo(bounds.y + bounds.height - 16, 1);
    // Hide programmatically while the pointer is captured by a resizing pane.
    await toggle.evaluate((node) => (node as HTMLButtonElement).click());
    await expect(panel).not.toHaveClass(/resizing/);
    await expect(handle).not.toHaveClass(/active/);
    await expect(page.locator('[data-glass-overlay]')).toBeHidden();
    await page.mouse.up();
    await toggle.click();
  }
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
    await expect(page.getByRole('slider', { name: 'Koi speed' })).toHaveValue(
      '1.4',
    );
    await expect(page.getByRole('slider', { name: 'Koi width' })).toHaveValue(
      '70',
    );
    expect(await image(page)).not.toBe(original);
  }
  await page.getByRole('switch', { name: 'Show route', exact: true }).click();
  await page.getByRole('slider', { name: 'Koi length' }).fill('25');
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(
    page.getByRole('radio', { name: 'Pond loop', exact: true }),
  ).toBeChecked();
  await expect(page.getByRole('slider', { name: 'Koi length' })).toHaveValue(
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
  await expect(page.getByRole('slider', { name: 'Koi length' })).toBeDisabled();
});
