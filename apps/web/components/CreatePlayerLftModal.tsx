import React, { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

// Helper to get custom arrow with theme color
const getCustomArrow = () => {
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-1').trim();
  const colorHex = accentColor.startsWith('#') ? accentColor.slice(1) : 'C8AA6E';
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23${colorHex}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`;
};

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
const RANKS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];
const EXPERIENCES = [
  { value: 'FIRST_TEAM', label: 'First Team' },
  { value: 'A_LITTLE_EXPERIENCE', label: 'A Little Experience' },
  { value: 'EXPERIMENTED', label: 'Experimented' },
];
const AVAILABILITIES = [
  { value: 'ONCE_A_WEEK', label: 'Once a Week' },
  { value: 'TWICE_A_WEEK', label: 'Twice a Week' },
  { value: 'THRICE_A_WEEK', label: 'Thrice a Week' },
  { value: 'FOUR_TIMES_A_WEEK', label: 'Four times a Week' },
  { value: 'EVERYDAY', label: 'Everyday' },
];
const COMMON_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Korean', 'Japanese', 'Chinese'];
const SKILL_OPTIONS = ['Shotcaller', 'Weakside', 'Ocean Champion Pool', 'Vision', 'Duels', 'Consistency'];

export interface CreatePlayerLftModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const CreatePlayerLftModal: React.FC<CreatePlayerLftModalProps> = ({ open, onClose, onSubmit }) => {
  const [region, setRegion] = useState('');
  const [mainRole, setMainRole] = useState('');
  const [rank, setRank] = useState('');
  const [division, setDivision] = useState('');
  const [experience, setExperience] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [age, setAge] = useState('');
  const [availability, setAvailability] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      const fetchUserData = async () => {
        try {
          setLoading(true);
          let userId: string | null = null;
          try { userId = localStorage.getItem('lfd_userId'); } catch {}
          if (!userId) return;

          const res = await fetch(`${API_URL}/api/user/profile?userId=${userId}`);
          if (res.ok) {
            const data = await res.json();
            
            // Set region from user or main account
            if (data.region) {
              setRegion(data.region);
            } else if (data.riotAccounts && data.riotAccounts.length > 0) {
              const mainAcc = data.riotAccounts.find((acc: any) => acc.isMain) || data.riotAccounts[0];
              setRegion(mainAcc.region || 'EUW');
            } else {
              setRegion('EUW');
            }

            // Set role from preferred or primary role
            if (data.preferredRole) {
              setMainRole(data.preferredRole);
            } else if (data.primaryRole) {
              setMainRole(data.primaryRole);
            } else {
              // Default to TOP if no role found
              setMainRole('TOP');
            }

            // Set rank from main account
            if (data.riotAccounts && data.riotAccounts.length > 0) {
              const mainAcc = data.riotAccounts.find((acc: any) => acc.isMain) || data.riotAccounts[0];
              if (mainAcc.rank) {
                setRank(mainAcc.rank);
                if (mainAcc.division) {
                  setDivision(mainAcc.division);
                }
              } else {
                setRank('UNRANKED');
              }
            } else {
              setRank('UNRANKED');
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }
  }, [open]);

  const toggleLanguage = (lang: string) => {
    setLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleSkill = (skill: string) => {
    setSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate user-editable fields only
    if (!experience) {
      setError('Team experience is required');
      return;
    }
    if (languages.length === 0) {
      setError('Please select at least one language');
      return;
    }
    if (skills.length === 0) {
      setError('Please select at least one skill');
      return;
    }
    if (!age) {
      setError('Age is required');
      return;
    }
    if (!availability) {
      setError('Availability is required');
      return;
    }
    
    setError('');
    onSubmit({
      region,
      mainRole,
      rank: rank || null,
      division: (rank && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank)) ? division : null,
      experience,
      languages,
      skills,
      age: parseInt(age),
      availability,
    });
  };

  if (!open) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="rounded-xl p-6" style={{ background: 'var(--color-bg-secondary)' }}>
          <p style={{ color: 'var(--color-text-primary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const showDivision = rank && !['MASTER', 'GRANDMASTER', 'CHALLENGER', 'UNRANKED'].includes(rank);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 overflow-y-auto">
      <form 
        className="rounded-xl p-6 w-full max-w-2xl shadow-lg border-2 my-8" 
        style={{ 
          background: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)' 
        }}
        onSubmit={handleSubmit}
      >
        <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
          Looking for a Team
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded" style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Region */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled
              className="w-full px-3 py-2 rounded border appearance-none cursor-not-allowed"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                opacity: 0.7,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='gray' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem'
              }}
            >
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Main Role */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Main Role
            </label>
            <select
              value={mainRole}
              onChange={(e) => setMainRole(e.target.value)}
              disabled
              className="w-full px-3 py-2 rounded border appearance-none cursor-not-allowed"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                opacity: 0.7,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='gray' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem'
              }}
              required
            >
              <option value="">Select role...</option>
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Rank */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Rank
            </label>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled
              className="w-full px-3 py-2 rounded border appearance-none cursor-not-allowed"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                opacity: 0.7,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='gray' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem'
              }}
            >
              <option value="">Select rank...</option>
              {RANKS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Division (conditional) */}
          {showDivision && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Division
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                disabled
                className="w-full px-3 py-2 rounded border appearance-none cursor-not-allowed"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  opacity: 0.7,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='gray' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="">Select division...</option>
                {DIVISIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Team Experience *
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full px-3 py-2 rounded border appearance-none cursor-pointer"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                backgroundImage: getCustomArrow(),
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem'
              }}
              required
            >
              <option value="">Select experience...</option>
              {EXPERIENCES.map(exp => (
                <option key={exp.value} value={exp.value}>{exp.label}</option>
              ))}
            </select>
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Age *
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min="13"
              max="99"
              className="w-full px-3 py-2 rounded border"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="Your age"
              required
            />
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Availability *
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full px-3 py-2 rounded border appearance-none cursor-pointer"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
                backgroundImage: getCustomArrow(),
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem'
              }}
              required
            >
              <option value="">Select availability...</option>
              {AVAILABILITIES.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Languages */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Languages Spoken *
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_LANGUAGES.map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className="px-3 py-1 rounded text-sm font-medium transition-all"
                  style={{
                    background: languages.includes(lang) ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: languages.includes(lang) ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                    border: `1px solid ${languages.includes(lang) ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="px-3 py-1 rounded text-sm font-medium transition-all"
                  style={{
                    background: skills.includes(skill) ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: skills.includes(skill) ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                    border: `1px solid ${skills.includes(skill) ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                  }}
                >
                  {skill}
                </button>
              ))}
            </div>
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
            Post
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded font-medium border"
            style={{
              background: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
