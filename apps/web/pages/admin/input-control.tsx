import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalUI } from '@components/GlobalUI';
import { Checkbox } from '@components/Checkbox';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type RuleKind = 'WORD' | 'PHRASE' | 'PREFIX' | 'REGEX';

type InputControlRule = {
  id: string;
  label: string;
  kind: RuleKind;
  pattern: string;
  reason: string | null;
  blockMessage: string | null;
  surfaces: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type SurfaceOption = {
  key: string;
  label: string;
};

type RuleForm = {
  label: string;
  kind: RuleKind;
  pattern: string;
  reason: string;
  blockMessage: string;
  surfaces: string[];
  enabled: boolean;
};

const emptyForm: RuleForm = {
  label: '',
  kind: 'PHRASE',
  pattern: '',
  reason: '',
  blockMessage: 'This content is not allowed by the current input rules.',
  surfaces: ['GLOBAL'],
  enabled: true,
};

export default function InputControlAdmin() {
  const { user, loading } = useAuth();
  const { showToast } = useGlobalUI();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [rules, setRules] = useState<InputControlRule[]>([]);
  const [surfaceOptions, setSurfaceOptions] = useState<SurfaceOption[]>([]);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/');
      return;
    }

    async function checkAdminAndLoad() {
      try {
        if (!user?.id) {
          setIsAdmin(false);
          router.push('/404');
          return;
        }

        const res = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(user.id)}`, {
          headers: getAuthHeader(),
        });
        const body = await res.json();
        if (!body?.isAdmin) {
          setIsAdmin(false);
          router.push('/404');
          return;
        }

        setIsAdmin(true);
        await fetchRules();
      } catch (err) {
        console.error(err);
        setIsAdmin(false);
        router.push('/404');
      }
    }

    checkAdminAndLoad();
  }, [user, loading, router]);

  async function fetchRules() {
    setLoadingData(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/input-control/rules`, {
        headers: getAuthHeader(),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to load rules');
      setRules(body.rules || []);
      setSurfaceOptions(body.surfaces || []);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to load input control rules', 'error');
    } finally {
      setLoadingData(false);
    }
  }

  function updateForm<K extends keyof RuleForm>(key: K, value: RuleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function beginEdit(rule: InputControlRule) {
    setEditingId(rule.id);
    setForm({
      label: rule.label,
      kind: rule.kind,
      pattern: rule.pattern,
      reason: rule.reason || '',
      blockMessage: rule.blockMessage || '',
      surfaces: rule.surfaces?.length ? rule.surfaces : ['GLOBAL'],
      enabled: rule.enabled,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveRule(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        surfaces: form.surfaces.length > 0 ? form.surfaces : ['GLOBAL'],
        reason: form.reason.trim() || null,
        blockMessage: form.blockMessage.trim() || null,
      };
      const url = editingId
        ? `${API_URL}/api/admin/input-control/rules/${encodeURIComponent(editingId)}`
        : `${API_URL}/api/admin/input-control/rules`;
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to save rule');

      showToast(editingId ? 'Input rule updated' : 'Input rule created', 'success');
      resetForm();
      await fetchRules();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to save input rule', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: InputControlRule) {
    try {
      const res = await fetch(`${API_URL}/api/admin/input-control/rules/${encodeURIComponent(rule.id)}`, {
        method: 'PATCH',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to update rule');

      showToast(!rule.enabled ? 'Rule enabled' : 'Rule disabled', 'success');
      await fetchRules();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to update rule', 'error');
    }
  }

  async function deleteRule(rule: InputControlRule) {
    if (!window.confirm(`Delete "${rule.label}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/input-control/rules/${encodeURIComponent(rule.id)}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to delete rule');

      showToast('Input rule deleted', 'success');
      if (editingId === rule.id) resetForm();
      await fetchRules();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to delete rule', 'error');
    }
  }

  if (loading || isAdmin === null || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-accent-1)' }}></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const selectedSurfaces = new Set(form.surfaces);

  return (
    <>
      <Head>
        <title>Input Control Admin</title>
      </Head>

      <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, var(--color-bg-primary), var(--color-bg-secondary), var(--color-bg-primary))' }}>
        <div className="border-b" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Input Control</h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>Block unsafe text before it can be saved anywhere user input is accepted.</p>
            </div>
            <Link href="/admin" className="px-4 py-2 rounded-lg shrink-0" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}>
              Back to Admin
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard label="Rules" value={rules.length} />
            <SummaryCard label="Enabled" value={enabledCount} />
            <SummaryCard label="Coverage" value="Global + targeted" />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
            <form onSubmit={saveRule} className="border rounded-xl p-5 space-y-4 h-fit" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{editingId ? 'Edit Rule' : 'New Rule'}</h2>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Word and phrase rules are case-insensitive.</p>
              </div>

              <Field label="Label">
                <input
                  value={form.label}
                  onChange={(event) => updateForm('label', event.target.value)}
                  className="w-full p-2 rounded"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                  required
                />
              </Field>

              <Field label="Kind">
                <select
                  value={form.kind}
                  onChange={(event) => updateForm('kind', event.target.value as RuleKind)}
                  className="w-full p-2 rounded"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                >
                  <option value="WORD">Word</option>
                  <option value="PHRASE">Phrase</option>
                  <option value="PREFIX">Prefix</option>
                  <option value="REGEX">Regex</option>
                </select>
              </Field>

              <Field label="Pattern">
                <input
                  value={form.pattern}
                  onChange={(event) => updateForm('pattern', event.target.value)}
                  className="w-full p-2 rounded"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                  placeholder={form.kind === 'PREFIX' ? 'discord.gg/' : 'blocked text'}
                  required
                />
              </Field>

              <Field label="Reason">
                <input
                  value={form.reason}
                  onChange={(event) => updateForm('reason', event.target.value)}
                  className="w-full p-2 rounded"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                  placeholder="Slur, advertising, spam"
                />
              </Field>

              <Field label="User Message">
                <textarea
                  value={form.blockMessage}
                  onChange={(event) => updateForm('blockMessage', event.target.value)}
                  className="w-full p-2 rounded"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                  rows={3}
                />
              </Field>

              <Field label="Surfaces">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {surfaceOptions.map((surface) => (
                    <Checkbox
                      key={surface.key}
                      className="flex items-center gap-2 text-sm p-2 rounded"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                      size="sm"
                      checked={selectedSurfaces.has(surface.key)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setForm((current) => {
                          const next = new Set(current.surfaces);
                          if (checked) {
                            if (surface.key === 'GLOBAL') {
                              next.clear();
                            } else {
                              next.delete('GLOBAL');
                            }
                            next.add(surface.key);
                          } else {
                            next.delete(surface.key);
                          }
                          const surfaces = Array.from(next);
                          return { ...current, surfaces: surfaces.length > 0 ? surfaces : ['GLOBAL'] };
                        });
                      }}
                    >
                      {surface.label}
                    </Checkbox>
                  ))}
                </div>
              </Field>

              <Checkbox
                checked={form.enabled}
                onChange={(event) => updateForm('enabled', event.target.checked)}
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Enabled
              </Checkbox>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded font-semibold disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
                >
                  {saving ? 'Saving...' : editingId ? 'Save Rule' : 'Create Rule'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <section className="border rounded-xl p-5" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Rules</h2>
                <button
                  onClick={fetchRules}
                  className="px-3 py-1 rounded text-sm"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                >
                  Refresh
                </button>
              </div>

              {rules.length ? (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{rule.label}</span>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>{rule.kind}</span>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: rule.enabled ? 'var(--color-success)' : 'var(--color-bg-tertiary)', color: rule.enabled ? 'var(--color-bg-primary)' : 'var(--color-text-muted)' }}>
                              {rule.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <code className="block mt-2 text-sm break-all" style={{ color: 'var(--color-accent-1)' }}>{rule.pattern}</code>
                          <div className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {rule.reason || 'No reason set.'}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(rule.surfaces || []).map((surface) => (
                              <span key={surface} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                                {surfaceOptions.find((option) => option.key === surface)?.label || surface}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            Updated {new Date(rule.updatedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <button
                            onClick={() => toggleRule(rule)}
                            className="px-3 py-1 rounded text-sm"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                          >
                            {rule.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => beginEdit(rule)}
                            className="px-3 py-1 rounded text-sm"
                            style={{ backgroundColor: 'var(--color-accent-1)', color: 'var(--color-bg-primary)' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRule(rule)}
                            className="px-3 py-1 rounded text-sm"
                            style={{ backgroundColor: 'var(--color-error)', color: 'var(--color-text-primary)' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No input rules configured.</div>
              )}
            </section>
          </section>
        </div>
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}
