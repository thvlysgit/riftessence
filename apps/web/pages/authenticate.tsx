// Authentication & Riot verification page (theme-aware)
// Renamed from verify-test for clarity

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import IconPicker from '../src/components/IconPicker';
import { useAuth } from '../contexts/AuthContext';

// Type definitions for the request and response payloads
type VerifyResponse = {
  success?: boolean;
  error?: string;
  [key: string]: any;
};

// Use NEXT_PUBLIC_API_URL in the browser
const apiBase = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_API_URL || '') ? process.env.NEXT_PUBLIC_API_URL : '';

export default function AuthenticatePage(): JSX.Element {
  const { refreshUser } = useAuth();
  const router = useRouter();
  
  // Two-step flow state
  const [summonerName, setSummonerName] = useState('');
  const [region, setRegion] = useState('EUW');

  const [currentIcon, setCurrentIcon] = useState<number | null>(null);
  const [originalIcon, setOriginalIcon] = useState<number | null>(null);
  const [selectedIconId, setSelectedIconId] = useState('');

  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load userId from JWT token on mount
  React.useEffect(() => {
    try {
      const token = localStorage.getItem('lfd_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId);
        console.log('[Authenticate] Current userId:', payload.userId);
      }
    } catch (e) {
      console.error('[Authenticate] Failed to extract userId from token:', e);
    }
  }, []);

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
      // Remove directional marks, zero-width characters, soft hyphens, etc.
      .replace(/[\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069\u00AD]/g, '')
      // Normalize to remove any combining characters
      .normalize('NFKC');
  }

  async function handleLookup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setResult(null);
    setCurrentIcon(null);
    setOriginalIcon(null);
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
        setOriginalIcon(icon); // Store original icon
        if (icon === null) {
          setError('Could not determine profile icon from Riot response');
        }
        setResult(data);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoadingLookup(false);
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
    setLoadingVerify(true);
    try {
      const verifyName = sanitizeRiotId(summonerName);
      const url = apiBase ? `${apiBase.replace(/\/$/, '')}/api/user/verify-riot` : '/api/user/verify-riot';
      console.log('[Authenticate] Sending verification with userId:', currentUserId);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          summonerName: verifyName, 
          region, 
          verificationIconId: Number(selectedIconId),
          userId: currentUserId,
        }),
      });
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
      if (!res.ok) {
        setError(data?.error || `Verify failed: ${res.status}`);
        setResult(data);
      } else {
        setResult(data);
        if (data.success && data.userId) {
          console.log('[Authenticate] Storing token:', data.userId);
          try { 
            if (data.token) {
              localStorage.setItem('lfd_token', data.token);
            }
            setCurrentUserId(data.userId);
          } catch (e) {
            console.error('[Authenticate] Failed to store token:', e);
          }
          // Refresh auth state immediately
          await refreshUser();
          // Navigate to returnUrl if provided (for onboarding flow), otherwise go to profile
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

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4" style={{ background: 'var(--bg-main)' }}>
      <div className="max-w-2xl w-full space-y-6">
        {/* Progress Indicator */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Verification Progress</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {!summonerName ? '0' : !currentIcon ? '1' : !selectedIconId ? '2' : '3'} / 3
            </span>
          </div>
          <div className="w-full rounded-full h-2" style={{ background: 'var(--bg-input)' }}>
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                background: 'var(--accent-primary)',
                width: !summonerName ? '0%' : !currentIcon ? '33%' : !selectedIconId ? '66%' : '100%',
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            <span>Enter ID</span>
            <span>Lookup Current</span>
            <span>Select New</span>
            <span>Verify</span>
          </div>
        </div>

        {/* Main Verification Card */}
        <div className="rounded-xl p-8" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>Authenticate & Link Your Riot Account</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Connect your Riot account to unlock features</p>
            {currentUserId && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--accent-primary)' }}>Session: {currentUserId.slice(0, 12)}...</span>
                <button
                  onClick={() => {
                    setCurrentUserId(null);
                  }}
                  className="ml-2 text-xs transition-colors"
                  style={{ color: 'var(--accent-danger)' }}
                  title="Clear session"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* 3-step instructions */}
          <div className="rounded-lg p-4 mb-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>How it works:</h2>
            <ol className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start"><span className="font-bold mr-2" style={{ color: 'var(--accent-primary)' }}>1.</span> Enter your Riot ID and click Lookup</li>
              <li className="flex items-start"><span className="font-bold mr-2" style={{ color: 'var(--accent-primary)' }}>2.</span> Select a verification icon and change it in your League client</li>
              <li className="flex items-start"><span className="font-bold mr-2" style={{ color: 'var(--accent-primary)' }}>3.</span> Click Verify to confirm the change</li>
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

            {/* Submit button */}
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
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-4" style={{ color: 'var(--accent-primary)' }}>Account found! Current icon:</span>
                  {currentIcon !== null && (
                    <div className="flex items-center">
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${currentIcon}.png`}
                        alt={`Icon ${currentIcon}`}
                        className="w-10 h-10 rounded-md mr-3"
                        style={{ boxShadow: 'var(--shadow-md)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ID: {currentIcon}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Choose Verification Icon</label>
                <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>Select an icon you own, then change it in your League client</p>
                
                <div className="rounded-lg p-4" style={{ border: '2px solid var(--border-card)', background: 'var(--bg-main)' }}>
                  <IconPicker 
                    selectedId={selectedIconId ? Number(selectedIconId) : null} 
                    onSelect={(id) => setSelectedIconId(String(id))} 
                    count={29}
                    excludeIds={originalIcon !== null ? [originalIcon] : []}
                  />
                </div>

                {originalIcon !== null && originalIcon >= 0 && originalIcon <= 29 && (
                  <div className="rounded-lg p-3" style={{ background: 'var(--accent-danger-bg)', border: '1px solid var(--accent-danger)' }}>
                    <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>
                      <span className="font-semibold">⚠️ Icon {originalIcon} is excluded</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      This is your current icon - you cannot use it for verification to prevent impersonation
                    </p>
                  </div>
                )}

                {selectedIconId && (
                  <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
                    <p className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                      <span className="font-semibold">Selected icon ID:</span> {selectedIconId}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Change your profile icon to this one in the League client, then verify below.
                    </p>
                  </div>
                )}

                <button 
                  onClick={handleVerify} 
                  disabled={loadingVerify || !selectedIconId}
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
                  ) : 'Verify Icon Change'}
                </button>
              </div>
            </div>
          )}

          {(error || result) && (
            <div className="mt-6 space-y-3">
              {error && (
                <div className="rounded-lg p-4" style={{ background: 'var(--accent-danger-bg)', border: '2px solid var(--accent-danger)' }}>
                  <div className="flex items-start">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-danger)' }}>Error</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {result && result.success && (
                <div className="rounded-lg p-4" style={{ background: 'var(--accent-primary-bg)', border: '2px solid var(--accent-primary)' }}>
                  <div className="flex items-start">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Verification Successful!</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Your Riot account has been verified.</p>
                    </div>
                  </div>
                </div>
              )}

              {result && !result.success && !error && (
                <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '2px solid var(--border-card)' }}>
                  <div className="flex items-start">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Verification Failed</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Make sure you changed your icon to the selected one.</p>
                      <pre className="text-xs mt-2 whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{JSON.stringify(result, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}