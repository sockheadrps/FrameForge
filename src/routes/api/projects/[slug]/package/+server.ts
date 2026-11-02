import { json } from '@sveltejs/kit';
import { readConfig } from '#lib/server/config.js';
import { getDatabase } from '#lib/server/db/index.js';
import { ProjectPackageService } from '#lib/server/portability/project-package.js';
import { StoryService } from '#lib/server/story/story-service.js';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ params }) => {
	const project = await new StoryService(getDatabase()).getProjectBySlug(params.slug);
	if (!project) return json({ message: 'Project not found' }, { status: 404 });
	const pkg = new ProjectPackageService(getDatabase(), readConfig(process.env).mediaRoot).export(
		project.id
	);
	return new Response(JSON.stringify(pkg), {
		headers: {
			'content-type': 'application/vnd.frameforge.project+json',
			'content-disposition': `attachment; filename="${project.slug}.frameforge.json"`
		}
	});
};
export const POST: RequestHandler = async ({ request }) => {
	try {
		return json(
			new ProjectPackageService(getDatabase(), readConfig(process.env).mediaRoot).import(
				await request.json()
			)
		);
	} catch (cause) {
		return json(
			{ message: cause instanceof Error ? cause.message : 'Invalid project package' },
			{ status: 400 }
		);
	}
};
