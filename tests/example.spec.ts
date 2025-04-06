import { test, expect } from '@playwright/test';

// test('has title', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/Playwright/);
// });

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();

//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });

test('test', async ({page}) => {
  await page.goto('https://apna-host.vercel.app/?appUrl=http://localhost:3001&appId=bb6d2a9bf312845c50b530d3f4186d168e44557a80cf293123a6a034fd73d96d');
  // locator('#miniAppIframe').contentFrame().getByRole('button', { name: 'Profile' })
  // Wait for the iframe to be present in the DOM
  await page.waitForSelector('iframe');
  
  // Get the iframe element
  const iframeElement = await page.$('iframe');
  
  // Get the iframe's content frame
  const frame = await iframeElement.contentFrame();
  
  // Wait for the iframe content to be fully loaded
  await frame.waitForLoadState('load');
  
  // Optional: Add a small timeout to ensure everything is settled
  await page.waitForTimeout(10000);

  await expect(frame.getByRole('button', { name: 'Profile' })).toBeVisible();
  await frame.getByRole('button', { name: 'Profile' }).click();
  await frame.waitForTimeout(10000);
  
  // Optional: Verify the iframe has loaded by checking if a specific element exists
  // Uncomment and modify the selector based on your iframe content
  // await expect(frame.locator('body')).toBeVisible();
});