import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: process.env.FRAMEFORGE_DATABASE_PATH || './.data/frameforge.db'
	},
	strict: true,
	verbose: true
});
