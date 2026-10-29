export type FrameForgeConfig = {
	dataDir: string;
	databasePath: string;
	mediaRoot: string;
	uploadLimitMb: number;
};

export function readConfig(env: Record<string, string | undefined>): FrameForgeConfig {
	const dataDir = env.FRAMEFORGE_DATA_DIR?.trim() || '/var/lib/frameforge';
	const uploadLimitMb = Number(env.FRAMEFORGE_UPLOAD_LIMIT_MB ?? 1024);
	if (!Number.isInteger(uploadLimitMb) || uploadLimitMb < 1) {
		throw new Error('FRAMEFORGE_UPLOAD_LIMIT_MB must be a positive integer');
	}
	return {
		dataDir,
		databasePath: env.FRAMEFORGE_DATABASE_PATH?.trim() || `${dataDir}/frameforge.db`,
		mediaRoot: env.FRAMEFORGE_MEDIA_ROOT?.trim() || `${dataDir}/media`,
		uploadLimitMb
	};
}
