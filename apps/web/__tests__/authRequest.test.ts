import { emptyJsonPostInit } from '../utils/auth';

describe('empty JSON POST requests', () => {
  test('send a parseable JSON body with authentication headers', () => {
    expect(emptyJsonPostInit({ Authorization: 'Bearer test-token' })).toEqual({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      credentials: 'include',
      body: '{}',
    });
  });
});
