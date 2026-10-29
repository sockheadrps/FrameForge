import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		env: { ...process.env, FRAMEFORGE_DATABASE_PATH: './test-results/frameforge-e2e.db' }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
