// External rating page - allows non-registered users to rate players via shared link
// UX Flow: Enter Riot ID -> Verify icon -> Check shared games -> Submit rating

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import IconPicker from '../../src/components/IconPicker';
import { useLanguage } from '../../contexts/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

type ReceiverProfile = {
  id: string;
  username: string;
  mainAccount: {
    gameName: string;
    tagLine: string;
    region: string;
    rank: string | null;
    division: string | null;
    profileIconId: number | null;
  } | null;
  skillStars: number;
  personalityMoons: number;
  feedbackCount: number;
};

type Step = 'loading' | 'enter_riot_id' | 'verify_icon' | 'verifying_matches' | 'submit_rating' | 'success' | 'error';

export default function RateUserPage(): JSX.Element {
  const router = useRouter();
  const { username } = router.query;
  const { t } = useLanguage();

  // State
  const [step, setStep] = useState<Step>('loading');
  const [receiver, setReceiver] = useState<ReceiverProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Riot ID state
  const [riotId, setRiotId] = useState('');
  const [region, setRegion] = useState('EUW');

  // Icon verification state
  const [currentIcon, setCurrentIcon] = useState<number | null>(null);
  const [selectedIconId, setSelectedIconId] = useState<number | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  // Rating state
  const [raterToken, setRaterToken] = useState<string | null>(null);
  const [sharedMatchesCount, setSharedMatchesCount] = useState(0);
  const [stars, setStars] = useState(0);
  const [moons, setMoons] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load receiver profile
  useEffect(() => {
    if (!username || typeof username !== 'string') return;

    const fetchReceiver = async () => {
      try {
        const res = await fetch(`${API_URL}/api/rate/${encodeURIComponent(username)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('User not found');
            setStep('error');
            return;
          }
          throw new Error('Failed to fetch user');
        }
        const data = await res.json();
        setReceiver(data.user);
        setStep('enter_riot_id');
      } catch (err: any) {
        setError(err?.message || 'Failed to load user profile');
        setStep('error');
      }
    };

    fetchReceiver();
  }, [username]);

  function isValidRiotId(id: string): boolean {
    const trimmed = id.trim();
    if (!trimmed.includes('#')) return false;
    const [name, tag] = trimmed.split('#');
    return Boolean(name) && Boolean(tag);
  }

  function sanitizeRiotId(id: string): string {
    return id
      .trim()
      .replace(/[\u200B-\u200D\u2060\uFEFF\u202A-\u202E\u2066-\u2069\u00AD]/g, '')
      .normalize('NFKC');
  }

  async function handleLookup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    if (!riotId.trim()) {
      setError('Riot ID is required');
      return;
    }
    if (!isValidRiotId(riotId)) {
      setError('Please enter a valid Riot ID (e.g., Example#TAG)');
      return;
    }

    setLoadingLookup(true);
    try {
      const lookupName = sanitizeRiotId(riotId);
      const res = await fetch(`${API_URL}/api/rate/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summonerName: lookupName, region }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || `Lookup failed: ${res.status}`);
        return;
      }

      setCurrentIcon(data.profileIconId);
      setStep('verify_icon');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoadingLookup(false);
    }
  }

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    if (selectedIconId === null) {
      setError('Please select a verification icon');
      return;
    }

    setLoadingVerify(true);
    setStep('verifying_matches');

    try {
      const verifyName = sanitizeRiotId(riotId);
      const res = await fetch(`${API_URL}/api/rate/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summonerName: verifyName,
          region,
          verificationIconId: selectedIconId,
          receiverUsername: username,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || `Verification failed: ${res.status}`);
        setStep('verify_icon');
        return;
      }

      setRaterToken(data.raterToken);
      setSharedMatchesCount(data.sharedMatchesCount);
      setStep('submit_rating');
    } catch (err: any) {
      setError(err?.message || String(err));
      setStep('verify_icon');
    } finally {
      setLoadingVerify(false);
    }
  }

  async function handleSubmitRating(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (stars < 1 || moons < 1) {
      setError('Please rate both skill and personality (minimum 1)');
      return;
    }

    if (!raterToken || !receiver) {
      setError('Session expired. Please verify again.');
      setStep('enter_riot_id');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/rate/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raterToken,
          receiverId: receiver.id,
          stars,
          moons,
          comment,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || `Submission failed: ${res.status}`);
        return;
      }

      setStep('success');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Render helper for profile header
  function renderReceiverHeader() {
    if (!receiver) return null;

    const iconUrl = receiver.mainAccount?.profileIconId
      ? `https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${receiver.mainAccount.profileIconId}.png`
      : null;

    return (
      <div className="rounded-lg p-6 mb-6" style={{ background: 'var(--bg-elevated)', border: '2px solid var(--border-card)' }}>
        <div className="flex items-center gap-4">
          {iconUrl && (
            <img
              src={iconUrl}
              alt="Profile icon"
              className="w-16 h-16 rounded-lg"
              style={{ border: '2px solid var(--accent-primary)' }}
            />
          )}
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
              {receiver.username}
            </h2>
            {receiver.mainAccount && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {receiver.mainAccount.gameName}#{receiver.mainAccount.tagLine} ({receiver.mainAccount.region})
              </p>
            )}
            {receiver.mainAccount?.rank && (
              <p className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                {receiver.mainAccount.rank} {receiver.mainAccount.division}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)' }}>Skill:</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className="w-5 h-5" fill={i <= receiver.skillStars ? 'var(--accent-primary)' : 'var(--text-muted)'} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({receiver.feedbackCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)' }}>Personality:</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className="w-5 h-5" fill={i <= receiver.personalityMoons ? 'var(--accent-primary)' : 'var(--text-muted)'} viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render step content
  function renderStepContent() {
    switch (step) {
      case 'loading':
        return (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8" style={{ color: 'var(--accent-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        );

      case 'enter_riot_id':
        return (
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent-primary)' }}>How it works:</h3>
              <ol className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><span className="font-bold" style={{ color: 'var(--accent-primary)' }}>1.</span> Enter your Riot ID</li>
                <li><span className="font-bold" style={{ color: 'var(--accent-primary)' }}>2.</span> Verify by changing your profile icon briefly</li>
                <li><span className="font-bold" style={{ color: 'var(--accent-primary)' }}>3.</span> Rate the player (must have shared games)</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--accent-primary)' }}>Your Riot ID</label>
              <input
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                className="block w-full px-4 py-3 rounded-lg"
                style={{ background: 'var(--bg-input)', border: '2px solid var(--border-card)', color: 'var(--text-main)' }}
                placeholder="GameName#TAG"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--accent-primary)' }}>Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="block w-full px-4 py-3 rounded-lg"
                style={{ background: 'var(--bg-input)', border: '2px solid var(--border-card)', color: 'var(--text-main)' }}
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
              ) : 'Continue'}
            </button>
          </form>
        );

      case 'verify_icon':
        return (
          <div className="space-y-4">
            <div className="rounded-lg p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-semibold mr-4" style={{ color: 'var(--accent-primary)' }}>Your current icon:</span>
                  {currentIcon !== null && (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${currentIcon}.png`}
                      alt={`Icon ${currentIcon}`}
                      className="w-10 h-10 rounded-md"
                      style={{ boxShadow: 'var(--shadow-md)' }}
                    />
                  )}
                </div>
                <button
                  onClick={handleLookup}
                  disabled={loadingLookup}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
                  title="Refresh to check if icon changed"
                >
                  <svg className={`w-4 h-4 ${loadingLookup ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Note: Riot's servers may take 1-2 minutes to update after changing your icon. Use Refresh to check.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--accent-primary)' }}>
                Choose a verification icon
              </label>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Change your profile icon to one of these in your League client, then click Verify.
              </p>
              <div className="rounded-lg p-4" style={{ border: '2px solid var(--border-card)', background: 'var(--bg-main)' }}>
                <IconPicker
                  selectedId={selectedIconId}
                  onSelect={(id) => setSelectedIconId(id)}
                  count={29}
                  excludeIds={currentIcon !== null ? [currentIcon] : []}
                />
              </div>
            </div>

            {selectedIconId !== null && (
              <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
                <p className="text-sm" style={{ color: 'var(--accent-primary)' }}>
                  <span className="font-semibold">Selected icon ID:</span> {selectedIconId}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Change to this icon in your League client, then click Verify.
                </p>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loadingVerify || selectedIconId === null}
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
              ) : 'Verify & Check Shared Games'}
            </button>

            <button
              onClick={() => setStep('enter_riot_id')}
              className="w-full px-4 py-2 text-sm rounded-lg"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            >
              Back
            </button>
          </div>
        );

      case 'verifying_matches':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="animate-spin h-10 w-10 mb-4" style={{ color: 'var(--accent-primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>Verifying identity...</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Checking match history for shared games</p>
          </div>
        );

      case 'submit_rating':
        return (
          <form onSubmit={handleSubmitRating} className="space-y-4">
            <div className="rounded-lg p-4" style={{ background: 'var(--accent-primary-bg)', border: '1px solid var(--accent-primary)' }}>
              <p className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                Verified! Found {sharedMatchesCount} shared game{sharedMatchesCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Skill Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button type="button" key={i} onClick={() => setStars(i)} className="p-1 transition-transform hover:scale-110">
                    <svg className="w-8 h-8" fill={i <= stars ? 'var(--accent-primary)' : 'var(--text-muted)'} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Personality Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button type="button" key={i} onClick={() => setMoons(i)} className="p-1 transition-transform hover:scale-110">
                    <svg className="w-8 h-8" fill={i <= moons ? 'var(--accent-primary)' : 'var(--text-muted)'} viewBox="0 0 24 24">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Comment (optional)
              </label>
              <textarea
                className="w-full rounded-lg p-3"
                style={{ background: 'var(--bg-input)', border: '2px solid var(--border-card)', color: 'var(--text-main)' }}
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience playing with this player..."
                maxLength={300}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{comment.length}/300</p>
            </div>

            <button
              type="submit"
              disabled={submitting || stars < 1 || moons < 1}
              className="w-full px-6 py-3 font-bold rounded-lg transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-wide"
              style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : 'Submit Rating'}
            </button>
          </form>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-primary-bg)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>Rating Submitted!</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Thank you for rating {receiver?.username}. Your feedback helps the community.
            </p>
            <div className="space-y-3">
              <a
                href="/register"
                className="block w-full px-6 py-3 font-bold rounded-lg text-center transition-all"
                style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}
              >
                Create Your Own Rating Page
              </a>
              <button
                onClick={() => window.close()}
                className="block w-full px-4 py-2 rounded-lg"
                style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
              >
                Close
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-danger-bg)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--accent-danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--accent-danger)' }}>Error</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 font-bold rounded-lg"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            >
              Go Home
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <>
      <Head>
        <title>{receiver ? `Rate ${receiver.username}` : 'Rate Player'} | RiftEssence</title>
        <meta name="description" content={receiver ? `Rate ${receiver.username} on RiftEssence` : 'Rate a League of Legends player'} />
      </Head>

      <div className="min-h-screen flex items-center justify-center py-8 px-4" style={{ background: 'var(--bg-main)' }}>
        <div className="max-w-lg w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>Rate a Player</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Share your experience with players you've met in-game
            </p>
          </div>

          {/* Receiver profile header */}
          {receiver && step !== 'loading' && step !== 'error' && renderReceiverHeader()}

          {/* Main card */}
          <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
            {/* Progress bar */}
            {step !== 'loading' && step !== 'error' && step !== 'success' && (
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  <span className={step === 'enter_riot_id' ? 'font-bold' : ''} style={{ color: step === 'enter_riot_id' ? 'var(--accent-primary)' : undefined }}>1. Enter ID</span>
                  <span className={step === 'verify_icon' || step === 'verifying_matches' ? 'font-bold' : ''} style={{ color: step === 'verify_icon' || step === 'verifying_matches' ? 'var(--accent-primary)' : undefined }}>2. Verify</span>
                  <span className={step === 'submit_rating' ? 'font-bold' : ''} style={{ color: step === 'submit_rating' ? 'var(--accent-primary)' : undefined }}>3. Rate</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: 'var(--bg-input)' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      background: 'var(--accent-primary)',
                      width: step === 'enter_riot_id' ? '33%' : step === 'verify_icon' || step === 'verifying_matches' ? '66%' : '100%',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error display */}
            {error && step !== 'error' && (
              <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--accent-danger-bg)', border: '2px solid var(--accent-danger)' }}>
                <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
              </div>
            )}

            {/* Step content */}
            {renderStepContent()}
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Powered by <a href="/" className="underline" style={{ color: 'var(--accent-primary)' }}>RiftEssence</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
