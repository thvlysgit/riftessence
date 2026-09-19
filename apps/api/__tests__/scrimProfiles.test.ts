import { createScrimProfileIdentity } from '../src/services/scrimProfiles';

describe('createScrimProfileIdentity', () => {
  test('creates a lightweight backing team without requiring an existing team', async () => {
    const tx = {
      team: {
        create: jest.fn().mockResolvedValue({ id: 'new-team' }),
      },
      teamMember: {
        create: jest.fn().mockResolvedValue({ id: 'new-member' }),
      },
      scrimProfile: {
        create: jest.fn().mockResolvedValue({
          id: 'profile-1',
          teamId: 'new-team',
        }),
      },
    };
    const db = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    const profile = await createScrimProfileIdentity(db, {
      userId: 'user-1',
      name: 'Solo Manager',
      tag: 'SM',
      region: 'EUW',
      defaultAverageRank: 'MASTER',
      defaultDivision: null,
      defaultAverageLp: 120,
      opggMultisearchUrl: null,
      contactPreference: 'EITHER',
    });

    expect(tx.team.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'user-1',
          isScrimProfile: true,
        }),
      }),
    );
    expect(tx.teamMember.create).toHaveBeenCalledWith({
      data: {
        teamId: 'new-team',
        userId: 'user-1',
        role: 'MANAGER',
      },
    });
    expect(profile).toEqual({ id: 'profile-1', teamId: 'new-team' });
  });
});
