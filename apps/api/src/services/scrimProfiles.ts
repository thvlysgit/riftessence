type CreateScrimProfileIdentityInput = {
  userId: string;
  name: string;
  tag: string | null;
  region: string;
  defaultAverageRank: string | null;
  defaultDivision: string | null;
  defaultAverageLp: number | null;
  opggMultisearchUrl: string | null;
  contactPreference: string;
};

export async function createScrimProfileIdentity(
  db: any,
  input: CreateScrimProfileIdentityInput,
) {
  return db.$transaction(async (tx: any) => {
    const team = await tx.team.create({
      data: {
        name: input.name,
        tag: input.tag,
        region: input.region,
        ownerId: input.userId,
        isScrimProfile: true,
      },
      select: { id: true },
    });

    await tx.teamMember.create({
      data: {
        teamId: team.id,
        userId: input.userId,
        role: 'MANAGER',
      },
    });

    return tx.scrimProfile.create({
      data: {
        ownerId: input.userId,
        teamId: team.id,
        defaultAverageRank: input.defaultAverageRank,
        defaultDivision: input.defaultDivision,
        defaultAverageLp: input.defaultAverageLp,
        opggMultisearchUrl: input.opggMultisearchUrl,
        contactPreference: input.contactPreference,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            region: true,
          },
        },
      },
    });
  });
}
