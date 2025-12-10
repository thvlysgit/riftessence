// Use require() to avoid TypeScript import-time errors if the generated Prisma client
// is not yet available. We export a single default `prisma` object.
const globalAny: any = global;

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

let prisma: any;
if (globalAny.__PRISMA_MOCK) {
	prisma = globalAny.__PRISMA_MOCK;
} else if (process.env.USE_FAKE_DB === '1') {
	prisma = createFakePrisma();
} else {
	// Lazy require so runtime doesn't fail at compile if client not yet generated
	const pkg = require('@prisma/client');
	const PrismaClient = pkg.PrismaClient || pkg.default || pkg;
	prisma = new PrismaClient();
}

export default prisma;
