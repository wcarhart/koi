import { test, expect } from '@playwright/test';

test('validator lifecycle and shell transcript render in both themes', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/docs/reference/add_validator#lifecycle');
  const diagram = page.locator(
    '#doc-reference-add_validator .validation-lifecycle',
  );
  const stages = diagram.locator('li');
  await expect(stages).toHaveCount(3);
  await expect(stages.nth(0)).toHaveText(
    'Token parsingRequiredness checksCheck groupsCheck dependenciesDefault resolutionDestination-type checks',
  );
  await expect(stages.nth(1).locator('strong')).toHaveText('Validation');
  await expect(stages.nth(2)).toHaveText('Destination assignmentDispatch');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    await diagram.scrollIntoViewIfNeeded();
    const boxes = await stages.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
    if (isMobile) {
      expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height);
      expect(boxes[2].y).toBeGreaterThan(boxes[1].y + boxes[1].height);
    } else {
      expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width);
      expect(boxes[2].x).toBeGreaterThan(boxes[1].x + boxes[1].width);
    }
    const accent = await stages.nth(1).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        border: style.borderTopColor,
        text: style.color,
        fill: style.backgroundImage,
      };
    });
    expect(accent.border).toBe(accent.text);
    expect(accent.fill).toBe('none');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await diagram.screenshot({
      path: testInfo.outputPath(`lifecycle-${theme}.png`),
    });
  }
  const transcript = page
    .locator('#doc-reference-add_validator .code-block')
    .filter({ hasText: '$ ./greet.sh "ada"' });
  await expect(transcript.locator('pre')).toHaveCount(1);
  await expect(transcript.locator('.line')).toHaveCount(4);
  await transcript.screenshot({
    path: testInfo.outputPath('shell-transcript.png'),
  });
});

test('detailed parsing lifecycle reads left to right in five-plus-four neutral stages', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/docs/concepts/control-flow#parsing-steps');
  const viewport = page.getByRole('region', {
    name: 'Parsing pipeline',
    exact: true,
  });
  const diagram = viewport.getByRole('list', {
    name: 'Parsing steps',
    exact: true,
  });
  const stages = diagram.locator('li');
  await expect(stages).toHaveText([
    'Token parsing',
    'Requiredness checks',
    'Check groups',
    'Check dependencies',
    'Default resolution',
    'Destination-type checks',
    'Validation',
    'Destination assignment',
    'Dispatch(if selected)',
  ]);
  await expect(
    diagram.locator('.validation-lifecycle-check, strong'),
  ).toHaveCount(0);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
    }, theme);
    const boxes = await stages.evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { left: box.left, top: box.top, bottom: box.bottom };
      }),
    );
    for (let i = 1; i < 5; i++) {
      expect(boxes[i].top).toBe(boxes[0].top);
      expect(boxes[i].left).toBeGreaterThan(boxes[i - 1].left);
    }
    expect(boxes[5].top).toBeGreaterThan(boxes[0].bottom);
    expect(boxes[5].left).toBe(boxes[0].left);
    for (let i = 6; i < 9; i++) {
      expect(boxes[i].top).toBe(boxes[5].top);
      expect(boxes[i].left).toBeGreaterThan(boxes[i - 1].left);
    }
    const colors = await stages.evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return [style.borderTopColor, style.color, style.backgroundColor];
      }),
    );
    for (const color of colors) expect(color).toEqual(colors[0]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await viewport.evaluate((node) => {
      node.scrollLeft = 0;
    });
    await viewport.screenshot({
      path: testInfo.outputPath(`parsing-${theme}.png`),
    });
    if (isMobile) {
      const scrolls = await viewport.evaluate(
        (node) => node.scrollWidth > node.clientWidth,
      );
      expect(scrolls).toBe(true);
      await viewport.focus();
      await page.keyboard.press('End');
      await viewport.evaluate((node) => {
        node.scrollLeft = node.scrollWidth;
      });
      await viewport.screenshot({
        path: testInfo.outputPath(`parsing-${theme}-end.png`),
      });
    }
  }
});
