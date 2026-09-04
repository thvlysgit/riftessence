import { getApiRateLimitClass } from '../src/utils/rateLimitPolicy';

describe('API rate-limit policy', () => {
  test('keeps authenticated polling reads separate from writes', () => {
    expect(getApiRateLimitClass('GET', true)).toEqual({ bucket: 'read', max: 3000 });
    expect(getApiRateLimitClass('POST', true)).toEqual({ bucket: 'write', max: 1000 });
  });

  test('retains stricter anonymous limits', () => {
    expect(getApiRateLimitClass('GET', false)).toEqual({ bucket: 'read', max: 1000 });
    expect(getApiRateLimitClass('PATCH', false)).toEqual({ bucket: 'write', max: 300 });
  });
});
