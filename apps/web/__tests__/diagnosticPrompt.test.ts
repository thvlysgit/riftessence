import { buildDiagnosticsPrompt } from '../utils/diagnosticPrompt';

describe('diagnostics prompt builder', () => {
  test('turns selected incident groups into a prompt-ready report', () => {
    const prompt = buildDiagnosticsPrompt({
      generatedAt: new Date('2026-09-05T10:00:00.000Z'),
      filters: { status: 'OPEN', user: 'thvlys', route: '/api/user' },
      runtime: {
        instanceKey: 'api-1',
        release: 'abc123',
        nodeVersion: 'v20.0.0',
        uptimeSeconds: 90,
        rssMb: 100,
        heapUsedMb: 30,
        heapTotalMb: 50,
      },
      incidents: [{
        id: 'incident-1',
        fingerprint: 'fingerprint-1',
        kind: 'UNHANDLED_REQUEST_ERROR',
        severity: 'ERROR',
        status: 'OPEN',
        message: 'Unsupported Media Type',
        stack: 'FastifyError: Unsupported Media Type',
        route: '/api/notifications/:id/read',
        method: 'PATCH',
        statusCode: 415,
        requestId: 'req-1',
        userId: 'user-1',
        instanceKey: 'api-1',
        release: 'abc123',
        metadata: { contentType: 'missing' },
        occurrences: 4,
        firstSeenAt: '2026-09-05T09:00:00.000Z',
        lastSeenAt: '2026-09-05T09:30:00.000Z',
      }],
    });

    expect(prompt).toContain('Selected groups: 1');
    expect(prompt).toContain('status=OPEN, user=thvlys, route contains /api/user');
    expect(prompt).toContain('## Incident group 1: UNHANDLED_REQUEST_ERROR');
    expect(prompt).toContain('- Occurrences: 4');
    expect(prompt).toContain('- Route: PATCH /api/notifications/:id/read');
    expect(prompt).toContain('FastifyError: Unsupported Media Type');
    expect(prompt).toContain('"contentType": "missing"');
  });
});
