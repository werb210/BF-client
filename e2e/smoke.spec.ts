import { test, expect } from '@playwright/test'

test('full system loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/localhost/)
})
