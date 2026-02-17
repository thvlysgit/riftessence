import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getAuthHeader, getAuthToken, getUserIdFromToken } from '../utils/auth';
import NoAccess from '../components/NoAccess';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type RiotAccount = {
  id: string;
  gameName: string;
  tagLine: string;
  region: string;
};

export default function CreatePostPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [riotAccounts, setRiotAccounts] = useState<RiotAccount[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [preferredRole, setPreferredRole] = useState<string | null>(null);
  const [secondaryRole, setSecondaryRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [form, setForm] = useState({
    postingRiotAccountId: '',
    region: 'EUW',
    role: 'TOP',
    secondRole: '',
    message: '',
    vcPreference: 'SOMETIMES',
    duoType: 'BOTH',
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = getAuthToken();
        const uid = token ? getUserIdFromToken(token) : null;
        if (!uid) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        setIsAuthenticated(true);
        const url = `${API_URL}/api/user/profile`;
        const res = await fetch(url, {
          headers: getAuthHeader()
        });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        setUserId(data.id);
        setUsername(data.username);
        setRiotAccounts(data.riotAccounts || []);
        setLanguages(data.languages || []);
        setPreferredRole(data.preferredRole);
        setSecondaryRole(data.secondaryRole);
        if (data.riotAccounts && data.riotAccounts.length > 0) {
          const mainAcc = data.riotAccounts.find((acc: any) => acc.isMain) || data.riotAccounts[0];
          setForm(prev => ({ 
            ...prev, 
            postingRiotAccountId: mainAcc.id, 
            region: mainAcc.region,
            role: data.preferredRole || 'TOP', // Pre-select preferred role
            secondRole: data.secondaryRole || '' // Pre-select secondary role
          }));
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user session');
      if (!form.postingRiotAccountId) throw new Error('No Riot account selected');
      const finalLanguages = languages.length > 0 ? languages : ['English'];
      const payload: any = { userId, ...form, languages: finalLanguages };
      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post');
      return data;
    }
  });

  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div style={{ color: 'var(--color-text-primary)' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <NoAccess 
            action="create-post" 
            onClose={() => router.push('/feed')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div 
        className="max-w-xl mx-auto border p-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--border-radius)',
        }}
      >
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Create Post</h1>
        <div className="mb-4">
          <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>User</label>
          <input 
            className="w-full p-2"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-muted)',
              borderRadius: 'var(--border-radius)'
            }}
            value={username}
            disabled
          />
        </div>

          <div>
            <label className="block text-sm mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
              <img width="14" height="14" src="https://img.icons8.com/color/48/riot-games.png" alt="riot-games" />
              Riot Account *
            </label>
            {riotAccounts.length === 0 ? (
              <p className="text-sm text-red-400">No linked Riot accounts. Please link an account to post.</p>
            ) : (
              <select 
                className="w-full p-2"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
                value={form.postingRiotAccountId} 
                onChange={e => {
                  const acc = riotAccounts.find(a => a.id === e.target.value);
                  if (acc) {
                    setForm(prev => ({ ...prev, postingRiotAccountId: acc.id, region: acc.region }));
                  }
                }}
              >
                {riotAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.gameName}#{acc.tagLine} ({acc.region})</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Role
              {preferredRole && form.role === preferredRole && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded font-semibold" style={{ 
                  background: 'var(--color-accent-1)', 
                  color: 'var(--color-bg-primary)' 
                }}>
                  ⭐ Your most played
                </span>
              )}
            </label>
            <select 
              className="w-full p-2"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--border-radius)',
                border: preferredRole && form.role === preferredRole ? '2px solid var(--color-accent-1)' : 'none',
              }}
              value={form.role} 
              onChange={e => update('role', e.target.value)}
            >
              {['TOP','JUNGLE','MID','ADC','SUPPORT'].map(r => (
                <option key={r} value={r}>
                  {r}{r === preferredRole ? ' ⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Secondary Role (Optional)
              {secondaryRole && form.secondRole === secondaryRole && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded font-semibold" style={{ 
                  background: 'var(--color-accent-2)', 
                  color: 'var(--color-bg-primary)' 
                }}>
                  ⭐ Your 2nd most played
                </span>
              )}
            </label>
            <select 
              className="w-full p-2"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--border-radius)',
                border: secondaryRole && form.secondRole === secondaryRole ? '2px solid var(--color-accent-2)' : 'none',
              }}
              value={form.secondRole} 
              onChange={e => update('secondRole', e.target.value)}
            >
              <option value="">None</option>
              {['TOP','JUNGLE','MID','ADC','SUPPORT'].map(r => (
                <option key={r} value={r}>
                  {r}{r === secondaryRole ? ' ⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Message</label>
            <textarea 
              className="w-full p-2"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--border-radius)',
              }}
              rows={4} 
              placeholder="Looking for duo..." 
              value={form.message} 
              onChange={e => update('message', e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Languages (from profile)</label>
            <div 
              className="p-2"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-muted)',
                borderRadius: 'var(--border-radius)',
              }}
            >
              {languages.length > 0 ? languages.join(', ') : 'English (default)'}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Voice Chat Preference</label>
            <select 
              className="w-full p-2"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--border-radius)',
              }}
              value={form.vcPreference} 
              onChange={e => update('vcPreference', e.target.value)}
            >
              {['ALWAYS','SOMETIMES','NEVER'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Looking For</label>
            <select 
              className="w-full p-2"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--border-radius)',
              }}
              value={form.duoType} 
              onChange={e => update('duoType', e.target.value)}
            >
              <option value="SHORT_TERM">Short Term Duo</option>
              <option value="LONG_TERM">Long Term Duo</option>
              <option value="BOTH">Both</option>
            </select>
          </div>

          <button
            onClick={() => mutation.mutate()}
            className="px-4 py-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
              color: 'var(--color-bg-primary)',
              borderRadius: 'var(--border-radius)',
            }}
            disabled={mutation.isPending || riotAccounts.length === 0}
          >
            {mutation.isPending ? 'Submitting…' : 'Submit Post'}
          </button>

          {mutation.isError && (
            <p className="text-red-400 text-sm">{(mutation.error as any)?.message || 'Submission failed'}</p>
          )}
          {mutation.isSuccess && (
            <div className="space-y-1">
              <p className="text-green-400 text-sm">Post created! ID: {mutation.data.post.id}</p>
            </div>
          )}
        </div>
      </div>
  );
}

