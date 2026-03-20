import { test, expect } from '@playwright/test';

test('OTP flow', async ({ page }) => {
  await page.goto('https://client.boreal.financial');

  await page.fill('input', '5878881837');
  await page.click('text=Send code');

  await expect(page.locator('text=Failed')).not.toBeVisible();
});
