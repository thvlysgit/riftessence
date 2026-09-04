import Fastify from 'fastify';

jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    user: { findFirst: jest.fn() },
    systemIncident: { findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    apiProcessRun: { findMany: jest.fn() },
  },
}));
jest.mock('../src/middleware/auth', () => ({
  getUserIdFromRequest: jest.fn(),
  requireAdmin: jest.fn(),
}));
jest.mock('../src/services/apiDiagnostics', () => ({
  apiRuntimeSnapshot: jest.fn(() => ({
    status: 'online',
    instanceKey: 'test-instance',
    release: 'test-release',
    processRunId: 'run-1',
    startedAt: '2026-09-04T20:00:00.000Z',
    uptimeSeconds: 60,
    nodeVersion: process.version,
    memory: { rssMb: 100, heapUsedMb: 20, heapTotalMb: 40, externalMb: 2 },
    persistenceAvailable: true,
    workers: [],
  })),
}));
jest.mock('../src/utils/auditLog', () => ({ logAdminAction: jest.fn() }));

import prisma from '../src/prisma';
import { getUserIdFromRequest, requireAdmin } from '../src/middleware/auth';
import diagnosticsRoutes from '../src/routes/diagnostics';

const authUser = getUserIdFromRequest as jest.Mock;
const adminCheck = requireAdmin as jest.Mock;

describe('admin diagnostics routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = Fastify({ logger: false });
    await app.register(diagnosticsRoutes, { prefix: '/api' });
  });

  afterEach(async () => {
    await app.close();
  });

  test('rejects non-admin users', async () => {
    authUser.mockResolvedValue('user-1');
    adminCheck.mockImplementation(async (_request: any, reply: any) => {
      reply.code(403).send({ error: 'Insufficient permissions' });
      return false;
    });

    const response = await app.inject({ method: 'GET', url: '/api/admin/diagnostics' });
    expect(response.statusCode).toBe(403);
    expect(prisma.systemIncident.findMany).not.toHaveBeenCalled();
  });

  test('returns retained incidents, process runs, and a username match to admins', async () => {
    authUser.mockResolvedValue('admin-1');
    adminCheck.mockResolvedValue(true);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-thvlys', username: 'thvlys' });
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    (prisma.systemIncident.findMany as jest.Mock).mockResolvedValue([{ id: 'incident-1', kind: 'RATE_LIMITED_REQUEST' }]);
    (prisma.systemIncident.count as jest.Mock).mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    (prisma.apiProcessRun.findMany as jest.Mock).mockResolvedValue([{ id: 'run-1', status: 'ACTIVE' }]);

    const response = await app.inject({ method: 'GET', url: '/api/admin/diagnostics?user=thvlys&status=OPEN' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      matchedUser: { id: 'user-thvlys', username: 'thvlys' },
      summary: { openCount: 2, fatalCount: 1 },
      incidents: [{ id: 'incident-1' }],
      processRuns: [{ id: 'run-1' }],
    });
    expect(prisma.systemIncident.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-thvlys', status: 'OPEN' }),
    }));
  });
});
