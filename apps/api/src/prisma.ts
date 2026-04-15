// Use require() to avoid TypeScript import-time errors if the generated Prisma client
// is not yet available. We export a single default `prisma` object.
const globalAny: any = global;

const RETRYABLE_PRISMA_CODES = new Set(['ECONNREFUSED', 'P1001', 'P1002', 'P1017']);

function toPositiveInt(value: string | undefined, fallback: number) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) return fallback;
	return Math.floor(parsed);
}

const PRISMA_QUERY_RETRY_ATTEMPTS = toPositiveInt(process.env.PRISMA_QUERY_RETRY_ATTEMPTS, 1);
const PRISMA_QUERY_RETRY_DELAY_MS = toPositiveInt(process.env.PRISMA_QUERY_RETRY_DELAY_MS, 120);
const PRISMA_ENGINE_RESET_COOLDOWN_MS = toPositiveInt(process.env.PRISMA_ENGINE_RESET_COOLDOWN_MS, 500);

let lastEngineResetAt = 0;
let engineResetPromise: Promise<void> | null = null;

// In-memory fake for quick local testing when USE_FAKE_DB=1 is set.
function createFakePrisma() {
	const memory: Record<string, any> = {};
	return {
		riotAccount: {
			async findUnique({ where }: any) {
				if (!where || !where.id) return null;
				if (!memory[where.id]) {
					memory[where.id] = {
						id: where.id,
						puuid: `puuid-${where.id}`,
						summonerName: `summoner-${where.id}`,
						region: 'NA',
						userId: 'user-1',
						verified: false,
					};
				}
				return memory[where.id];
			},
			async update({ where, data }: any) {
				if (!where || !where.id) throw new Error('missing where.id');
				memory[where.id] = { ...(memory[where.id] || { id: where.id }), ...data };
				return memory[where.id];
			},
		},
	};
}

function isRetryablePrismaEngineError(error: any) {
	if (!error) return false;

	const code = typeof error.code === 'string' ? error.code : '';
	if (RETRYABLE_PRISMA_CODES.has(code)) {
		return true;
	}

	const message = String(error.message || '');
	return message.includes('connect ECONNREFUSED 127.0.0.1:');
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetPrismaEngine(client: any) {
	if (!client || typeof client.$disconnect !== 'function' || typeof client.$connect !== 'function') {
		return;
	}

	const now = Date.now();
	if (engineResetPromise) {
		await engineResetPromise;
		return;
	}

	if (now - lastEngineResetAt < PRISMA_ENGINE_RESET_COOLDOWN_MS) {
		return;
	}

	engineResetPromise = (async () => {
		lastEngineResetAt = Date.now();
		try {
			await client.$disconnect();
		} catch {
			// Best effort disconnect when the engine has already crashed.
		}

		if (PRISMA_QUERY_RETRY_DELAY_MS > 0) {
			await sleep(PRISMA_QUERY_RETRY_DELAY_MS);
		}

		try {
			await client.$connect();
		} catch (error: any) {
			console.warn('[Prisma] Failed to reconnect query engine:', error?.message || error);
		}
	})();

	try {
		await engineResetPromise;
	} finally {
		engineResetPromise = null;
	}
}

function installPrismaRetryMiddleware(client: any) {
	if (!client || typeof client.$use !== 'function') {
		return;
	}

	if (client.__PRISMA_RETRY_MIDDLEWARE_INSTALLED) {
		return;
	}

	client.$use(async (params: any, next: any) => {
		let attempt = 0;

		while (true) {
			try {
				return await next(params);
			} catch (error: any) {
				if (!isRetryablePrismaEngineError(error) || attempt >= PRISMA_QUERY_RETRY_ATTEMPTS) {
					throw error;
				}

				attempt += 1;
				const model = params?.model || 'raw';
				const action = params?.action || 'query';
				console.warn(
					`[Prisma] Retryable engine error on ${model}.${action}. Retrying (${attempt}/${PRISMA_QUERY_RETRY_ATTEMPTS})`
				);

				await resetPrismaEngine(client);
			}
		}
	});

	client.__PRISMA_RETRY_MIDDLEWARE_INSTALLED = true;
}

function createPrismaClient() {
	const pkg = require('@prisma/client');
	const PrismaClient = pkg.PrismaClient || pkg.default || pkg;
	const client = new PrismaClient();
	installPrismaRetryMiddleware(client);
	return client;
}

let prisma: any;
if (globalAny.__PRISMA_MOCK) {
	prisma = globalAny.__PRISMA_MOCK;
} else if (process.env.USE_FAKE_DB === '1') {
	prisma = createFakePrisma();
} else {
	if (globalAny.__PRISMA_CLIENT) {
		prisma = globalAny.__PRISMA_CLIENT;
		installPrismaRetryMiddleware(prisma);
	} else {
		prisma = createPrismaClient();
		globalAny.__PRISMA_CLIENT = prisma;
	}
}

export default prisma;
