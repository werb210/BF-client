import { test, expect } from '@playwright/test';

test('session persists after login', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="phone"]', '+15871234567');
  await page.click('text=Send Code');

  await page.fill('input[name="otp"]', '123456');
  await page.click('text=Verify');

  await page.reload();

  await expect(page.locator('text=Dashboard')).toBeVisible();
});
