export type FrameForgeConfig = {
	dataDir: string;
	databasePath: string;
	mediaRoot: string;
	linkedMediaRoots: string[];
	uploadLimitMb: number;
};

export function readConfig(env: Record<string, string | undefined>): FrameForgeConfig {
	const dataDir =
		env.FRAMEFORGE_DATA_DIR?.trim() ||
		(env.NODE_ENV === 'production' ? '/var/lib/frameforge' : resolve('.data'));
	const uploadLimitMb = Number(env.FRAMEFORGE_UPLOAD_LIMIT_MB ?? 1024);
	if (!Number.isInteger(uploadLimitMb) || uploadLimitMb < 1) {
		throw new Error('FRAMEFORGE_UPLOAD_LIMIT_MB must be a positive integer');
	}
	return {
		dataDir,
		databasePath: env.FRAMEFORGE_DATABASE_PATH?.trim() || `${dataDir}/frameforge.db`,
		mediaRoot: env.FRAMEFORGE_MEDIA_ROOT?.trim() || `${dataDir}/media`,
		linkedMediaRoots: (env.FRAMEFORGE_LINKED_MEDIA_ROOTS ?? '')
			.split(';')
			.map((path) => path.trim())
			.filter(Boolean),
		uploadLimitMb
	};
}
import { resolve } from 'node:path';
