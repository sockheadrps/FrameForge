import { sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getDatabase } from '#lib/server/db/index.js';

export async function GET() {
	try {
		getDatabase().run(sql`select 1`);
		return json({ status: 'ok' });
	} catch {
		return json({ status: 'unavailable' }, { status: 503 });
	}
}
