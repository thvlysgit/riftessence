import { CreatePostSchema, validateRequest } from '../src/validation';

describe('CreatePostSchema', () => {
  test('treats empty optional fields from the create form as absent', () => {
    const result = validateRequest(CreatePostSchema, {
      userId: 'user-1',
      postingRiotAccountId: 'riot-1',
      region: 'EUW',
      role: 'TOP',
      secondRole: '',
      message: 'Looking for duo',
      languages: ['English'],
      vcPreference: 'SOMETIMES',
      duoType: 'BOTH',
      communityId: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.secondRole).toBeUndefined();
      expect(result.data.communityId).toBeUndefined();
    }
  });
});
