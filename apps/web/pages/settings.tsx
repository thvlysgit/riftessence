import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemeContext } from '../contexts/ThemeContext';
import { applyThemeCursorSettings } from '../utils/themeRegistry';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingSpinner } from '@components/LoadingSpinner';
import { getAuthHeader } from '../utils/auth';
import { DiscordIcon } from '../src/components/DiscordBrand';
import { RiotAuthButton } from '@components/RiotBrand';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const DISCORD_USER_APP_INSTALL_URL = 'https://discord.com/oauth2/authorize?client_id=1363678859471491312&integration_type=1&scope=applications.commands';
const DISCORD_DM_HELP_URL = 'https://support.discord.com/hc/en-us/articles/217916488-Blocking-Privacy-Settings-';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { currentTheme, setTheme, availableThemes, themeCursorsEnabled, setThemeCursorsEnabled } = useTheme();
  const { currentLanguage, setLanguage, availableLanguages, t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [discordDmEnabled, setDiscordDmEnabled] = useState(false);
  const [dmToggleLoading, setDmToggleLoading] = useState(false);
  const [dmMessage, setDmMessage] = useState('');
  const [discordLinked, setDiscordLinked] = useState(Boolean(user?.discordLinked));
  const [discordUsername, setDiscordUsername] = useState<string | null>(user?.discordUsername || null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load Discord DM notification preference
  useEffect(() => {
    if (!user) return;

    setDiscordLinked(Boolean(user.discordLinked));
    setDiscordUsername(user.discordUsername || null);

    const fetchDmState = async () => {
      try {
        const headers = getAuthHeader();
        if (!headers || !('Authorization' in headers)) return;
        const res = await fetch(`${API_URL}/api/user/profile`, { headers });
        if (res.ok) {
          const data = await res.json();
          setDiscordDmEnabled(Boolean(data.discordDmNotifications));
          setDiscordLinked(Boolean(data.discordLinked ?? data.discordAccount));
          setDiscordUsername(data.discordUsername || null);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchDmState();
  }, [user]);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.dmConsent !== '1') return;

    setDmMessage('Discord DMs are enabled by default for linked accounts. Adding the RiftEssence Discord app improves delivery when you do not share a server with the bot.');

    const nextQuery = { ...router.query } as Record<string, any>;
    delete nextQuery.dmConsent;
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
  }, [router.isReady, router.query, router.pathname, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--color-accent-1)' }}>{t('common.loading')}</div>
      </div>
    );
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError(t('settings.password.error.match'));
      return;
    }

    if (password.length < 6) {
      setError(t('settings.password.error.length'));
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(t('settings.password.success'));
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to set password');
      }
    } catch (err) {
      setError(t('settings.password.error.network'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDiscordDm = async (enabled: boolean) => {
    if (!discordLinked) {
      setDmMessage('Link your Discord account in Profile before managing Discord DM notifications.');
      return;
    }

    setDmToggleLoading(true);
    setDmMessage('');
    try {
      const headers = getAuthHeader();
      const res = await fetch(`${API_URL}/api/user/discord-dm-notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setDiscordDmEnabled(enabled);
        setDmMessage(enabled
          ? 'Discord DM notifications are back on. You will receive chat previews, team event updates, and announcements in Discord DMs when delivery is allowed.'
          : 'Discord DM notifications are off. You can turn them back on here at any time.'
        );
      } else {
        const data = await res.json();
        setDmMessage(data.error || 'Failed to update setting');
      }
    } catch (err) {
      setDmMessage('Network error. Please try again.');
    } finally {
      setDmToggleLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--color-accent-1)' }}>{t('settings.title')}</h1>

        {/* Language Selection */}
        <div className="border rounded-xl p-6 mb-6 theme-section-shell theme-section-shell-soft" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>{t('settings.language.title')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.language.description')}
          </p>
          
          <div className="flex items-center gap-3">
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full max-w-md px-4 py-3 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: 'var(--border-width) solid',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              {availableLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
            {currentLanguage === 'fr' && (
              <span className="px-2 py-1 text-xs font-semibold rounded" style={{
                backgroundColor: 'rgba(251, 146, 60, 0.15)',
                color: '#fb923c',
                border: '1px solid #fb923c'
              }}>
                BETA
              </span>
            )}
          </div>
        </div>

        {/* Theme Selection */}
        <div className="border rounded-xl p-6 mb-6 theme-section-shell theme-section-shell-soft" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-accent-1)' }}>{t('settings.theme.title')}</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.theme.description')}
          </p>

          <div className="mb-5 rounded-xl p-4 border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Theme-Specific Cursors</p>
                <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
                  Optional: each theme adds a polished cursor that reacts to links, text fields, menus, posts, messages, and disabled controls.
                  Native cursors stay as the fallback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setThemeCursorsEnabled(!themeCursorsEnabled)}
                className="inline-flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors"
                style={{
                  backgroundColor: themeCursorsEnabled ? 'rgba(198, 167, 255, 0.16)' : 'rgba(255,255,255,0.03)',
                  color: themeCursorsEnabled ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
                  borderColor: themeCursorsEnabled ? 'var(--color-accent-1)' : 'var(--color-border)',
                }}
              >
                <span className="relative inline-flex h-5 w-9 items-center rounded-full" style={{ backgroundColor: themeCursorsEnabled ? 'var(--color-accent-1)' : 'var(--color-bg-secondary)' }}>
                  <span
                    className="inline-block h-4 w-4 rounded-full transition-transform"
                    style={{
                      backgroundColor: '#fff',
                      transform: themeCursorsEnabled ? 'translateX(18px)' : 'translateX(2px)',
                    }}
                  />
                </span>
                <span className="text-sm font-semibold">{themeCursorsEnabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
          </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableThemes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => setTheme(theme.name)}
                onMouseEnter={() => {
                  if (!themeCursorsEnabled) return;
                  applyThemeCursorSettings(document.documentElement, theme.name, true);
                }}
                onMouseLeave={() => {
                  applyThemeCursorSettings(document.documentElement, currentTheme, themeCursorsEnabled);
                }}
                className="relative p-4 border-2 rounded-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: currentTheme === theme.name ? theme.colors.bgSecondary : theme.colors.bgPrimary,
                  borderColor: currentTheme === theme.name ? theme.colors.accent1 : theme.colors.border,
                  borderRadius: theme.style.borderRadius,
                  boxShadow: currentTheme === theme.name ? theme.style.shadow : 'none',
                }}
              >
                {currentTheme === theme.name && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.colors.accent1 }}>
                    <svg className="w-4 h-4" style={{ color: theme.colors.bgPrimary }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                <div className="mb-3">
                  <h3 className="font-bold text-lg mb-2" style={{ color: theme.colors.textPrimary }}>{theme.displayName}</h3>
                  
                  {/* Spinner Preview */}
                  <div className="flex justify-center mb-3" style={{ height: '50px', overflow: 'visible' }}>
                    <div style={{ 
                      transform: 'scale(0.5)', 
                      transformOrigin: 'center',
                    }}>
                      <ThemeContext.Provider value={{
                        currentTheme: theme.name,
                        theme: theme,
                        setTheme: () => {},
                        availableThemes: availableThemes,
                        themeCursorsEnabled: false,
                        setThemeCursorsEnabled: () => {},
                      }}>
                        <LoadingSpinner compact={true} />
                      </ThemeContext.Provider>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.colors.accent1 }}></div>
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.colors.accent2 }}></div>
                    {theme.colors.accent3 && <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.colors.accent3 }}></div>}
                  </div>
                </div>
                
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                  {t('theme.clickToApply')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Account Info */}
        <div className="border rounded-xl p-6 mb-6 theme-section-shell theme-section-shell-soft" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>{t('settings.account.title')}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('settings.account.username')}</label>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{user.username}</p>
            </div>
            {user.email && (
              <div>
                <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('settings.account.email')}</label>
                <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{user.email}</p>
              </div>
            )}
            <div>
              <label className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('settings.account.status')}</label>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {user.verified ? (
                  <span style={{ color: 'var(--color-success)' }}>{t('settings.account.verified')}</span>
                ) : (
                  <span style={{ color: 'var(--color-warning)' }}>{t('settings.account.notVerified')}</span>
                )}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Verification is a trust factor only and does not block app access.
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Verified status requires at least one linked Riot account and one linked Discord account.
              </p>
            </div>
          </div>
        </div>

        {/* Discord DM Notifications */}
        <div className="border rounded-xl p-6 mb-6 theme-section-shell theme-section-shell-soft" style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <div className="flex items-center gap-3 mb-4">
            <DiscordIcon className="w-6 h-6" style={{ color: 'var(--accent-discord)' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-accent-1)' }}>Discord DM Notifications</h2>
          </div>

          {discordLinked ? (
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  Discord DMs are enabled by default for linked accounts{discordUsername ? ` like ${discordUsername}` : ''}.
                  The RiftEssence bot can send chat previews, team event updates, and announcements directly to Discord.
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                You can disable this at any time. Discord must still allow the bot to DM you.
                Adding the RiftEssence Discord app is recommended for delivery when you do not share a server with the bot, and Discord privacy settings can still block DMs.
                When this is on, message previews and notification content may be relayed to Discord.
                See our <a href="/privacy" className="underline" style={{ color: 'var(--color-accent-1)' }}>Privacy Policy</a> for details.
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <a
                  href={DISCORD_USER_APP_INSTALL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="discord-cta inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                >
                  <DiscordIcon className="w-4 h-4" />
                  Add RiftEssence To Discord Apps
                </a>
                <a
                  href={DISCORD_DM_HELP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >
                  How To Enable Discord DMs
                </a>
              </div>

              {dmMessage && (
                <div className="px-4 py-3 rounded-lg text-sm mb-4" style={{
                  backgroundColor: discordDmEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: discordDmEnabled ? 'var(--color-success)' : 'var(--color-error)',
                  border: '1px solid',
                  borderColor: discordDmEnabled ? 'var(--color-success)' : 'var(--color-error)',
                }}>
                  {dmMessage}
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggleDiscordDm(!discordDmEnabled)}
                  disabled={dmToggleLoading}
                  className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: discordDmEnabled ? '#5865F2' : 'var(--color-bg-tertiary)',
                    border: '2px solid',
                    borderColor: discordDmEnabled ? '#5865F2' : 'var(--color-border)',
                  }}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full transition-transform"
                    style={{
                      backgroundColor: discordDmEnabled ? '#fff' : 'var(--color-text-muted)',
                      transform: discordDmEnabled ? 'translateX(22px)' : 'translateX(2px)',
                    }}
                  />
                </button>
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {discordDmEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Link your Discord account to receive bot DMs by default for chat previews, team events, and announcements. You can turn them off here after linking.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <a
                  href={DISCORD_USER_APP_INSTALL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="discord-cta inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                >
                  <DiscordIcon className="w-4 h-4" />
                  Add RiftEssence To Discord Apps
                </a>
                <a
                  href={DISCORD_DM_HELP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >
                  How To Enable Discord DMs
                </a>
              </div>
              <a
                href="/profile"
                className="discord-cta inline-flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-sm"
              >
                <DiscordIcon className="w-4 h-4" />
                Link Discord In Profile
              </a>
            </>
          )}
        </div>

        {/* Set/Change Password */}
        <div className="border rounded-xl p-6 mb-6 theme-section-shell theme-section-shell-soft" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>{t('settings.password.title')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.password.description')}
          </p>

          <form onSubmit={handleSetPassword} className="space-y-4">
            {message && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                borderColor: 'var(--color-success)',
                color: 'var(--color-success)',
                border: '1px solid'
              }}>
                {message}
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderColor: 'var(--color-error)',
                color: 'var(--color-error)',
                border: '1px solid'
              }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('settings.password.new')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full max-w-md px-4 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  border: 'var(--border-width) solid',
                  borderRadius: 'var(--border-radius)'
                }}
                placeholder="Enter new password"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('settings.password.confirm')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full max-w-md px-4 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  border: 'var(--border-width) solid',
                  borderRadius: 'var(--border-radius)'
                }}
                placeholder={t('settings.password.confirm')}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 font-bold rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))`,
                color: saving ? 'var(--color-text-muted)' : 'var(--color-bg-primary)',
                borderRadius: 'var(--border-radius)'
              }}
            >
              {saving ? t('settings.password.setting') : t('settings.password.set')}
            </button>
          </form>
        </div>

        {/* Riot Account Linking */}
        <div className="border rounded-xl p-6" style={{ 
          backgroundColor: 'var(--color-bg-secondary)', 
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)'
        }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>{t('settings.riot.title')}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.riot.description')}
          </p>
          <div className="max-w-xs">
            <RiotAuthButton label={t('settings.riot.manage')} />
          </div>
        </div>
      </div>
    </div>
  );
}
