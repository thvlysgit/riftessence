import React, { useState } from 'react';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const regions = ['NA', 'EUW', 'EUNE', 'KR', 'JP', 'OCE', 'LAN', 'LAS', 'BR', 'RU'];
const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish', 'Russian', 'Korean', 'Japanese'];

export default function RegisterCommunityPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'English',
    regions: [] as string[],
    inviteLink: '',
    discordServerId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const userId = localStorage.getItem('lfd_userId');
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
      const res = await fetch(`${API_URL}/api/communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/communities/${data.community.id}`);
      } else {
        setError(data.error || 'Failed to create community');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
        <div
          className="border p-8"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-accent-1)' }}>
            Register Community
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Create a community page for your Discord server or gaming group
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                Optional: Add a Discord invite so users can join your server
              </p>
            </div>

            {/* Discord Server ID */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Discord Server ID (Guild ID)
              </label>
              <input
                type="text"
                value={formData.discordServerId}
                onChange={(e) => setFormData({ ...formData, discordServerId: e.target.value })}
                placeholder="123456789012345678"
                className="w-full px-4 py-2 border"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Required for Discord bot integration. Enable Developer Mode in Discord, right-click your server, and copy ID.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 border" style={{ backgroundColor: '#C84040', borderColor: '#C84040', borderRadius: 'var(--border-radius)' }}>
                <p className="text-sm text-white">{error}</p>
              </div>
            )}

            {/* Submit */}
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
              {loading ? 'Creating...' : 'Create Community'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
