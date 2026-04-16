// Use require() to avoid TypeScript import-time errors if the generated Prisma client
// is not yet available. We export a single default `prisma` object.
const globalAny: any = global;

const RETRYABLE_PRISMA_CODES = new Set(['ECONNREFUSED', 'P1001', 'P1002', 'P1017', 'UND_ERR_SOCKET']);

function toPositiveInt(value: string | undefined, fallback: number) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) return fallback;
	return Math.floor(parsed);
}

const PRISMA_QUERY_RETRY_ATTEMPTS = toPositiveInt(process.env.PRISMA_QUERY_RETRY_ATTEMPTS, 2);
const PRISMA_QUERY_RETRY_DELAY_MS = toPositiveInt(process.env.PRISMA_QUERY_RETRY_DELAY_MS, 180);
const PRISMA_ENGINE_CONNECT_COOLDOWN_MS = toPositiveInt(process.env.PRISMA_ENGINE_CONNECT_COOLDOWN_MS, 500);
const PRISMA_MAX_CONCURRENT_QUERIES = Math.max(1, toPositiveInt(process.env.PRISMA_MAX_CONCURRENT_QUERIES, 12));

let lastEngineConnectAt = 0;
let engineConnectPromise: Promise<void> | null = null;
let activeQueryCount = 0;
const queryWaitQueue: Array<() => void> = [];

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
	return message.includes('connect ECONNREFUSED 127.0.0.1:')
		|| message.includes('other side closed')
		|| message.includes('socket hang up');
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextRetryDelayMs(attempt: number) {
	if (PRISMA_QUERY_RETRY_DELAY_MS <= 0) {
		return 0;
	}

	return PRISMA_QUERY_RETRY_DELAY_MS * attempt;
}

function releasePrismaQuerySlot() {
	activeQueryCount = Math.max(0, activeQueryCount - 1);
	const next = queryWaitQueue.shift();
	if (next) {
		next();
	}
}

async function acquirePrismaQuerySlot() {
	if (PRISMA_MAX_CONCURRENT_QUERIES <= 0) {
		return () => {};
	}

	if (activeQueryCount < PRISMA_MAX_CONCURRENT_QUERIES) {
		activeQueryCount += 1;
		return releasePrismaQuerySlot;
	}

	await new Promise<void>((resolve) => {
		queryWaitQueue.push(resolve);
	});

	activeQueryCount += 1;
	return releasePrismaQuerySlot;
}

async function ensurePrismaEngineConnected(client: any) {
	if (!client || typeof client.$connect !== 'function') {
		return;
	}

	const now = Date.now();
	if (engineConnectPromise) {
		await engineConnectPromise;
		return;
	}

	if (now - lastEngineConnectAt < PRISMA_ENGINE_CONNECT_COOLDOWN_MS) {
		return;
	}

	engineConnectPromise = (async () => {
		lastEngineConnectAt = Date.now();
		try {
			await client.$connect();
		} catch (error: any) {
			console.warn('[Prisma] Failed to ensure query engine connection:', error?.message || error);
		}
	})();

	try {
		await engineConnectPromise;
	} finally {
		engineConnectPromise = null;
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
		const release = await acquirePrismaQuerySlot();
		try {
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

					const retryDelayMs = nextRetryDelayMs(attempt);
					if (retryDelayMs > 0) {
						await sleep(retryDelayMs);
					}

					await ensurePrismaEngineConnected(client);
				}
			}
		} finally {
			release();
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
