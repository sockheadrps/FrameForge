import { expect, test } from '@playwright/test';

test('reports database-backed health', async ({ request }) => {
	const response = await request.get('/healthz');
	expect(response.ok()).toBe(true);
	expect(await response.json()).toEqual({ status: 'ok' });
});

test('shows the FrameForge dashboard', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Good evening.' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'New project' })).toBeVisible();

	const sidebar = await page.locator('.sidebar').boundingBox();
	const workspace = await page.locator('.app-shell > main').boundingBox();
	const inspector = await page.locator('.inspector').boundingBox();

	expect(sidebar).not.toBeNull();
	expect(workspace).not.toBeNull();
	expect(inspector).not.toBeNull();
	expect(workspace!.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width);
	expect(inspector!.x).toBeGreaterThanOrEqual(workspace!.x + workspace!.width);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
});

test('navigates to projects', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'Projects', exact: true }).click();
	await expect(page).toHaveURL('/projects');
	await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
});

test('creates and persists a project', async ({ page }) => {
	const title = `Browser project ${Date.now()}`;
	await page.goto('/projects/new');
	await page.getByLabel('Title Required').fill(title);
	await page.getByLabel('Logline').fill('A persistent browser smoke-test production.');
	await page.getByRole('button', { name: 'Create project' }).click();
	await expect(page.getByRole('heading', { name: title })).toBeVisible();

	await page.goto('/projects');
	await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
});

test('primary navigation is keyboard accessible', async ({ page }) => {
	await page.goto('/');
	await page.keyboard.press('Tab');
	const focused = page.locator(':focus');
	await expect(focused).toBeVisible();
	await expect(focused).toHaveAttribute('href');
});
