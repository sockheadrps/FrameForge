import { z } from 'zod';
import type { FrameForgeDatabase } from '../db';
export type SearchResult = { type: string; id: string; title: string; detail: string };
export class SearchService {
	constructor(private readonly db: FrameForgeDatabase) {}
	search(projectId: string, query: string, limit = 100) {
		const project = z.string().uuid().parse(projectId);
		const term = `%${z.string().trim().min(1).max(200).parse(query)}%`;
		const sql = `
SELECT 'asset' type,id,original_name title,notes detail FROM assets WHERE project_id=? AND (original_name LIKE ? OR notes LIKE ?)
UNION ALL SELECT 'prompt',p.id,p.name,r.text FROM prompts p JOIN prompt_revisions r ON r.prompt_id=p.id WHERE p.project_id=? AND (p.name LIKE ? OR r.text LIKE ?)
UNION ALL SELECT 'episode',e.id,e.title,e.synopsis FROM episodes e WHERE e.project_id=? AND (e.title LIKE ? OR e.synopsis LIKE ?)
UNION ALL SELECT 'scene',s.id,s.title,s.description FROM scenes s JOIN episodes e ON e.id=s.episode_id WHERE e.project_id=? AND (s.title LIKE ? OR s.description LIKE ? OR s.location LIKE ?)
UNION ALL SELECT 'shot',sh.id,sh.title,sh.action_description FROM shots sh JOIN scenes s ON s.id=sh.scene_id JOIN episodes e ON e.id=s.episode_id WHERE e.project_id=? AND (sh.title LIKE ? OR sh.action_description LIKE ? OR sh.dialogue LIKE ? OR sh.continuity_notes LIKE ?)
UNION ALL SELECT w.type,w.id,w.name,w.description FROM world_entities w WHERE w.project_id=? AND (w.name LIKE ? OR w.description LIKE ?)
UNION ALL SELECT 'take',t.id,t.name,t.review_notes FROM takes t JOIN shots sh ON sh.id=t.shot_id JOIN scenes s ON s.id=sh.scene_id JOIN episodes e ON e.id=s.episode_id WHERE e.project_id=? AND (t.name LIKE ? OR t.review_notes LIKE ? OR t.model LIKE ?)
LIMIT ?`;
		return this.db.$client
			.prepare(sql)
			.all(
				project,
				term,
				term,
				project,
				term,
				term,
				project,
				term,
				term,
				project,
				term,
				term,
				term,
				project,
				term,
				term,
				term,
				term,
				project,
				term,
				term,
				project,
				term,
				term,
				term,
				Math.min(Math.max(limit, 1), 250)
			) as SearchResult[];
	}
}
