import React, { useState } from 'react';

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
const AVAILABILITIES = [
  { value: 'ONCE_A_WEEK', label: 'Once a Week' },
  { value: 'TWICE_A_WEEK', label: 'Twice a Week' },
  { value: 'THRICE_A_WEEK', label: 'Thrice a Week' },
  { value: 'FOUR_TIMES_A_WEEK', label: 'Four times a Week' },
  { value: 'EVERYDAY', label: 'Everyday' },
];
const COACHING_OPTIONS = [
  { value: 'DEDICATED_COACH', label: 'Dedicated Coach' },
  { value: 'FREQUENT', label: 'Frequent' },
  { value: 'OCCASIONAL', label: 'Occasional' },
  { value: 'NONE', label: 'None' },
];

export interface CreateTeamLftModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const CreateTeamLftModal: React.FC<CreateTeamLftModalProps> = ({ open, onClose, onSubmit }) => {
  const [teamName, setTeamName] = useState('');
  const [region, setRegion] = useState('EUW');
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([]);
  const [averageRank, setAverageRank] = useState('');
  const [averageDivision, setAverageDivision] = useState('');
  const [scrims, setScrims] = useState(false);
  const [minAvailability, setMinAvailability] = useState('');
  const [coachingAvailability, setCoachingAvailability] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  const toggleRole = (role: string) => {
    setRolesNeeded(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }
    if (rolesNeeded.length === 0) {
      setError('Select at least one role needed');
      return;
    }
    if (!averageRank) {
      setError('Average rank is required');
      return;
    }
    if (!minAvailability) {
      setError('Minimum availability is required');
      return;
    }
    if (!coachingAvailability) {
      setError('Coaching availability is required');
      return;
    }
    setError('');
    onSubmit({
      teamName,
      region,
      rolesNeeded,
      averageRank,
      averageDivision: (averageRank && !['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(averageRank)) ? averageDivision : null,
      scrims,
      minAvailability,
      coachingAvailability,
      details: details.trim() || null,
    });
  };

  if (!open) return null;

  const showDivision = averageRank && !['MASTER', 'GRANDMASTER', 'CHALLENGER', 'UNRANKED'].includes(averageRank);

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
          Looking for Players
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded" style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Team Name *
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3 py-2 rounded border"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="Enter team name"
              required
            />
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Region *
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
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
            >
              {REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Roles Needed */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Roles Needed *
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className="px-4 py-2 rounded font-medium transition-all"
                  style={{
                    background: rolesNeeded.includes(role) ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                    color: rolesNeeded.includes(role) ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                    border: `1px solid ${rolesNeeded.includes(role) ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Average Rank */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Average Rank *
            </label>
            <select
              value={averageRank}
              onChange={(e) => setAverageRank(e.target.value)}
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
                value={averageDivision}
                onChange={(e) => setAverageDivision(e.target.value)}
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
              >
                <option value="">Select division...</option>
                {DIVISIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Scrims */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="scrims"
              checked={scrims}
              onChange={(e) => setScrims(e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="scrims" className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Scrims Available
            </label>
          </div>

          {/* Minimum Availability */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Minimum Availability *
            </label>
            <select
              value={minAvailability}
              onChange={(e) => setMinAvailability(e.target.value)}
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

          {/* Coaching Availability */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Coaching Availability *
            </label>
            <select
              value={coachingAvailability}
              onChange={(e) => setCoachingAvailability(e.target.value)}
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
              <option value="">Select coaching...</option>
              {COACHING_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Details */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Additional Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3 py-2 rounded border"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="Tell potential players about your team..."
              rows={4}
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
