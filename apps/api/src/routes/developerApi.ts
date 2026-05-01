import crypto from 'crypto';
import prisma from '../prisma';
import { getUserIdFromRequest, requireAdmin } from '../middleware/auth';
import { logAdminAction } from '../utils/auditLog';
import { formatDuoPost, formatLftPost, getAllowedRanks, parseBooleanQuery, parseQueryArray } from '../utils/developerFeed';

const MAX_FORM_TEXT = 2000;
const MAX_PUBLIC_LIMIT = 50;
const DEFAULT_PUBLIC_LIMIT = 20;
const limiterState = new Map<string, number[]>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value: unknown, maxLength: number = MAX_FORM_TEXT): string {
  return String(value || '').trim().slice(0, maxLength);
}

function getClientIp(request: any): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }

  return String(request.ip || request.socket?.remoteAddress || '0.0.0.0').trim();
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(`developer-api:${ip}`).digest('hex').slice(0, 24);
}

function hashApiKey(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function buildApiKey(): { plainKey: string; prefix: string; hash: string } {
  const prefix = crypto.randomBytes(4).toString('hex');
  const secret = crypto.randomBytes(24).toString('hex');
  const plainKey = `re_${prefix}_${secret}`;
  return { plainKey, prefix, hash: hashApiKey(plainKey) };
}

function parseApiKey(rawHeader: unknown): string | null {
  if (typeof rawHeader !== 'string') return null;
  const header = rawHeader.trim();
  if (!header) return null;

  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim() || null;
  }

  return header;
}

function buildRateKey(scope: string, keyPrefix: string, ipHash: string): string {
  return `${scope}:${keyPrefix}:${ipHash}`;
}

async function enforceBackpressure(apiKeyPrefix: string, ipHash: string): Promise<{ delayedMs: number } | null> {
  const windowMs = 1500;
  const maxRequests = 4;
  const maxDelayMs = 300;
  const attempts = 3;

  const keys = [
    buildRateKey('developer-api:combo', apiKeyPrefix, ipHash),
    buildRateKey('developer-api:key', apiKeyPrefix, 'global'),
    buildRateKey('developer-api:ip', 'global', ipHash),
  ];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const now = Date.now();
    let saturated = false;

    for (const key of keys) {
      const timestamps = (limiterState.get(key) || []).filter((ts) => now - ts < windowMs);
      limiterState.set(key, timestamps);
      if (timestamps.length >= maxRequests) {
        saturated = true;
      }
    }

    if (!saturated) {
      for (const key of keys) {
        const timestamps = limiterState.get(key) || [];
        timestamps.push(now);
        limiterState.set(key, timestamps.slice(-maxRequests));
      }

      return { delayedMs: 0 };
    }

    const delayMs = Math.min(maxDelayMs, 100 + (attempt * 75));
    await delay(delayMs);
  }

  return null;
}

