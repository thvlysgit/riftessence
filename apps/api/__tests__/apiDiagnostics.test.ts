jest.mock('../src/prisma', () => ({
  __esModule: true,
  default: {
    systemIncident: {
      upsert: jest.fn(),
    },
  },
}));

import prisma from '../src/prisma';
import { incidentFingerprint, recordIncident, sanitizeDiagnosticText } from '../src/services/apiDiagnostics';

const upsert = prisma.systemIncident.upsert as jest.Mock;

describe('API diagnostics', () => {
  beforeEach(() => {
    upsert.mockReset();
    upsert.mockResolvedValue({ id: 'incident-1' });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('redacts credentials, JWTs, and URL query strings', () => {
    const text = sanitizeDiagnosticText(
      'authorization=secret Bearer abc.def.ghi https://example.test/path?token=visible password=hunter2',
    );
    expect(text).not.toContain('secret');
    expect(text).not.toContain('abc.def.ghi');
    expect(text).not.toContain('token=visible');
    expect(text).not.toContain('hunter2');
    expect(text).toContain('[REDACTED');
  });

  test('groups repeated failures while keeping different users separate', () => {
    const base = {
      kind: 'HTTP_SERVER_ERROR',
      message: 'API request completed with HTTP 500.',
      route: '/api/user/profile',
      method: 'GET',
      statusCode: 500,
    };
    expect(incidentFingerprint({ ...base, userId: 'user-a' }))
      .toBe(incidentFingerprint({ ...base, userId: 'user-a' }));
    expect(incidentFingerprint({ ...base, userId: 'user-a' }))
      .not.toBe(incidentFingerprint({ ...base, userId: 'user-b' }));
  });

  test('persists only sanitized diagnostics and increments repeat occurrences', async () => {
    const id = await recordIncident({
      kind: 'UNHANDLED_REQUEST_ERROR',
      message: 'token=super-secret failed',
      stack: 'Bearer abc.def.ghi\n at handler',
      route: '/api/user/profile',
      method: 'GET',
      statusCode: 500,
      requestId: 'req-1',
      userId: 'user-1',
    });

    expect(id).toBe('incident-1');
    expect(upsert).toHaveBeenCalledTimes(1);
    const call = upsert.mock.calls[0][0];
    expect(call.create.message).not.toContain('super-secret');
    expect(call.create.stack).not.toContain('abc.def.ghi');
    expect(call.update.occurrences).toEqual({ increment: 1 });
    expect(call.create).toMatchObject({
      kind: 'UNHANDLED_REQUEST_ERROR',
      route: '/api/user/profile',
      userId: 'user-1',
    });
  });
});
