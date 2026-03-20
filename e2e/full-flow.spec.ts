import { test, expect } from '@playwright/test';

test('client loads', async ({ page }) => {
  await page.goto('https://client.boreal.financial');
  await expect(page).toHaveURL(/client/);
});

test('otp flow does not 404', async ({ page }) => {
  await page.goto('https://client.boreal.financial');

  await page.fill('input', '5878881837');
  await page.click('text=Send code');

  await page.waitForTimeout(2000);

  const error = await page.locator('text=Cannot POST').count();
  expect(error).toBe(0);
});
