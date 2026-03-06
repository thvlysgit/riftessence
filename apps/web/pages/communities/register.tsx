import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken, getUserIdFromToken, getAuthHeader } from '../../utils/auth';
import { useGlobalUI } from '../../components/GlobalUI';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const regions = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish', 'Russian', 'Korean', 'Japanese'];

type Step = 'code' | 'details';

export default function RegisterCommunityPage() {
  const router = useRouter();
  const { showToast } = useGlobalUI();

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'English',
    regions: [] as string[],
    inviteLink: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const token = getAuthToken();
    const userId = token ? getUserIdFromToken(token) : null;
    if (!userId) {
      setError('You must be logged in to register a community');
      return;
    }

    const trimmedCode = code.toUpperCase().trim();
    if (!trimmedCode || trimmedCode.length < 6) {
      setError('Please enter a valid link code');
      return;
    }

    // Move to details step — code will be verified on final submit
    setStep('details');
    setFormData(prev => ({ ...prev, name: '' }));
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const token = getAuthToken();
    const userId = token ? getUserIdFromToken(token) : null;
    if (!userId) {
      setError('You must be logged in to register a community');
      return;
    }

    if (!formData.name || formData.regions.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/communities/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          ...formData,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`Community linked to ${data.guildName || 'your Discord server'}!`, 'success');
        router.push(`/communities/${data.community.id}`);
      } else {
        setError(data.error || 'Failed to verify code');
        showToast(data.error || 'Failed to verify code', 'error');
        // If code-related error, go back to code step
        if (data.error?.includes('code') || data.error?.includes('expired') || data.error?.includes('Invalid link')) {
          setStep('code');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleRegion = (region: string) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region],
    }));
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              background: step === 'code'
                ? 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))'
                : 'var(--color-bg-tertiary)',
              color: step === 'code' ? 'var(--color-bg-primary)' : 'var(--color-text-muted)',
            }}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 'code' ? 'rgba(255,255,255,0.2)' : 'var(--color-border)',
                color: step === 'code' ? '#fff' : 'var(--color-text-muted)',
              }}
            >1</span>
            Link Code
          </div>
          <div style={{ color: 'var(--color-text-muted)' }}>→</div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              background: step === 'details'
                ? 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))'
                : 'var(--color-bg-tertiary)',
              color: step === 'details' ? 'var(--color-bg-primary)' : 'var(--color-text-muted)',
            }}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step === 'details' ? 'rgba(255,255,255,0.2)' : 'var(--color-border)',
                color: step === 'details' ? '#fff' : 'var(--color-text-muted)',
              }}
            >2</span>
            Community Details
          </div>
        </div>

        <div
          className="border p-8"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          {step === 'code' ? (
            <>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-accent-1)' }}>
                Link Your Discord Server
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                Use the <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>/linkserver</span> command in your Discord server to generate a link code.
                You must have <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Administrator</span> permissions on the server.
              </p>

              <form onSubmit={handleCodeSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Link Code *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g., A3K7WX9R"
                    required
                    maxLength={8}
                    className="w-full px-4 py-3 border text-center text-2xl font-mono tracking-widest"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--border-radius)',
                      letterSpacing: '0.25em',
                    }}
                  />
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                    The code expires after 10 minutes. Generate a new one if needed.
                  </p>
                </div>

                {/* How it works */}
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--color-accent-1)' }}>
                    How it works
                  </p>
                  <ol className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <li>1. Invite the RiftEssence bot to your Discord server</li>
                    <li>2. Run <span className="font-mono px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>/linkserver</span> in any channel</li>
                    <li>3. Copy the code and paste it above</li>
                    <li>4. Fill in your community details</li>
                  </ol>
                </div>

                {error && (
                  <div className="p-4 border" style={{ backgroundColor: '#C84040', borderColor: '#C84040', borderRadius: 'var(--border-radius)' }}>
                    <p className="text-sm text-white">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full px-6 py-3 font-bold"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                    borderRadius: 'var(--border-radius)',
                  }}
                >
                  Continue
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-accent-1)' }}>
                  Community Details
                </h1>
                <button
                  onClick={() => setStep('code')}
                  className="text-sm hover:opacity-80"
                  style={{ color: 'var(--color-accent-1)' }}
                >
                  ← Change Code
                </button>
              </div>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Set up your community page on RiftEssence.
              </p>
              <p className="text-xs mb-6 font-mono px-2 py-1 inline-block rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                Code: {code}
              </p>

              <form onSubmit={handleDetailsSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Community Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., EUW Chill Gamers"
                    required
                    className="w-full px-4 py-2 border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell us about your community..."
                    rows={4}
                    className="w-full px-4 py-2 border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Primary Language *
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    required
                    className="w-full px-4 py-2 border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                {/* Regions */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Main Regions * (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {regions.map(region => (
                      <button
                        key={region}
                        type="button"
                        onClick={() => toggleRegion(region)}
                        className="px-3 py-2 text-sm font-medium border transition-colors"
                        style={{
                          backgroundColor: formData.regions.includes(region) ? 'var(--color-accent-1)' : 'var(--color-bg-tertiary)',
                          borderColor: formData.regions.includes(region) ? 'var(--color-accent-1)' : 'var(--color-border)',
                          color: formData.regions.includes(region) ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
                          borderRadius: 'var(--border-radius)',
                        }}
                      >
                        {region}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discord Invite Link */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Discord Invite Link
                  </label>
                  <input
                    type="url"
                    value={formData.inviteLink}
                    onChange={(e) => setFormData({ ...formData, inviteLink: e.target.value })}
                    placeholder="https://discord.gg/..."
                    className="w-full px-4 py-2 border"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Optional: Add a Discord invite so visitors can join your server
                  </p>
                </div>

                {error && (
                  <div className="p-4 border" style={{ backgroundColor: '#C84040', borderColor: '#C84040', borderRadius: 'var(--border-radius)' }}>
                    <p className="text-sm text-white">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                    color: 'var(--color-bg-primary)',
                    borderRadius: 'var(--border-radius)',
                  }}
                >
                  {loading ? 'Linking...' : 'Link & Create Community'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
