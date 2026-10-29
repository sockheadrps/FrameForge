import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type FrameForgeDatabase = ReturnType<typeof createDatabase>;

export function createDatabase(filename: string) {
	if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
	const client = new Database(filename);
	client.pragma('foreign_keys = ON');
	client.pragma('journal_mode = WAL');
	client.pragma('busy_timeout = 5000');
	return drizzle(client, { schema });
}

export function migrateDatabase(db: FrameForgeDatabase, migrationsFolder = 'drizzle') {
	migrate(db, { migrationsFolder });
}

let database: FrameForgeDatabase | undefined;

export function getDatabase() {
	if (!database) {
		const filename = process.env.FRAMEFORGE_DATABASE_PATH || './.data/frameforge.db';
		database = createDatabase(filename);
		migrateDatabase(database);
	}
	return database;
}
