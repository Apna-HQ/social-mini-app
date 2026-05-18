import { test, expect } from '@playwright/test';

test.setTimeout(180_000);

const HOST = process.env.APNA_HOST_URL ?? 'http://localhost:3100';
const APP = process.env.APNA_SOCIAL_URL ?? 'http://localhost:3101';

test('iframe nav clicks (force, ignore overlay)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e: any) => errors.push('top pageerror: ' + String(e?.stack || e)));
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      const loc = msg.location?.()?.url || '';
      errors.push(`${loc.includes('3101') ? 'IFRAME' : 'TOP'} console: ${msg.text()}`);
    }
  });

  await page.addInitScript(() => {
    const npub = 'npub1xauxr09r2d89pxzflfskjjhsf08eh6xqktjas7pyuu0q3p46s85s5dnpwq';
    const nsec = 'nsec1etdpwxt9r5e35y3cp5ztuzamvexrm67ss5dk5ptj3zswe82xsfpqevumq2';
    const pubkey = '377861bca3534e509849fa61694af04bcf9be8c0b2e5d87824e71e0886ba81e9';
    localStorage.setItem('npub', npub);
    localStorage.setItem('nsec', nsec);
    localStorage.setItem('active_profile_npub', npub);
    localStorage.setItem('user_profiles', JSON.stringify([
      { npub, nsec, isActive: true, signerType: 'local', isRemoteSigner: false, alias: 'Probe' },
    ]));
    localStorage.setItem('profile', JSON.stringify({
      pubkey,
      metadata: { name: 'Probe' },
      followers: [],
      following: [],
      stats: { posts: 0 },
    }));
  });

  const url = `${HOST}/app?appId=social-mini-app&appUrl=${encodeURIComponent(APP)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('iframe', { state: 'attached', timeout: 60_000 });
  await page.waitForTimeout(10_000);
  const allowButton = page.getByRole('button', { name: 'Allow' });
  if (await allowButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await allowButton.click();
    await page.waitForTimeout(2_000);
  }

  const frame = page.frames().find((f: any) => f.url().includes('localhost:3101'));
  if (!frame) {
    console.log('NO iframe. Frames:', page.frames().map((f: any) => f.url()));
    return;
  }
  console.log('Iframe URL:', frame.url());
  console.log('Initial body:', (await frame.locator('body').innerText()).slice(0, 500));

  await frame.getByRole('button', { name: /Search/ }).click({ force: true });
  await page.waitForTimeout(4000);
  const f2 = page.frames().find((f: any) => f.url().includes('localhost:3101'));
  if (f2) {
    console.log('After Search click - URL:', f2.url());
    console.log('After Search click - body:', (await f2.locator('body').innerText().catch(() => '<err>')).slice(0, 1500));
  }

  // Now try Profile
  await (f2 ?? frame).getByRole('button', { name: /Profile/ }).click({ force: true });
  await page.waitForTimeout(4000);
  const f3 = page.frames().find((f: any) => f.url().includes('localhost:3101'));
  if (f3) {
    console.log('After Profile click - URL:', f3.url());
    console.log('After Profile click - body:', (await f3.locator('body').innerText().catch(() => '<err>')).slice(0, 1500));
  }

  console.log('\n=== ALL ERRORS ===');
  console.log(JSON.stringify(errors, null, 2));
  expect(true).toBe(true);
});
