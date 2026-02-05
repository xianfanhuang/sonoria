import { test, expect } from '@playwright/test';

test('has title and 3D canvas', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Check for the header text
  await expect(page.getByText('Lorenz Chaos V2')).toBeVisible();

  // Check for the canvas element
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});
