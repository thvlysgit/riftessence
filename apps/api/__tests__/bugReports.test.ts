jest.mock('../src/middleware/auth', () => ({
  getUserIdFromRequest: jest.fn(),
}));
jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    bugReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    bugReportSettings: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));

import Fastify from 'fastify';
import prisma from '../src/prisma';
import { getUserIdFromRequest } from '../src/middleware/auth';
import bugReportRoutes from '../src/routes/bugReports';

const db = prisma as any;
const auth = getUserIdFromRequest as jest.Mock;

describe('bug report queue', () => {
  const app = Fastify();
  const oldKey = process.env.DISCORD_BOT_API_KEY;

  beforeAll(async () => app.register(bugReportRoutes, { prefix: '/api' }));
  afterAll(async () => {
    await app.close();
    if (oldKey === undefined) delete process.env.DISCORD_BOT_API_KEY;
    else process.env.DISCORD_BOT_API_KEY = oldKey;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue(null);
    process.env.DISCORD_BOT_API_KEY = 'test-bot-key';
  });

  test('queues a guest report with evidence for bot delivery', async () => {
    db.bugReport.create.mockImplementation(async ({ data }: any) => ({
      id: 'report-1',
      ...data,
      reporter: null,
      createdAt: new Date(),
      discordMessageId: null,
    }));
    const response = await app.inject({
      method: 'POST',
      url: '/api/bug-report',
      payload: {
        description: 'The library button does nothing.',
        evidenceUrls: ['https://example.com/video.mp4'],
        contactDiscord: 'player_name',
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      success: true,
      queued: true,
      id: 'report-1',
    });
    expect(db.bugReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidenceUrls: ['https://example.com/video.mp4'],
          contactDiscord: 'player_name',
        }),
      }),
    );
  });

  test('rejects unsafe or excessive evidence links before creating a report', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/bug-report',
      payload: {
        description: 'The library button does nothing.',
        evidenceUrls: ['http://localhost/private'],
      },
    });
    expect(response.statusCode).toBe(400);
    expect(db.bugReport.create).not.toHaveBeenCalled();
  });

  test('only the bot can read pending reports and the configured channel', async () => {
    db.bugReport.findMany.mockResolvedValue([{ id: 'report-1' }]);
    db.bugReportSettings.findUnique.mockResolvedValue({
      discordChannelId: '1374090454194323526',
    });
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/discord/bug-reports/outgoing',
        })
      ).statusCode,
    ).toBe(403);
    const response = await app.inject({
      method: 'GET',
      url: '/api/discord/bug-reports/outgoing',
      headers: { authorization: 'Bearer test-bot-key' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      channelId: '1374090454194323526',
      reports: [{ id: 'report-1' }],
    });
    expect(db.bugReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { discordMessageId: null } }),
    );
  });

  test('the bot can acknowledge delivery', async () => {
    db.bugReport.updateMany.mockResolvedValue({ count: 1 });
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/discord/bug-reports/report-1/forwarded',
      headers: { authorization: 'Bearer test-bot-key' },
      payload: { messageId: '1374090454194323527' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
    expect(db.bugReport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'report-1', discordMessageId: null },
        data: expect.objectContaining({ discordMessageId: '1374090454194323527' }),
      }),
    );
  });

  test('a non-admin cannot change the forwarding channel', async () => {
    auth.mockResolvedValue('member');
    db.user.findUnique.mockResolvedValue({ badges: [] });
    const response = await app.inject({
      method: 'PUT',
      url: '/api/admin/bug-report-settings',
      payload: { channelId: '1374090454194323526' },
    });
    expect(response.statusCode).toBe(403);
    expect(db.bugReportSettings.upsert).not.toHaveBeenCalled();
  });

  test('an admin can change the forwarding channel', async () => {
    auth.mockResolvedValue('admin');
    db.user.findUnique.mockResolvedValue({ badges: [{ key: 'admin' }] });
    db.bugReportSettings.upsert.mockResolvedValue({
      discordChannelId: '1374090454194323527',
    });
    const response = await app.inject({
      method: 'PUT',
      url: '/api/admin/bug-report-settings',
      payload: { channelId: '1374090454194323527' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ channelId: '1374090454194323527' });
  });
});
