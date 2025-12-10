// UI-improved Riot verification page with clean layout and Discord placeholder section
// Backend logic unchanged - purely visual enhancements

import React, { useState } from 'react';
import IconPicker from '../src/components/IconPicker';

// Type definitions for the request and response payloads
type VerifyResponse = {
  success?: boolean;
  error?: string;
  [key: string]: any;
};

// Use NEXT_PUBLIC_API_URL in the browser
const apiBase = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_API_URL || '') ? process.env.NEXT_PUBLIC_API_URL : '';

export default function VerifyTestPage(): JSX.Element {
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

  // Load userId from localStorage on mount
  React.useEffect(() => {
    try {
      const storedUserId = localStorage.getItem('lfd_userId');
      setCurrentUserId(storedUserId);
      console.log('[VerifyTest] Current userId:', storedUserId);
    } catch (e) {
      console.error('[VerifyTest] Failed to read localStorage:', e);
    }
  }, []);

  // Step 1: Lookup summoner current icon (backend logic unchanged)
  async function handleLookup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setResult(null);
    setCurrentIcon(null);
    setOriginalIcon(null);
    if (!summonerName.trim()) {
      setError('Summoner name is required');
      return;
    }
    setLoadingLookup(true);
    try {
      const lookupName = summonerName.trim();
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

  // Step 2: Verify by summoner and create/link user account
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
      const verifyName = summonerName.trim();
      const url = apiBase ? `${apiBase.replace(/\/$/, '')}/api/user/verify-riot` : '/api/user/verify-riot';
      
      // Get existing userId from localStorage if available (for adding additional accounts)
      let existingUserId: string | null = null;
      try { existingUserId = localStorage.getItem('lfd_userId'); } catch {}
      
      console.log('[VerifyTest] Sending verification with userId:', existingUserId);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies for session
        body: JSON.stringify({ 
          summonerName: verifyName, 
          region, 
          verificationIconId: Number(selectedIconId),
          userId: existingUserId, // Send existing userId if linking additional account
        }),
      });
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
      if (!res.ok) {
        setError(data?.error || `Verify failed: ${res.status}`);
        setResult(data);
      } else {
        setResult(data);
        // Store userId locally so profile page can load the correct user until sessions implemented
        if (data.success && data.userId) {
          console.log('[VerifyTest] Storing userId:', data.userId);
          try { 
            localStorage.setItem('lfd_userId', data.userId);
            setCurrentUserId(data.userId);
          } catch (e) {
            console.error('[VerifyTest] Failed to store userId:', e);
          }
          setTimeout(() => {
            window.location.href = '/profile';
          }, 1500);
        }
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoadingVerify(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0D12] flex items-center justify-center py-8 px-4">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Main Verification Card - Riot-flavored dark theme */}
        <div className="bg-[#1A1A1D] shadow-2xl rounded-xl p-8 border border-[#2B2B2F]">
          {/* Title section - gold accent */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-[#C8AA6E] mb-2">Verify Your League of Legends Account</h1>
            <p className="text-sm text-gray-400">Link your Riot account to unlock features</p>
            {currentUserId && (
              <div className="mt-2 inline-flex items-center px-3 py-1 bg-[#2B2B2F] border border-[#C8AA6E]/30 rounded-full">
                <span className="text-xs text-[#C8AA6E] font-mono">Session: {currentUserId.slice(0, 12)}...</span>
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem('lfd_userId');
                      setCurrentUserId(null);
                      console.log('[VerifyTest] Cleared userId');
                    } catch (e) {
                      console.error('[VerifyTest] Failed to clear userId:', e);
                    }
                  }}
                  className="ml-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                  title="Clear session"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* 3-step instruction section - dark theme with gold accents */}
          <div className="bg-[#2B2B2F] border border-[#C8AA6E]/30 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-[#C8AA6E] mb-3">How it works:</h2>
            <ol className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <span className="font-bold text-[#C8AA6E] mr-2">1.</span>
                <span>Enter your Riot ID and click Lookup to see your current icon</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-[#C8AA6E] mr-2">2.</span>
                <span>Select a verification icon below and change it in your League client</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-[#C8AA6E] mr-2">3.</span>
                <span>Click Verify to confirm the change</span>
              </li>
            </ol>
          </div>

          {/* Lookup Form - dark inputs with gold focus */}
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#C8AA6E] mb-1">Riot ID</label>
              <input
                value={summonerName}
                onChange={(e) => setSummonerName(e.target.value)}
                className="block w-full px-4 py-3 rounded-lg bg-[#2B2B2F] border-2 border-[#2B2B2F] text-gray-100 placeholder-gray-500 focus:border-[#C8AA6E] focus:ring-2 focus:ring-[#C8AA6E]/30 transition-colors"
                placeholder="GameName#TAG (e.g., Thvlys#9099)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Include your full Riot ID with tagline</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#C8AA6E] mb-1">Region</label>
              <select 
                value={region} 
                onChange={(e) => setRegion(e.target.value)} 
                className="block w-full px-4 py-3 rounded-lg bg-[#2B2B2F] border-2 border-[#2B2B2F] text-gray-100 focus:border-[#C8AA6E] focus:ring-2 focus:ring-[#C8AA6E]/30 transition-colors"
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

            {/* Submit button with gold gradient */}
            <button 
              type="submit" 
              disabled={loadingLookup}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#C8AA6E] to-[#9A8352] hover:from-[#D4B678] hover:to-[#A68F5E] disabled:from-gray-600 disabled:to-gray-700 text-[#1A1A1D] font-bold rounded-lg transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-wide"
            >
              {loadingLookup ? (
                <>
                  {/* Simple loading spinner */}
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Looking up...
                </>
              ) : 'Lookup Account'}
            </button>
          </form>

          {/* Icon selection section - appears after lookup */}
          {currentIcon !== null && (
            <div className="mt-8 border-t-2 border-[#2B2B2F] pt-6">
              <div className="bg-[#2B2B2F] border border-[#C8AA6E]/50 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-[#C8AA6E] mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-[#C8AA6E]">Account found! Current icon ID: <strong>{currentIcon}</strong></span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-[#C8AA6E]">Choose Verification Icon</label>
                <p className="text-xs text-gray-400 -mt-2">Select an icon you own, then change it in your League client</p>
                
                {/* Icon picker component - exclude original icon to prevent spoofing */}
                <div className="border-2 border-[#2B2B2F] rounded-lg p-4 bg-[#0B0D12]">
                  <IconPicker 
                    selectedId={selectedIconId ? Number(selectedIconId) : null} 
                    onSelect={(id) => setSelectedIconId(String(id))} 
                    count={29}
                    excludeIds={originalIcon !== null ? [originalIcon] : []}
                  />
                </div>

                {originalIcon !== null && originalIcon >= 0 && originalIcon <= 29 && (
                  <div className="bg-[#C84040]/20 border border-[#C84040] rounded-lg p-3">
                    <p className="text-sm text-[#C84040]">
                      <span className="font-semibold">⚠️ Icon {originalIcon} is excluded</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      This is your current icon - you cannot use it for verification to prevent impersonation
                    </p>
                  </div>
                )}

                {selectedIconId && (
                  <div className="bg-[#2B2B2F] border border-[#C8AA6E]/50 rounded-lg p-3">
                    <p className="text-sm text-[#C8AA6E]">
                      <span className="font-semibold">Selected icon ID:</span> {selectedIconId}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Change your profile icon to this one in the League client, then verify below.
                    </p>
                  </div>
                )}

                {/* Verify button with gold gradient */}
                <button 
                  onClick={handleVerify} 
                  disabled={loadingVerify || !selectedIconId}
                  className="w-full px-6 py-3 bg-gradient-to-r from-[#C8AA6E] to-[#9A8352] hover:from-[#D4B678] hover:to-[#A68F5E] disabled:from-gray-600 disabled:to-gray-700 text-[#1A1A1D] font-bold rounded-lg transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-wide"
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

          {/* Status area - distinct styling for success/error states */}
          {(error || result) && (
            <div className="mt-6">
              {error && (
                <div className="bg-[#C84040]/10 border-2 border-[#C84040] rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-[#C84040] mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-[#C84040]">Error</h3>
                      <p className="text-sm text-gray-300 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {result && result.success && (
                <div className="bg-[#C8AA6E]/10 border-2 border-[#C8AA6E] rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-[#C8AA6E] mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-[#C8AA6E]">Verification Successful!</h3>
                      <p className="text-sm text-gray-300 mt-1">Your Riot account has been verified.</p>
                    </div>
                  </div>
                </div>
              )}

              {result && !result.success && !error && (
                <div className="bg-[#C8AA6E]/10 border-2 border-[#C8AA6E] rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-[#C8AA6E] mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-[#C8AA6E]">Verification Failed</h3>
                      <p className="text-sm text-gray-300 mt-1">Make sure you changed your icon to the selected one.</p>
                      <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Discord placeholder section - dark theme with Discord blue accent */}
        <div className="bg-[#1A1A1D] shadow-2xl rounded-xl p-8 border-2 border-dashed border-[#2B2B2F]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5865F2] rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#C8AA6E] mb-2">Connect Your Discord Account</h2>
            <p className="text-sm text-gray-400 mb-4">Optional: Link your Discord account (Beta)</p>
            <p className="text-xs text-gray-500 mb-6">Coming soon - authenticate with Discord to access community features</p>
            
            {/* Discord button - non-functional placeholder */}
            <button 
              disabled
              className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-lg transition-colors shadow-md inline-flex items-center opacity-50 cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Connect with Discord (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// UI Improvements Applied:
// - Centered layout with gradient background (slate-50 to slate-100)
// - Main card with rounded-xl and shadow-lg for modern look
// - Clear title: "Verify Your League of Legends Account"
// - 3-step instruction section in blue info box
// - Enhanced input styling with focus states and transitions
// - Loading states with animated spinner
// - Distinct success (green), error (red), and warning (yellow) status messages with icons
// - Discord placeholder section with brand colors (#5865F2) and Discord logo
// - Responsive design maintained with Tailwind utilities
// - Clean, simple component structure without complex abstractions
