import { buildScrimRequestInit } from '../utils/scrimApi';

describe('Scrim API request headers', () => {
  test.each([
    ['POST', undefined],
    ['DELETE', undefined],
  ])('%s without a body does not declare JSON', (method, body) => {
    const init = buildScrimRequestInit('test-token', { method, body });
    const headers = new Headers(init.headers);

    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.has('Content-Type')).toBe(false);
  });

  test('a request with a body declares JSON', () => {
    const init = buildScrimRequestInit('test-token', {
      method: 'POST',
      body: JSON.stringify({ teamId: 'team-1' }),
    });

    expect(new Headers(init.headers).get('Content-Type')).toBe(
      'application/json',
    );
  });
});
