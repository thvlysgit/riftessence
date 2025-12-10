import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type RiotAccount = {
  id: string;
  gameName: string;
  tagLine: string;
  region: string;
};

export default function CreatePostPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [riotAccounts, setRiotAccounts] = useState<RiotAccount[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [preferredRole, setPreferredRole] = useState<string | null>(null);
  const [form, setForm] = useState({
    postingRiotAccountId: '',
    region: 'EUW',
    role: 'TOP',
    message: '',
    vcPreference: 'SOMETIMES',
    duoType: 'BOTH',
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        let uid: string | null = null;
        try { uid = localStorage.getItem('lfd_userId'); } catch {}
        if (!uid) return;
        const url = `${API_URL}/api/user/profile?userId=${encodeURIComponent(uid)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setUserId(data.id);
        setUsername(data.username);
        setRiotAccounts(data.riotAccounts || []);
        setLanguages(data.languages || []);
        setPreferredRole(data.preferredRole);
        if (data.riotAccounts && data.riotAccounts.length > 0) {
          const mainAcc = data.riotAccounts.find((acc: any) => acc.isMain) || data.riotAccounts[0];
          setForm(prev => ({ 
            ...prev, 
            postingRiotAccountId: mainAcc.id, 
            region: mainAcc.region,
            role: data.preferredRole || 'TOP' // Pre-select preferred role
          }));
        }
      } catch {}
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post');
      return data;
    }
  });

  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

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
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Riot Account *</label>
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

