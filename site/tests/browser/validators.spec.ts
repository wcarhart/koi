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
    'Token parsingRequiredness checksDefault resolutionDestination-type-specific checks',
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
