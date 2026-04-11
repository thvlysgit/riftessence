import React, { useEffect, useMemo, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
const RANKS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER', 'UNRANKED'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];
const EXPERIENCES = [
  { value: 'FIRST_TEAM', label: 'First Team' },
  { value: 'SOME_EXPERIENCE', label: 'Some Experience' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'EXPERIENCED', label: 'Experienced' },
  { value: 'VERY_EXPERIENCED', label: 'Very Experienced' },
];
const AVAILABILITIES = [
  { value: 'ONCE_A_WEEK', label: 'Once a Week' },
  { value: 'TWICE_A_WEEK', label: 'Twice a Week' },
  { value: 'THRICE_A_WEEK', label: 'Thrice a Week' },
  { value: 'FOUR_TIMES_A_WEEK', label: 'Four times a Week' },
  { value: 'FIVE_TIMES_A_WEEK', label: 'Five times a Week' },
  { value: 'SIX_TIMES_A_WEEK', label: 'Six times a Week' },
  { value: 'EVERYDAY', label: 'Everyday' },
];
const COMMON_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Korean', 'Japanese', 'Chinese'];
const SKILL_OPTIONS = ['Shotcaller', 'Weakside', 'Ocean Champion Pool', 'Vision', 'Duels', 'Consistency'];

type CandidateType = 'PLAYER' | 'MANAGER' | 'COACH' | 'OTHER';

const CANDIDATE_OPTIONS: Array<{ value: CandidateType; icon: string; label: string; subtitle: string }> = [
  { value: 'PLAYER', icon: '🧑', label: 'Player', subtitle: 'Looking for a roster as a player' },
  { value: 'MANAGER', icon: '📋', label: 'Manager', subtitle: 'Operations, scheduling, and team coordination' },
  { value: 'COACH', icon: '🎓', label: 'Coach', subtitle: 'Review, drafting, structure, and progression' },
  { value: 'OTHER', icon: '🧩', label: 'Other', subtitle: 'Analyst, content, strategic or support role' },
];

const ROLE_OPTION_LABELS: Record<string, string> = {
  TOP: '🛡️ TOP',
  JUNGLE: '🌿 JUNGLE',
  MID: '⚔️ MID',
  ADC: '🏹 ADC',
  SUPPORT: '❤️ SUPPORT',
};

export interface CreatePlayerLftModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const CreatePlayerLftModal: React.FC<CreatePlayerLftModalProps> = ({ open, onClose, onSubmit }) => {
  const [region, setRegion] = useState('EUW');
  const [mainRole, setMainRole] = useState('TOP');
  const [rank, setRank] = useState('UNRANKED');
  const [division, setDivision] = useState('');

  const [candidateType, setCandidateType] = useState<CandidateType>('PLAYER');
  const [advertiseForOther, setAdvertiseForOther] = useState(false);
  const [representedName, setRepresentedName] = useState('');

  const [experience, setExperience] = useState('FIRST_TEAM');
  const [languages, setLanguages] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [age, setAge] = useState('');
  const [availability, setAvailability] = useState('ONCE_A_WEEK');
  const [details, setDetails] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const isPlayerListing = candidateType === 'PLAYER';
  const showDivision = rank && !['MASTER', 'GRANDMASTER', 'CHALLENGER', 'UNRANKED'].includes(rank);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('riftessence_lft_player_draft');
      if (!saved) return;
      const draft = JSON.parse(saved);
      if (draft.candidateType) setCandidateType(draft.candidateType);
      if (typeof draft.advertiseForOther === 'boolean') setAdvertiseForOther(draft.advertiseForOther);
      if (draft.representedName) setRepresentedName(draft.representedName);
      if (draft.experience) setExperience(draft.experience);
      if (Array.isArray(draft.languages)) setLanguages(draft.languages);
      if (Array.isArray(draft.skills)) setSkills(draft.skills);
      if (draft.age !== undefined) setAge(String(draft.age));
      if (draft.availability) setAvailability(draft.availability);
      if (draft.details) setDetails(draft.details);
    } catch {
      // Ignore invalid local draft payloads.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'riftessence_lft_player_draft',
      JSON.stringify({
        candidateType,
        advertiseForOther,
        representedName,
        experience,
        languages,
        skills,
        age,
        availability,
        details,
      })
    );
  }, [candidateType, advertiseForOther, representedName, experience, languages, skills, age, availability, details]);

  useEffect(() => {
    if (!open) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('lfd_token');
        if (!token) return;

        let userId: string | null = null;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId;
        } catch {
          return;
        }
        if (!userId) return;

        const res = await fetch(`${API_URL}/api/user/profile?userId=${userId}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.region) {
          setRegion(data.region);
        } else if (data.riotAccounts?.length > 0) {
          const mainAcc = data.riotAccounts.find((acc: any) => acc.isMain) || data.riotAccounts[0];
          setRegion(mainAcc.region || 'EUW');
        }

        if (data.preferredRole) {
          setMainRole(data.preferredRole);
        }

        if (data.riotAccounts?.length > 0) {
          const mainAcc = data.riotAccounts.find((acc: any) => acc.isMain) || data.riotAccounts[0];
          if (mainAcc.rank) {
            setRank(mainAcc.rank);
            setDivision(mainAcc.division || '');
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [open]);

  const selectedCandidateLabel = useMemo(() => {
    return CANDIDATE_OPTIONS.find((option) => option.value === candidateType)?.label || 'Listing';
  }, [candidateType]);

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((entry) => entry !== lang) : [...prev, lang]));
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((entry) => entry !== skill) : [...prev, skill]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!region || !REGIONS.includes(region)) {
      setError('A valid region is required.');
      return;
    }

    if (!availability) {
      setError('Availability is required.');
      return;
    }

    if (languages.length === 0) {
      setError('Select at least one language.');
      return;
    }

    if (advertiseForOther && !representedName.trim()) {
      setError('Enter who this listing is for.');
      return;
    }

    if (isPlayerListing) {
      if (!mainRole) {
        setError('Main role is required for player listings.');
        return;
      }
      if (!age) {
        setError('Age is required for player listings.');
        return;
      }
      if (skills.length === 0) {
        setError('Select at least one skill for player listings.');
        return;
      }
    } else if (details.trim().length < 20) {
      setError('Coach/manager/other listings need at least 20 characters of details.');
      return;
    }

    setError('');

    onSubmit({
      region,
      candidateType,
      representedName: advertiseForOther ? representedName.trim() : null,
      mainRole: isPlayerListing ? mainRole : null,
      rank: rank || null,
      division: showDivision ? (division || null) : null,
      experience: experience || null,
      languages,
      skills,
      age: age ? parseInt(age, 10) : null,
      availability,
      details: details.trim() || null,
    });
  };

  if (!open) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="rounded-xl p-6" style={{ background: 'var(--color-bg-secondary)' }}>
          <p style={{ color: 'var(--color-text-primary)' }}>Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
      <form
        className="rounded-2xl p-6 w-full max-w-3xl shadow-lg border my-4 sm:my-8"
        style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        onSubmit={handleSubmit}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-2xl font-bold" style={{ color: 'var(--color-accent-1)' }}>
              Create LFT Listing
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Publish a {selectedCandidateLabel.toLowerCase()} profile and get discovered faster.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border text-sm"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
              background: 'var(--color-bg-tertiary)',
            }}
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded" style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}>
            {error}
          </div>
        )}

        <div className="mb-5">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Listing Type
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {CANDIDATE_OPTIONS.map((option) => {
              const selected = option.value === candidateType;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCandidateType(option.value)}
                  className="text-left rounded-lg border px-3 py-3 transition-all"
                  style={{
                    borderColor: selected ? 'var(--color-accent-1)' : 'var(--color-border)',
                    background: selected ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-bg-tertiary)',
                  }}
                >
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{option.icon} {option.label}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{option.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border p-3 mb-5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
          <label className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            <input
              type="checkbox"
              checked={advertiseForOther}
              onChange={(e) => setAdvertiseForOther(e.target.checked)}
            />
            👤 This listing is for someone else
          </label>
          {advertiseForOther && (
            <input
              type="text"
              value={representedName}
              onChange={(e) => setRepresentedName(e.target.value)}
              className="mt-3 w-full px-3 py-2 rounded border"
              style={{
                background: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="Name to display on the listing (coach, manager, analyst, etc.)"
              maxLength={80}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              🌍 Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 rounded border"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {REGIONS.map((entry) => (
                <option key={entry} value={entry}>🌍 {entry}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              📅 Availability
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full px-3 py-2 rounded border"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {AVAILABILITIES.map((entry) => (
                <option key={entry.value} value={entry.value}>📅 {entry.label}</option>
              ))}
            </select>
          </div>

          {isPlayerListing && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  🎯 Main Role
                </label>
                <select
                  value={mainRole}
                  onChange={(e) => setMainRole(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {ROLES.map((entry) => (
                    <option key={entry} value={entry}>{ROLE_OPTION_LABELS[entry] || entry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  🧩 Team Experience
                </label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {EXPERIENCES.map((entry) => (
                    <option key={entry.value} value={entry.value}>{entry.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  🏅 Rank
                </label>
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {RANKS.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  🎂 Age
                </label>
                <input
                  type="number"
                  min={13}
                  max={99}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                  placeholder="Required for player listings"
                />
              </div>
            </>
          )}

          {!isPlayerListing && (
            <div className="md:col-span-2 rounded-lg border p-3" style={{ borderColor: 'var(--color-border)', background: 'rgba(59, 130, 246, 0.08)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Staff listings can include profile rank/role context, but the details section below should explain coaching style, management approach, or specialist focus.
              </p>
            </div>
          )}

          {showDivision && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                🪜 Division
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-3 py-2 rounded border"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="">Select division</option>
                {DIVISIONS.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              🗣️ Languages
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_LANGUAGES.map((lang) => {
                const selected = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className="px-3 py-1 rounded text-sm font-medium transition-all"
                    style={{
                      background: selected ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                      color: selected ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                      border: `1px solid ${selected ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                    }}
                  >
                    🗣️ {lang}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              ⭐ Skills {isPlayerListing ? '(required)' : '(optional)'}
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => {
                const selected = skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className="px-3 py-1 rounded text-sm font-medium transition-all"
                    style={{
                      background: selected ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                      color: selected ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                      border: `1px solid ${selected ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                    }}
                  >
                    ⭐ {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              📝 Details {isPlayerListing ? '(optional)' : '(required, min 20 chars)'}
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3 py-2 rounded border min-h-[110px]"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              maxLength={500}
              placeholder={
                isPlayerListing
                  ? 'Add context about your goals, style, and what kind of roster you want.'
                  : 'Describe your coaching/management profile, achievements, communication style, and what teams can expect.'
              }
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded font-semibold"
            style={{
              background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
              color: 'var(--color-bg-primary)',
            }}
          >
            🚀 Publish Listing
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded font-medium border"
            style={{
              background: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            ✖ Cancel
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};