function summarizeFormResponses(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

function summarizeApplication(application: any) {
  return {
    id: application.id,
    name: application.name,
    description: application.description,
    website: application.website,
    contactEmail: application.contactEmail,
    priorityAccess: application.priorityAccess,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    requestCount: application._count?.requests || 0,
    keyCount: application._count?.keys || 0,
    usageCount: application._count?.usage || 0,
  };
}

function summarizeRequest(request: any) {
  return {
    id: request.id,
    applicationId: request.applicationId,
    applicationName: request.application?.name || null,
    apiKeyId: request.apiKeyId,
    keyPrefix: request.apiKey?.keyPrefix || null,
    priorityAccess: request.priorityAccess,
    reviewedAt: request.reviewedAt,
    reviewedById: request.reviewedById,
    createdAt: request.createdAt,
    formResponses: summarizeFormResponses(request.formResponses),
  };
}

function summarizeKey(key: any) {
  return {
    id: key.id,
    applicationId: key.applicationId,
    applicationName: key.application?.name || null,
    label: key.label,
    keyPrefix: key.keyPrefix,
    isPriority: key.isPriority,
    isActive: key.isActive,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
    usageCount: key._count?.usage || 0,
  };
}

function summarizeUsage(usage: any) {
  return {
    id: usage.id,
    applicationId: usage.applicationId,
    applicationName: usage.application?.name || null,
    apiKeyId: usage.apiKeyId,
    keyPrefix: usage.apiKey?.keyPrefix || null,
    isPriority: Boolean(usage.apiKey?.isPriority),
    endpoint: usage.endpoint,
    method: usage.method,
    statusCode: usage.statusCode,
    latencyMs: usage.latencyMs,
    ipHash: usage.ipHash,
    createdAt: usage.createdAt,
  };
}

function parsePrismaError(error: any): { statusCode: number; message: string } | null {
  const code = String(error?.code || '');

  if (code === 'P2002') {
    return { statusCode: 409, message: 'A duplicate key conflict occurred. Please retry your request.' };
  }

  if (code === 'P2021' || code === 'P2022') {
    return { statusCode: 503, message: 'Developer API provisioning is temporarily unavailable. Please try again shortly.' };
  }

  if (code === 'P2003') {
    return { statusCode: 400, message: 'Invalid linked data while creating your API request.' };
  }

  return null;
}

async function resolveApiKey(request: any, reply: any) {
  const providedKey = parseApiKey(request.headers['x-api-key'] || request.headers['authorization']);
  if (!providedKey) {
    reply.code(401).send({ error: 'API key required' });
    return null;
  }

  const parts = providedKey.split('_');
  if (parts.length < 3 || parts[0] !== 're') {
    reply.code(401).send({ error: 'Invalid API key format' });
    return null;
  }

  const prefix = parts[1];
  const apiKey = await prisma.developerApiKey.findUnique({
    where: { keyPrefix: prefix },
    include: { application: true },
  });

  if (!apiKey || !apiKey.isActive || apiKey.revokedAt) {
    reply.code(401).send({ error: 'Invalid or revoked API key' });
    return null;
  }

  if (apiKey.keyHash !== hashApiKey(providedKey)) {
    reply.code(401).send({ error: 'Invalid API key' });
    return null;
  }

  return apiKey;
}

async function recordUsage(input: {
  apiKey: any;
  endpoint: string;
  method: string;
  statusCode: number;
  ipHash: string;
  latencyMs: number;
}) {
  await prisma.$transaction(async (tx: any) => {
    await tx.developerApiUsage.create({
      data: {
        applicationId: input.apiKey.applicationId,
        apiKeyId: input.apiKey.id,
        endpoint: input.endpoint,
        method: input.method,
        statusCode: input.statusCode,
        ipHash: input.ipHash,
        latencyMs: input.latencyMs,
      },
    });

    await tx.developerApiKey.update({
      where: { id: input.apiKey.id },
      data: { lastUsedAt: new Date() },
    });
  });
}

async function buildDuoWhere(query: any) {
  const andClauses: any[] = [];
  const regions = parseQueryArray(query.region);
  const languages = parseQueryArray(query.language);
  const allowedRanks = getAllowedRanks(query.minRank, query.maxRank, query.rank);
  const verifiedOnly = parseBooleanQuery(query.verifiedOnly);

  if (regions.length > 0) {
    andClauses.push({ region: { in: regions } });
  }

  if (languages.length > 0) {
    andClauses.push({ languages: { hasSome: languages } });
  }

  if (verifiedOnly) {
    andClauses.push({
      author: {
        verified: true,
        riotAccounts: { some: {} },
      },
    });
  }

  if (allowedRanks && allowedRanks.length > 0) {
    andClauses.push({
      author: {
        riotAccounts: {
          some: {
            isMain: true,
            rank: { in: allowedRanks as any },
          },
        },
      },
    });
  }

  return andClauses.length > 0 ? { AND: andClauses } : {};
}

async function buildLftWhere(query: any) {
  const andClauses: any[] = [];
  const regions = parseQueryArray(query.region);
  const languages = parseQueryArray(query.language);
  const allowedRanks = getAllowedRanks(query.minRank, query.maxRank, query.rank);
  const verifiedOnly = parseBooleanQuery(query.verifiedOnly);

  if (regions.length > 0) {
    andClauses.push({ region: { in: regions } });
  }

  if (languages.length > 0) {
    andClauses.push({
      author: {
        languages: { hasSome: languages },
      },
    });
  }

  if (verifiedOnly) {
    andClauses.push({
      author: {
        verified: true,
        riotAccounts: { some: {} },
      },
    });
  }

  if (allowedRanks && allowedRanks.length > 0) {
    andClauses.push({
      OR: [
        { type: 'PLAYER', rank: { in: allowedRanks as any } },
        { type: 'TEAM', averageRank: { in: allowedRanks as any } },
      ],
    });
  }

  return andClauses.length > 0 ? { AND: andClauses } : {};
}

export default async function developerApiRoutes(fastify: any) {
  fastify.post('/developer-api/requests', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const requester = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          riotAccounts: { select: { id: true } },
        },
      });

      if (!requester) {
        return reply.code(404).send({ error: 'User account not found' });
      }

      if (!requester.riotAccounts || requester.riotAccounts.length === 0) {
        return reply.code(400).send({ error: 'Link at least one Riot account before requesting a developer API key' });
      }

      const body = request.body || {};
      const formData = {
        name: normalizeText(body.name || body.appName, 120),
        description: normalizeText(body.description, 1000) || null,
        website: normalizeText(body.website, 300) || null,
        contactEmail: normalizeText(body.contactEmail, 200) || null,
        useCase: normalizeText(body.useCase, 1500),
        audience: normalizeText(body.audience, 1000) || null,
        notes: normalizeText(body.notes, 1000) || null,
      };

      if (!formData.name || formData.name.length < 3) {
        return reply.code(400).send({ error: 'Application name is required' });
      }

      if (!formData.useCase || formData.useCase.length < 20) {
        return reply.code(400).send({ error: 'Please describe your intended use case' });
      }

      const keyBundle = buildApiKey();
      const clientIpHash = hashIp(getClientIp(request));

      const result = await prisma.$transaction(async (tx: any) => {
        const application = await tx.developerApiApplication.create({
          data: {
            name: formData.name,
            description: formData.description,
            website: formData.website,
            contactEmail: formData.contactEmail,
            formResponses: {
              ...formData,
              requesterUserId: requester.id,
              requesterUsername: requester.username,
              requesterEmail: requester.email,
              submittedAt: new Date().toISOString(),
            },
          },
        });

        const key = await tx.developerApiKey.create({
          data: {
            applicationId: application.id,
            label: formData.name,
            keyPrefix: keyBundle.prefix,
            keyHash: keyBundle.hash,
            isPriority: false,
            isActive: true,
          },
        });

        const requestRecord = await tx.developerApiRequest.create({
          data: {
            applicationId: application.id,
            apiKeyId: key.id,
            formResponses: {
              ...formData,
              requesterUserId: requester.id,
              requesterUsername: requester.username,
              issuedKeyPrefix: keyBundle.prefix,
            },
            priorityAccess: false,
          },
        });

        return { application, key, requestRecord };
      });

      return reply.code(201).send({
        success: true,
        application: summarizeApplication({ ...result.application, _count: { requests: 1, keys: 1, usage: 0 } }),
        request: summarizeRequest({
          ...result.requestRecord,
          application: result.application,
          apiKey: result.key,
        }),
        apiKey: keyBundle.plainKey,
        issuedAt: new Date().toISOString(),
        priorityAccess: false,
        clientIpHash,
      });
    } catch (error: any) {
      fastify.log.error({
        msg: 'Failed to submit developer API request',
        errorCode: error?.code,
        error: error?.message || String(error),
      });

      const parsed = parsePrismaError(error);
      if (parsed) {
        return reply.code(parsed.statusCode).send({ error: parsed.message });
      }

      return reply.code(500).send({ error: 'Failed to submit developer API request. Please try again.' });
    }
  });

  fastify.get('/developer-api/duo/posts', async (request: any, reply: any) => {
    const startedAt = Date.now();
    const apiKey = await resolveApiKey(request, reply);
    if (!apiKey) return;

    const clientIpHash = hashIp(getClientIp(request));
    const permit = await enforceBackpressure(apiKey.keyPrefix, clientIpHash);
    if (!permit) {
      await recordUsage({
        apiKey,
        endpoint: '/api/developer-api/duo/posts',
        method: 'GET',
        statusCode: 429,
        ipHash: clientIpHash,
        latencyMs: Date.now() - startedAt,
      });
      return reply.code(429).send({ error: 'Public API temporarily overloaded. Please retry shortly.' });
    }

    try {
      const query = request.query || {};
      const limit = Math.min(MAX_PUBLIC_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_PUBLIC_LIMIT));
      const offset = Math.max(0, Number(query.offset) || 0);
      const where = await buildDuoWhere(query);

      const [total, posts] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
          include: {
            author: {
              include: {
                riotAccounts: true,
                discordAccount: true,
                ratingsReceived: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                isPartner: true,
                inviteLink: true,
              },
            },
          },
        }),
      ]);

      const payload = {
        posts: posts.map((post: any) => formatDuoPost(post, false)),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };

      await recordUsage({
        apiKey,
        endpoint: '/api/developer-api/duo/posts',
        method: 'GET',
        statusCode: 200,
        ipHash: clientIpHash,
        latencyMs: Date.now() - startedAt,
      });

      return reply.send(payload);
    } catch (error: any) {
      fastify.log.error(error);
      await recordUsage({
        apiKey,
        endpoint: '/api/developer-api/duo/posts',
        method: 'GET',
        statusCode: 500,
        ipHash: clientIpHash,
        latencyMs: Date.now() - startedAt,
      });
      return reply.code(500).send({ error: 'Failed to fetch public duo posts' });
    }
  });

  fastify.get('/developer-api/lft/posts', async (request: any, reply: any) => {
    const startedAt = Date.now();
    const apiKey = await resolveApiKey(request, reply);
    if (!apiKey) return;

    const clientIpHash = hashIp(getClientIp(request));
    const permit = await enforceBackpressure(apiKey.keyPrefix, clientIpHash);
    if (!permit) {
      await recordUsage({
        apiKey,
        endpoint: '/api/developer-api/lft/posts',
        method: 'GET',
        statusCode: 429,
        ipHash: clientIpHash,
        latencyMs: Date.now() - startedAt,
      });
      return reply.code(429).send({ error: 'Public API temporarily overloaded. Please retry shortly.' });
    }

    try {
      const query = request.query || {};
      const limit = Math.min(MAX_PUBLIC_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_PUBLIC_LIMIT));
      const offset = Math.max(0, Number(query.offset) || 0);
      const where = await buildLftWhere(query);

      const [total, posts] = await Promise.all([
        prisma.lftPost.count({ where }),
        prisma.lftPost.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                preferredRole: true,
                secondaryRole: true,
                activeUsernameDecoration: true,
                activeHoverEffect: true,
                activeNameplateFont: true,
                championPoolMode: true,
                championList: true,
                championTierlist: true,
                languages: true,
                verified: true,
                riotAccounts: {
                  select: { id: true },
                },
                discordAccount: {
                  select: { username: true },
                },
              },
            },
          },
        }),
      ]);

      const payload = {
        posts: posts.map((post: any) => formatLftPost(post, false)),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };

      await recordUsage({
        apiKey,
        endpoint: '/api/developer-api/lft/posts',
        method: 'GET',
        statusCode: 200,
        ipHash: clientIpHash,
        latencyMs: Date.now() - startedAt,
      });

      return reply.send(payload);
    } catch (error: any) {
      fastify.log.error(error);
      await recordUsage({
        apiKey,
        endpoint: '/api/developer-api/lft/posts',
        method: 'GET',
        statusCode: 500,
        ipHash: clientIpHash,
        latencyMs: Date.now() - startedAt,
      });
      return reply.code(500).send({ error: 'Failed to fetch public LFT posts' });
    }
  });

  fastify.get('/admin/developer-api/dashboard', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const isAdmin = await requireAdmin(request, reply, prisma);
      if (!isAdmin) return;

      const [applications, requests, keys, usage] = await Promise.all([
        prisma.developerApiApplication.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            _count: {
              select: {
                requests: true,
                keys: true,
                usage: true,
              },
            },
          },
        }),
        prisma.developerApiRequest.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            application: { select: { id: true, name: true } },
            apiKey: { select: { id: true, keyPrefix: true, isPriority: true } },
          },
        }),
        prisma.developerApiKey.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            application: { select: { id: true, name: true } },
            _count: {
              select: {
                usage: true,
              },
            },
          },
        }),
        prisma.developerApiUsage.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            application: { select: { id: true, name: true } },
            apiKey: { select: { id: true, keyPrefix: true, isPriority: true } },
          },
        }),
      ]);

      return reply.send({
        applications: applications.map(summarizeApplication),
        requests: requests.map(summarizeRequest),
        keys: keys.map(summarizeKey),
        usage: usage.map(summarizeUsage),
        summary: {
          applications: applications.length,
          requests: requests.length,
          keys: keys.length,
          usage: usage.length,
          priorityKeys: keys.filter((key: any) => key.isPriority).length,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to load developer API dashboard' });
    }
  });

  fastify.patch('/admin/developer-api/requests/:id/priority', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const isAdmin = await requireAdmin(request, reply, prisma);
      if (!isAdmin) return;

      const { id } = request.params as { id: string };
      const requestRecord = await prisma.developerApiRequest.findUnique({
        where: { id },
        include: {
          application: true,
          apiKey: true,
        },
      });

      if (!requestRecord) {
        return reply.code(404).send({ error: 'Developer API request not found' });
      }

      if (!requestRecord.apiKeyId) {
        return reply.code(400).send({ error: 'No API key is attached to this request' });
      }

      await prisma.$transaction(async (tx: any) => {
        await tx.developerApiRequest.update({
          where: { id },
          data: {
            priorityAccess: true,
            reviewedAt: new Date(),
            reviewedById: userId,
          },
        });

        await tx.developerApiApplication.update({
          where: { id: requestRecord.applicationId },
          data: { priorityAccess: true },
        });

        await tx.developerApiKey.update({
          where: { id: requestRecord.apiKeyId },
          data: { isPriority: true },
        });
      });

      await logAdminAction({
        adminId: userId,
        action: 'DEVELOPER_API_PRIORITY_GRANTED',
        targetId: id,
        details: {
          applicationId: requestRecord.applicationId,
          applicationName: requestRecord.application.name,
          apiKeyId: requestRecord.apiKeyId,
        },
      });

      return reply.send({ success: true, message: 'Priority access granted' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to grant priority access' });
    }
  });
}