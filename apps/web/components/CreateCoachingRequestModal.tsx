import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU', 'TR'];
const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
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

export interface CreateCoachingRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const CreateCoachingRequestModal: React.FC<CreateCoachingRequestModalProps> = ({ open, onClose, onSubmit }) => {
  const { currentTheme } = useTheme();
  const { t } = useLanguage();
  
  const [region, setRegion] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [availability, setAvailability] = useState('ONCE_A_WEEK');
  const [details, setDetails] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
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
            console.error('Failed to decode token');
            return;
          }
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

            // Set role from preferredRole
            if (data.preferredRole) {
              setRoles([data.preferredRole]);
            }

            // Set languages from profile
            if (data.languages && data.languages.length > 0) {
              setLanguages(data.languages);
            }

            // Set discord tag if available
            if (data.discordUsername) {
              setDiscordTag(data.discordUsername);
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

  const toggleRole = (role: string) => {
    setRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const toggleLanguage = (lang: string) => {
    setLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!region) {
      setError('Region is required');
      return;
    }
    if (roles.length === 0) {
      setError('Please select at least one role');
      return;
    }
    if (languages.length === 0) {
      setError('Please select at least one language');
      return;
    }
    if (!availability) {
      setError('Availability is required');
      return;
    }
    if (details.length > 500) {
      setError('Details must be 500 characters or less');
      return;
    }
    if (discordTag && discordTag.length > 50) {
      setError('Discord tag must be 50 characters or less');
      return;
    }
    
    setError('');
    onSubmit({
      region,
      roles,
      languages,
      availability,
      details: details.trim() || null,
      discordTag: discordTag.trim() || null,
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

  // Theme-specific emoji for slider thumb
  const themeEmojis: Record<string, string> = {
    'classic': '⚔️',
    'arcane-pastel': '🧁',
    'nightshade': '🌙',
    'infernal-ember': '🔥',
    'radiant-light': '☀️',
  };
  const thumbEmoji = themeEmojis[currentTheme] || '⚔️';
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
            {t('coaching.seekCoaching')}
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
                Region *
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 rounded border appearance-none"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23C8AA6E' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  paddingRight: '2.5rem'
                }}
                required
              >
                <option value="">Select region...</option>
                {REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('coaching.availability')} *
              </label>
              <div style={{ height: '28px', display: 'flex', alignItems: 'center' }}>
                <div className="slider-container" style={{ width: '100%' }}>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={AVAILABILITIES.findIndex(a => a.value === availability)}
                    onChange={(e) => setAvailability(AVAILABILITIES[parseInt(e.target.value)].value)}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: 'linear-gradient(to right, var(--color-accent-1) 0%, var(--color-accent-1) ' + (AVAILABILITIES.findIndex(a => a.value === availability) * 16.67 + gradientOffset) + '%, var(--color-bg-tertiary) ' + (AVAILABILITIES.findIndex(a => a.value === availability) * 16.67 + gradientOffset) + '%, var(--color-bg-tertiary) 100%)',
                    }}
                    required
                  />
                  <div 
                    className="slider-thumb" 
                    style={{ 
                      left: `calc(14px + (100% - 28px) * ${(AVAILABILITIES.findIndex(a => a.value === availability) * 16.67) / 100})`,
                    }}
                  >
                    {thumbEmoji}
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Once/Week</span>
                <span className="font-semibold" style={{ color: 'var(--color-accent-1)' }}>
                  {AVAILABILITIES.find(a => a.value === availability)?.label || 'Select...'}
                </span>
                <span>Everyday</span>
              </div>
            </div>

            {/* Roles */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('coaching.roles')} *
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className="px-3 py-1 rounded text-sm font-medium transition-all"
                    style={{
                      background: roles.includes(role) ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                      color: roles.includes(role) ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                      border: `1px solid ${roles.includes(role) ? 'var(--color-accent-1)' : 'var(--color-border)'}`,
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('coaching.languages')} *
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

            {/* Details */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('coaching.details')} ({details.length}/500)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full px-3 py-2 rounded border resize-none"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder={t('coaching.detailsPlaceholder')}
              />
            </div>

            {/* Discord Tag */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('coaching.discordTag')} ({discordTag.length}/50)
              </label>
              <input
                type="text"
                value={discordTag}
                onChange={(e) => setDiscordTag(e.target.value)}
                maxLength={50}
                className="w-full px-3 py-2 rounded border"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="username#1234"
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
              {t('common.submit')}
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
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
