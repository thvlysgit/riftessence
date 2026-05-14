import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getAuthHeader, getAuthToken } from '../utils/auth';

interface UserTeam {
  id: string;
  name: string;
  tag: string | null;
  isOwner: boolean;
  myRole: string;
  members: Array<{
    userId: string;
    username: string;
    role: string;
  }>;
}

// Helper to get custom arrow with theme color
const getCustomArrow = () => {
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-1').trim();
  const colorHex = accentColor.startsWith('#') ? accentColor.slice(1) : 'C8AA6E';
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23${colorHex}' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`;
};

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
const STAFF_NEEDS = [
  {
    value: 'MANAGER',
    label: 'Manager',
    description: 'Leads operations, roster updates, and logistics.',
  },
  {
    value: 'COACH',
    label: 'Coach',
    description: 'Supports strategy, review, and player development.',
  },
  {
    value: 'OTHER',
    label: 'Other Staff',
    description: 'Analyst, content, psychologist, or another support profile.',
  },
];
const CONTACT_ELIGIBLE_ROLES = new Set(['OWNER', 'MANAGER', 'COACH']);
const RANKS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];
const AVAILABILITIES = [
  { value: 'ONCE_A_WEEK', label: 'Once a Week' },
  { value: 'TWICE_A_WEEK', label: 'Twice a Week' },
  { value: 'THRICE_A_WEEK', label: 'Thrice a Week' },
  { value: 'FOUR_TIMES_A_WEEK', label: 'Four times a Week' },
  { value: 'FIVE_TIMES_A_WEEK', label: 'Five times a Week' },
  { value: 'SIX_TIMES_A_WEEK', label: 'Six times a Week' },
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
  const { currentTheme } = useTheme();
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [contactUserId, setContactUserId] = useState('');
  const [region, setRegion] = useState('EUW');
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([]);
  const [staffNeeded, setStaffNeeded] = useState<string[]>([]);
  const [averageRank, setAverageRank] = useState('');
  const [averageDivision, setAverageDivision] = useState('');
  const [scrims, setScrims] = useState(false);
  const [minAvailability, setMinAvailability] = useState('ONCE_A_WEEK');
  const [coachingAvailability, setCoachingAvailability] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch user's teams when modal opens
  useEffect(() => {
    if (open) {
      const fetchTeams = async () => {
        const token = getAuthToken();
        if (!token) return;

        setTeamsLoading(true);
        try {
          const res = await fetch(`${apiUrl}/api/teams`, {
            headers: getAuthHeader(),
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            // Team LFT posts are managed by owner/manager.
            const manageableTeams = data.filter((t: UserTeam) => t.isOwner || t.myRole === 'MANAGER');
            setUserTeams(manageableTeams);
          }
        } catch (err) {
          console.error('Failed to fetch teams:', err);
        } finally {
          setTeamsLoading(false);
        }
      };
      fetchTeams();
    }
  }, [open, apiUrl]);

  // Restore saved draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('riftessence_lft_team_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.selectedTeamId !== undefined) setSelectedTeamId(d.selectedTeamId);
        if (d.contactUserId !== undefined) setContactUserId(d.contactUserId);
        if (d.region) setRegion(d.region);
        if (Array.isArray(d.rolesNeeded)) setRolesNeeded(d.rolesNeeded);
        if (Array.isArray(d.staffNeeded)) setStaffNeeded(d.staffNeeded);
        if (d.averageRank !== undefined) setAverageRank(d.averageRank);
        if (d.averageDivision !== undefined) setAverageDivision(d.averageDivision);
        if (d.scrims !== undefined) setScrims(d.scrims);
        if (d.minAvailability) setMinAvailability(d.minAvailability);
        if (d.coachingAvailability !== undefined) setCoachingAvailability(d.coachingAvailability);
        if (d.details !== undefined) setDetails(d.details);
      }
    } catch {}
  }, []);

  // Save draft to localStorage on change
  useEffect(() => {
    localStorage.setItem('riftessence_lft_team_draft', JSON.stringify({
      selectedTeamId, contactUserId, region, rolesNeeded, staffNeeded, averageRank, averageDivision,
      scrims, minAvailability, coachingAvailability, details
    }));
  }, [selectedTeamId, contactUserId, region, rolesNeeded, staffNeeded, averageRank, averageDivision, scrims, minAvailability, coachingAvailability, details]);

  const selectedTeam = useMemo(
    () => userTeams.find((team) => team.id === selectedTeamId),
    [userTeams, selectedTeamId]
  );

  const contactCandidates = useMemo(
    () => (selectedTeam?.members || []).filter((member) =>
      CONTACT_ELIGIBLE_ROLES.has(String(member.role || '').toUpperCase())
    ),
    [selectedTeam]
  );

  useEffect(() => {
    if (!selectedTeam) {
      setContactUserId('');
      return;
    }

    if (contactCandidates.length === 0) {
      setContactUserId('');
      return;
    }

    if (!contactCandidates.some((member) => member.userId === contactUserId)) {
      setContactUserId(contactCandidates[0].userId);
    }
  }, [selectedTeam, contactCandidates, contactUserId]);

  const toggleRole = (role: string) => {
    setRolesNeeded(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const toggleStaffNeed = (staffRole: string) => {
    setStaffNeeded(prev =>
      prev.includes(staffRole) ? prev.filter((role) => role !== staffRole) : [...prev, staffRole]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError('Please select a team');
      return;
    }
    if (rolesNeeded.length === 0 && staffNeeded.length === 0) {
      setError('Select at least one player role or staff need');
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
    const selectedContact = contactCandidates.find((member) => member.userId === contactUserId);
    if (!selectedContact) {
      setError('Choose a contact person (owner, manager, or coach) from this team');
      return;
    }

    setError('');
    onSubmit({
      teamName: selectedTeam?.name || '',
      teamId: selectedTeamId,
      contactUserId: selectedContact.userId,
      region,
      rolesNeeded,
      staffNeeded,
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

  // Theme-specific emoji for slider thumb
  const themeEmojis: Record<string, string> = {
    'classic': '⚔️',
    'arcane-pastel': '🧁',
    'nightshade': '🌙',
    'infernal-ember': '🔥',
    'radiant-light': '☀️',
  };
  const thumbEmoji = themeEmojis[currentTheme] || '⚔️';
  // Extra fill for moon emoji to cover its curved shape
  const gradientOffset = currentTheme === 'nightshade' ? 2 : 0;

  return (
    <>
      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          position: relative;
          width: 100%;
          height: 8px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 1px;
          height: 1px;
          opacity: 0;
          cursor: pointer;
          visibility: hidden;
        }
        input[type="range"]::-moz-range-thumb {
          width: 1px;
          height: 1px;
          opacity: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          visibility: hidden;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          border: 1px solid var(--color-border);
        }
        input[type="range"]::-moz-range-track {
          width: 100%;
          height: 8px;
          border-radius: 4px;
          border: 1px solid var(--color-border);
        }
        input[type="range"]:focus {
          outline: none;
        }
        .slider-container {
          position: relative;
          padding: 0 14px;
        }
        .slider-thumb {
          position: absolute;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transition: transform 0.15s ease;
          font-size: 16px;
          line-height: 1;
          top: 50%;
          transform: translate(-50%, -50%);
        }
        input[type="range"]:hover ~ .slider-thumb {
          transform: translate(-50%, -50%) scale(1.15);
        }
        input[type="range"]:active ~ .slider-thumb {
          transform: translate(-50%, -50%) scale(1.0);
        }
      `}</style>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-60 overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
        <form 
          className="rounded-xl p-6 w-full max-w-2xl shadow-lg border-2 my-4 sm:my-8" 
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
          {/* Team Selector */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Team *
            </label>
            {teamsLoading ? (
              <div 
                className="w-full px-3 py-2 rounded border flex items-center gap-2"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)'
                }}
              >
                <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-accent-1)', borderTopColor: 'transparent' }} />
                Loading teams...
              </div>
            ) : userTeams.length === 0 ? (
              <div 
                className="w-full px-3 py-2 rounded border text-sm"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)'
                }}
              >
                You need to own or manage a team first. <a href="/teams/dashboard" className="underline" style={{ color: 'var(--color-accent-1)' }}>Go to Teams →</a>
              </div>
            ) : (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
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
                <option value="">Select your team...</option>
                {userTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}{team.tag ? ` [${team.tag}]` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Contact Person *
            </label>
            {selectedTeamId && contactCandidates.length > 0 ? (
              <select
                value={contactUserId}
                onChange={(e) => setContactUserId(e.target.value)}
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
                {contactCandidates.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.username} ({member.role})
                  </option>
                ))}
              </select>
            ) : (
              <div
                className="w-full px-3 py-2 rounded border text-sm"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)'
                }}
              >
                {selectedTeamId
                  ? 'No eligible contact found. Contact must be OWNER, MANAGER, or COACH.'
                  : 'Select a team first.'}
              </div>
            )}
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Messages from this listing will route to this team contact.
            </p>
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

          {/* Player Roles Needed */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Player Roles Needed
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
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Select game roles your roster still needs.
            </p>
          </div>

          {/* Staff Needs */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Staff Needs
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STAFF_NEEDS.map((staffRole) => {
                const selected = staffNeeded.includes(staffRole.value);
                return (
                  <button
                    key={staffRole.value}
                    type="button"
                    onClick={() => toggleStaffNeed(staffRole.value)}
                    className="px-3 py-2 rounded font-medium text-left transition-all"
                    style={{
                      background: selected ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                      color: selected ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                      border: `1px solid ${selected ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                    }}
                  >
                    <span className="block text-sm font-semibold">{staffRole.label}</span>
                    <span
                      className="block text-xs mt-1"
                      style={{ color: selected ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)' }}
                    >
                      {staffRole.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Add Manager, Coach, or Other when recruiting non-player profiles.
            </p>
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
            <div style={{ height: '28px', display: 'flex', alignItems: 'center' }}>
              <div className="slider-container" style={{ width: '100%' }}>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="1"
                  value={AVAILABILITIES.findIndex(a => a.value === minAvailability)}
                  onChange={(e) => setMinAvailability(AVAILABILITIES[parseInt(e.target.value)].value)}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1) 0%, var(--color-accent-1) ' + (AVAILABILITIES.findIndex(a => a.value === minAvailability) * 16.67 + gradientOffset) + '%, var(--color-bg-tertiary) ' + (AVAILABILITIES.findIndex(a => a.value === minAvailability) * 16.67 + gradientOffset) + '%, var(--color-bg-tertiary) 100%)',
                  }}
                  required
                />
                <div 
                  className="slider-thumb" 
                  style={{ 
                    left: `calc(14px + (100% - 28px) * ${(AVAILABILITIES.findIndex(a => a.value === minAvailability) * 16.67) / 100})`,
                  }}
                >
                  {thumbEmoji}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <span>Once/Week</span>
              <span className="font-semibold" style={{ color: 'var(--color-accent-1)' }}>
                {AVAILABILITIES.find(a => a.value === minAvailability)?.label || 'Select...'}
              </span>
              <span>Everyday</span>
            </div>
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
            disabled={userTeams.length === 0 || teamsLoading}
            className="flex-1 px-4 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </>
  );
};
