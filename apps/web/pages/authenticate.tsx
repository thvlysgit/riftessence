// Authentication & Riot verification page (theme-aware)
// Updated to use Riot Sign-On (RSO) as primary with icon verification as fallback

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import AccessRequirementModal from '@components/AccessRequirementModal';
import { getAuthHeader, markCookieSessionPresent, setAuthToken } from '../utils/auth';

// Type definitions for the request and response payloads
type VerifyResponse = {
  success?: boolean;
  error?: string;
  [key: string]: any;
};

// Use NEXT_PUBLIC_API_URL in the browser
const apiBase = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_API_URL || '') ? process.env.NEXT_PUBLIC_API_URL : '';
const ICON_REFRESH_INTERVAL_MS = 15000;
const ICON_SYNC_EXPECTED_MINUTES = 5;

export default function AuthenticatePage(): JSX.Element {
  const { refreshUser, user } = useAuth();
  const router = useRouter();

  // RSO state
  const [rsoLoading, setRsoLoading] = useState(false);
  const [rsoConfigured, setRsoConfigured] = useState<boolean | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Two-step flow state (icon verification fallback)
  const [summonerName, setSummonerName] = useState('');
  const [region, setRegion] = useState('EUW');

  const [currentIcon, setCurrentIcon] = useState<number | null>(null);
  const [_originalIcon, setOriginalIcon] = useState<number | null>(null);
  const [selectedIconId, setSelectedIconId] = useState('');

  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discordError, setDiscordError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [lastLookupAt, setLastLookupAt] = useState<Date | null>(null);

  const selectedIconNumber = Number(selectedIconId);
  const hasSelectedVerificationIcon = selectedIconId.trim() !== '' && !Number.isNaN(selectedIconNumber);
  const isVerificationIconDetected = currentIcon !== null && hasSelectedVerificationIcon && currentIcon === selectedIconNumber;

  // Check RSO status and handle callback on mount
  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    // Check RSO configuration status
    checkRsoStatus();

    // Handle RSO callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const rsoResult = urlParams.get('rso');
    const _isNew = urlParams.get('isNew'); // Available for welcome message if needed
    const rsoError = urlParams.get('error');
    const riotLinked = urlParams.get('riot');
    const discordResult = urlParams.get('discord');
    const promptDiscordDm = urlParams.get('promptDiscordDm');

    if (rsoResult === 'success' || discordResult === 'success') {
      markCookieSessionPresent();
      refreshUser().then(() => {
        const rawReturnUrl = urlParams.get('returnUrl') || '/feed';
        const returnUrl = rawReturnUrl.startsWith('/') ? rawReturnUrl : '/feed';
        if (promptDiscordDm === '1') {
          router.replace(`/settings?dmConsent=1&returnUrl=${encodeURIComponent(returnUrl)}`);
          return;
        }
        router.replace(returnUrl);
      });
    } else if (riotLinked === 'linked') {
      // Account was linked successfully (from profile page flow)
      refreshUser().then(() => {
        router.replace('/profile?riot=linked');
      });
    } else if (discordResult === 'error') {
      const discordErrorCode = urlParams.get('error') || '';
      const errorMessages: Record<string, string> = {
        missing_params: 'Discord authentication failed because the callback was incomplete.',
        invalid_state: 'Discord authentication failed because the session expired or was invalid.',
        state_expired: 'Discord authentication session expired. Please try again.',
        discord_not_configured: 'Discord sign-in is not configured right now.',
        token_exchange_failed: 'Discord rejected the sign-in request. Please try again.',
        userinfo_failed: 'Discord sign-in completed but user data could not be loaded.',
        account_already_linked: 'That Discord account is already linked to another RiftEssence account.',
        callback_failed: 'Discord authentication failed. Please try again.',
      };
      const resolvedMessage = errorMessages[discordErrorCode] || 'Discord authentication failed. Please try again.';
      console.error('[Authenticate] Discord auth failed:', discordErrorCode || 'unknown', resolvedMessage);
      setDiscordError(resolvedMessage);
      router.replace('/authenticate', undefined, { shallow: true });
    } else if (rsoError) {
      // RSO error
      const errorMessages: Record<string, string> = {
        'missing_params': 'Authentication failed: missing parameters',
        'invalid_state': 'Authentication failed: invalid state',
        'state_expired': 'Authentication session expired. Please try again.',
        'rso_not_configured': 'Riot Sign-On is not configured. Please use icon verification instead.',
        'token_exchange_failed': 'Failed to authenticate with Riot. Please try again.',
        'userinfo_failed': 'Failed to get account information from Riot.',
        'no_puuid': 'Failed to get your Riot account ID.',
        'callback_failed': 'Authentication callback failed. Please try again.',
        'user_not_found': 'User account not found.',
        'account_already_linked': 'This Riot account is already linked to another user.',
      };
      setError(errorMessages[rsoError] || rsoError);
      // Clear the error from URL
      router.replace('/authenticate', undefined, { shallow: true });
    }

  }, []);

  useEffect(() => {
    if (!showFallback || !autoRefreshEnabled) return;
    if (currentIcon === null || !hasSelectedVerificationIcon || isVerificationIconDetected) return;

    const intervalId = window.setInterval(() => {
      if (!loadingLookup) {
        void handleLookup(undefined, true);
      }
    }, ICON_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [showFallback, autoRefreshEnabled, currentIcon, hasSelectedVerificationIcon, isVerificationIconDetected, loadingLookup, summonerName, region]);

  useEffect(() => {
    if (isVerificationIconDetected) {
      setAutoRefreshEnabled(false);
    }
  }, [isVerificationIconDetected]);

  async function checkRsoStatus() {
    try {
      const url = apiBase ? `${apiBase.replace(/\/$/, '')}/api/auth/riot/status` : '/api/auth/riot/status';
      const res = await fetch(url);
      const data = await res.json();
      setRsoConfigured(data.configured);
      // If RSO is not configured, show fallback immediately
      if (!data.configured) {
        setShowFallback(true);
      }
    } catch (err) {
      console.error('[Authenticate] Failed to check RSO status:', err);
      setRsoConfigured(false);
      setShowFallback(true);
    }
  }

  async function handleRsoLogin() {
    setRsoLoading(true);
    setError(null);
    try {
      // For new registration/login (no existing account)
      const effectiveUserId = currentUserId || user?.id || null;
      const endpoint = effectiveUserId ? '/api/auth/riot/login' : '/api/auth/riot/auth';
      const url = apiBase ? `${apiBase.replace(/\/$/, '')}${endpoint}` : endpoint;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // If linking to existing account, include auth header
      if (effectiveUserId) {
        Object.assign(headers, getAuthHeader());
      }

      const res = await fetch(url, { headers, credentials: 'include' });
      const data = await res.json();

      if (data.url) {
        // Redirect to Riot's OAuth page
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start Riot Sign-On');
        setRsoLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to authentication service');
      setRsoLoading(false);
    }
  }

  function isValidRiotId(id: string): boolean {
    const trimmed = id.trim();
    if (!trimmed.includes('#')) return false;
    const [name, tag] = trimmed.split('#');
    return Boolean(name) && Boolean(tag);
  }

  // Remove invisible Unicode characters that can interfere with Riot API lookups
  function sanitizeRiotId(id: string): string {
    return id
      .trim()
      .replace(/[\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069\u00AD]/g, '')
      .normalize('NFKC');
  }

  async function handleLookup(e?: React.FormEvent, isRefresh: boolean = false) {
    if (e) e.preventDefault();
    setError(null);
    setResult(null);
    
    // Only reset icons on initial lookup, not on refresh
    if (!isRefresh) {
      setCurrentIcon(null);
      setOriginalIcon(null);
      setSelectedIconId('');
      setAutoRefreshEnabled(false);
      setLastLookupAt(null);
    }
    
    if (!summonerName.trim()) {
      setError('Riot ID is required');
      return;
    }
    if (!isValidRiotId(summonerName)) {
      setError('Please enter a valid Riot ID (e.g., Example#TAG)');
      return;
    }
    setLoadingLookup(true);
    try {
      const lookupName = sanitizeRiotId(summonerName);
      const url = apiBase ? `${apiBase.replace(/\/$/, '')}/riot/lookup` : '/riot/lookup';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: lookupName, region }),
      });
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
      if (!res.ok) {
        setError(data?.error || `Lookup failed: ${res.status}`);
      } else {
        const icon = data.profileIconId ?? null;
        setCurrentIcon(icon);
        
        // Only set originalIcon and generate random icon on initial lookup
        if (!isRefresh) {
          setOriginalIcon(icon);
          if (icon === null) {
            setError('Could not determine profile icon from Riot response');
          } else {
            // Auto-select a random verification icon (excluding current icon)
            const availableIcons = Array.from({ length: 29 }, (_, i) => i).filter(id => id !== icon);
            const randomIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
            setSelectedIconId(String(randomIcon));
          }
        }
        setResult(data);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoadingLookup(false);
      setLastLookupAt(new Date());
    }
  }

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setResult(null);
    if (!selectedIconId.trim()) {
      setError('Please select a verification icon');
      return;
    }
    if (Number.isNaN(Number(selectedIconId))) {
      setError('Verification icon id must be numeric');
      return;
    }
    if (!isVerificationIconDetected) {
      setError('We still do not see the verification icon on Riot. Click "Check Riot icon now" and verify only after it matches.');
      return;
    }
    setLoadingVerify(true);
    try {
      const verifyName = sanitizeRiotId(summonerName);
      const url = apiBase ? `${apiBase.replace(/\/$/, '')}/api/user/verify-riot` : '/api/user/verify-riot';
      const authHeaders = (currentUserId || user?.id) ? getAuthHeader() : {};
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          summonerName: verifyName,
          region,
          verificationIconId: Number(selectedIconId),
        }),
      });
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
      if (!res.ok) {
        setError(data?.error || `Verify failed: ${res.status}`);
        setResult(data);
      } else {
        setResult(data);
        if (data.success && data.userId) {
          try {
            if (data.token) {
              setAuthToken(data.token);
            } else {
              markCookieSessionPresent(data.userId);
            }
            setCurrentUserId(data.userId);
          } catch (e) {
            console.error('[Authenticate] Failed to store token:', e);
          }
          await refreshUser();
          const returnUrl = router.query.returnUrl as string | undefined;
          router.push(returnUrl || '/profile');
        }
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoadingVerify(false);
    }
  }

  // RSO logo SVG
  const RiotLogo = () => (
    <svg className="w-5 h-5" viewBox="0 0 30 32" fill="currentColor">
      <path d="M1.06 32V9.06L6.56 0h16.97l3.94 4.23-4.88 2.3-.35-.38-.03.02-3.56-3.74H8.27L4.66 8.2v19.8H1.06zm9.91-5.35l.01-12.22 2.98-4.57h10.7l4.13 4.4-2.95 1.69-2.22-2.36H15.9l-1.33 2.02v11.04H9.97zm8.52-5.22l4.6 10.57H30l-4.66-10.57h-5.85z"/>
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4" style={{ background: 'var(--bg-main)' }}>
      <div className="max-w-2xl w-full space-y-6">
        {/* Main Authentication Card */}
        <div className="rounded-xl p-8" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>
              {currentUserId ? 'Link Your Riot Account' : 'Authenticate with Riot'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {currentUserId
                ? 'Connect your Riot account to unlock all features'
                : 'Sign in with your Riot Games account to get started'
              }
            </p>
            {currentUserId && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--accent-primary)' }}>Session: {currentUserId.slice(0, 12)}...</span>
                <button
                  onClick={() => setCurrentUserId(null)}
                  className="ml-2 text-xs transition-colors"
                  style={{ color: 'var(--accent-danger)' }}
                  title="Clear session"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--accent-danger-bg)', border: '2px solid var(--accent-danger)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-danger)' }}>Error</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            </div>
          )}

          {/* RSO Login Section */}
          {!showFallback && (
            <>
              <div className="space-y-4">
                {/* RSO Button */}
                <button
                  onClick={handleRsoLogin}
                  disabled={rsoLoading || rsoConfigured === false}
                  className="w-full px-6 py-4 font-bold rounded-lg transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-wide"
                  style={{
                    background: rsoConfigured === false ? 'var(--bg-input)' : '#D13639',
                    color: rsoConfigured === false ? 'var(--text-muted)' : 'white',
                    border: rsoConfigured === false ? '2px solid var(--border-card)' : 'none'
                  }}
                >
                  {rsoLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connecting to Riot...
                    </>
                  ) : rsoConfigured === null ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : rsoConfigured === false ? (
                    'RSO Not Available'
                  ) : (
                    <>
                      <RiotLogo />
                      Sign in with Riot Games
                    </>
                  )}
                </button>

                {rsoConfigured && (
                  <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent-primary)' }}>Recommended Method</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Signing in with Riot Games is the fastest and most secure way to verify your account.
                      You&apos;ll be redirected to Riot&apos;s official login page.
                    </p>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }}></div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>OR</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border-card)' }}></div>
                </div>

                {/* Fallback option */}
                <button
                  onClick={() => setShowFallback(true)}
                  className="w-full px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-secondary)',
                    border: '2px solid var(--border-card)'
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Use Icon Verification Instead
                </button>
              </div>
            </>
          )}

          {/* Icon Verification Fallback Section */}
          {showFallback && (
            <>
              {/* Back button */}
              {rsoConfigured && (
                <button
                  onClick={() => setShowFallback(false)}
                  className="flex items-center gap-2 mb-4 text-sm hover:underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Riot Sign-On
                </button>
              )}

              {/* Progress Indicator */}
              <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Icon Verification Progress</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {!summonerName ? '0' : currentIcon === null ? '1' : '2'} / 2
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: 'var(--bg-input)' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      background: 'var(--accent-primary)',
                      width: !summonerName ? '0%' : currentIcon === null ? '50%' : '100%',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  <span>Enter ID & Lookup</span>
                  <span>Change Icon & Verify</span>
                </div>
              </div>

              {/* 2-step instructions */}
              <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>How icon verification works:</h2>
                <ol className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start"><span className="font-bold mr-2" style={{ color: 'var(--accent-primary)' }}>1.</span> Enter your Riot ID and click Lookup</li>
                  <li className="flex items-start"><span className="font-bold mr-2" style={{ color: 'var(--accent-primary)' }}>2.</span> Change your profile icon in the League client to the verification icon shown below</li>
                  <li className="flex items-start"><span className="font-bold mr-2" style={{ color: 'var(--accent-primary)' }}>3.</span> Wait up to {ICON_SYNC_EXPECTED_MINUTES} minutes, then use <strong>Check Riot icon now</strong> (or auto-check) until it matches</li>
                  <li className="flex items-start"><span className="font-bold mr-2" style={{ color: 'var(--accent-primary)' }}>4.</span> Click <strong>Verify Icon Change</strong> only after status says your icon is detected</li>
                </ol>
              </div>

              {/* Lookup Form */}
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--accent-primary)' }}>Riot ID</label>
                  <input
                    value={summonerName}
                    onChange={(e) => setSummonerName(e.target.value)}
                    className="block w-full px-4 py-3 rounded-lg"
                    style={{ background: 'var(--bg-input)', border: '2px solid var(--border-card)', color: 'var(--text-main)' }}
                    placeholder="GameName#TAG (e.g., Example#TAG)"
                    required
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Include your full Riot ID with tagline</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--accent-primary)' }}>Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="block w-full px-4 py-3 rounded-lg"
                    style={{ background: 'var(--bg-input)', border: '2px solid var(--border-card)', color: 'var(--text-main)', outlineColor: 'var(--accent-primary)' }}
                  >
                    <option>EUW</option>
                    <option>NA</option>
                    <option>EUNE</option>
                    <option>KR</option>
                    <option>OCE</option>
                    <option>LAN</option>
                    <option>LAS</option>
                    <option>BR</option>
                    <option>RU</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loadingLookup}
                  className="w-full px-6 py-3 font-bold rounded-lg transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-wide"
                  style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}
                >
                  {loadingLookup ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Looking up...
                    </>
                  ) : 'Lookup Account'}
                </button>
              </form>

              {/* Icon selection section */}
              {currentIcon !== null && (
                <div className="mt-8 pt-6" style={{ borderTop: '2px solid var(--border-card)' }}>
                  <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center flex-wrap gap-4">
                        <div className="flex items-center">
                          <span className="text-sm font-semibold mr-3" style={{ color: 'var(--accent-primary)' }}>Current icon</span>
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${currentIcon}.png`}
                            alt={`Icon ${currentIcon}`}
                            className="w-10 h-10 rounded-md mr-2"
                            style={{ boxShadow: 'var(--shadow-md)' }}
                          />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ID: {currentIcon}</span>
                        </div>
                        {hasSelectedVerificationIcon && (
                          <div className="flex items-center">
                            <span className="text-sm font-semibold mr-3" style={{ color: 'var(--accent-primary)' }}>Target icon</span>
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${selectedIconId}.png`}
                              alt={`Target icon ${selectedIconId}`}
                              className="w-10 h-10 rounded-md mr-2"
                              style={{ boxShadow: 'var(--shadow-md)' }}
                            />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ID: {selectedIconId}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleLookup(undefined, true)}
                          disabled={loadingLookup}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
                          title="Check Riot API for your latest icon"
                        >
                          <svg className={`w-4 h-4 ${loadingLookup ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Check Riot icon now
                        </button>
                        {!isVerificationIconDetected && hasSelectedVerificationIcon && (
                          <button
                            onClick={() => setAutoRefreshEnabled((prev) => !prev)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                            style={{
                              background: autoRefreshEnabled ? 'var(--accent-primary-bg)' : 'var(--bg-input)',
                              border: `1px solid ${autoRefreshEnabled ? 'var(--accent-primary)' : 'var(--border-card)'}`,
                              color: autoRefreshEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            }}
                          >
                            {autoRefreshEnabled ? 'Stop auto-check' : `Auto-check every ${Math.floor(ICON_REFRESH_INTERVAL_MS / 1000)}s`}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                      Riot&apos;s API can lag after icon changes. Expect up to {ICON_SYNC_EXPECTED_MINUTES} minutes before the new icon appears here.
                    </p>
                    {lastLookupAt && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Last checked: {lastLookupAt.toLocaleTimeString()}
                      </p>
                    )}
                    <div
                      className="rounded-lg p-3 mt-3"
                      style={{
                        background: isVerificationIconDetected ? 'var(--accent-primary-bg)' : 'var(--bg-input)',
                        border: `1px solid ${isVerificationIconDetected ? 'var(--accent-primary)' : 'var(--border-card)'}`,
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: isVerificationIconDetected ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                        {isVerificationIconDetected
                          ? 'Ready: Riot now shows your verification icon. You can safely verify.'
                          : 'Waiting: Riot still shows your previous icon. Keep checking until they match.'}
                      </p>
                      {!isVerificationIconDetected && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          Do not click verify yet. It will fail until this status turns ready.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Your Verification Icon</label>
                    <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>Change your League profile icon to this one to verify ownership</p>

                    {/* Display the randomly assigned verification icon prominently */}
                    {selectedIconId && (
                      <div className="rounded-lg p-6" style={{ 
                        border: '2px solid var(--accent-primary)', 
                        background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--accent-primary-bg) 100%)',
                        textAlign: 'center'
                      }}>
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${selectedIconId}.png`}
                              alt={`Verification Icon ${selectedIconId}`}
                              className="w-24 h-24 rounded-lg"
                              style={{ 
                                boxShadow: '0 0 20px rgba(200, 170, 110, 0.4), var(--shadow-lg)',
                                border: '3px solid var(--accent-primary)'
                              }}
                            />
                            <div 
                              className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                              style={{ 
                                background: 'var(--accent-primary)', 
                                color: 'var(--bg-main)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                              }}
                            >
                              {selectedIconId}
                            </div>
                          </div>
                          <div>
                            <p className="text-lg font-semibold" style={{ color: 'var(--accent-primary)' }}>
                              Change to Icon #{selectedIconId}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              Open League client → Profile → choose this icon, then wait and use Check Riot icon now until status is ready.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleVerify}
                      disabled={loadingVerify || !hasSelectedVerificationIcon || !isVerificationIconDetected}
                      className="w-full px-6 py-3 font-bold rounded-lg transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-wide"
                      style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}
                    >
                      {loadingVerify ? (
                        <>
                          <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </>
                      ) : isVerificationIconDetected ? 'Verify Icon Change' : 'Waiting for Icon Sync'}
                    </button>
                    {!isVerificationIconDetected && (
                      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                        Verify unlocks automatically when Riot reflects your new icon.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Success/Error display for icon verification */}
              {result && (
                <div className="mt-6 space-y-3">
                  {result.success && (
                    <div className="rounded-lg p-4" style={{ background: 'var(--accent-primary-bg)', border: '2px solid var(--accent-primary)' }}>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Verification Successful!</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Your Riot account has been verified.</p>
                    </div>
                  )}

                  {!result.success && !error && (
                    <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '2px solid var(--border-card)' }}>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Verification Failed</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Make sure your current icon matches the selected one, then click Check Riot icon now before retrying.</p>
                      <pre className="text-xs mt-2 whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{JSON.stringify(result, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {discordError && (
        <AccessRequirementModal
          type="account-required"
          reason={discordError}
          onClose={() => setDiscordError(null)}
        />
      )}
    </div>
  );
}
