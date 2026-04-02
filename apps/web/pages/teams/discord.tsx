import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SEOHead from '../../../api/components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken } from '../../utils/auth';
import NoAccess from '../../../api/components/NoAccess';

interface Team {
  id: string;
  name: string;
  tag: string | null;
  isOwner: boolean;
  myRole: string;
}

interface DiscordSettings {
  webhookUrl: string | null;
  notifyEvents: boolean;
  notifyMembers: boolean;
  webhookValid?: boolean;
  channelName?: string;
  guildName?: string;
}

const DiscordSettingsPage: React.FC = () => {
  const _router = useRouter();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [settings, setSettings] = useState<DiscordSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch teams user owns
  useEffect(() => {
    const fetchTeams = async () => {
      const token = getAuthToken();
      if (!token) return;
      
      try {
        const res = await fetch(`${apiUrl}/api/teams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Only show teams user owns (can manage Discord settings)
          const ownedTeams = data.filter((t: Team) => t.isOwner);
          setTeams(ownedTeams);
          if (ownedTeams.length === 1) {
            setSelectedTeamId(ownedTeams[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, [apiUrl]);

  // Fetch Discord settings when team is selected
  useEffect(() => {
    const fetchSettings = async () => {
      if (!selectedTeamId) {
        setSettings(null);
        return;
      }
      
      const token = getAuthToken();
      if (!token) return;
      
      try {
        const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/discord`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setWebhookUrl(data.webhookUrl || '');
          setNotifyEvents(data.notifyEvents ?? true);
          setNotifyMembers(data.notifyMembers ?? false);
        }
      } catch (err) {
        console.error('Failed to fetch Discord settings:', err);
      }
    };
    
    fetchSettings();
  }, [selectedTeamId, apiUrl]);

  const handleSave = async () => {
    if (!selectedTeamId) return;
    
    const token = getAuthToken();
    if (!token) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/discord`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim() || null,
          notifyEvents,
          notifyMembers
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to save settings');
        return;
      }
      
      setSettings(data);
      setSuccess('Discord settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedTeamId || !webhookUrl.trim()) return;
    
    const token = getAuthToken();
    if (!token) return;
    
    setTesting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/discord/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Test failed');
        return;
      }
      
      setSuccess('Test message sent! Check your Discord channel.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Failed to send test message');
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveWebhook = async () => {
    if (!selectedTeamId) return;
    
    const token = getAuthToken();
    if (!token) return;
    
    if (!confirm('Are you sure you want to remove the Discord webhook? Notifications will stop.')) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`${apiUrl}/api/teams/${selectedTeamId}/discord`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setSettings(null);
        setWebhookUrl('');
        setNotifyEvents(true);
        setNotifyMembers(false);
        setSuccess('Webhook removed');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to remove webhook');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto">
          <NoAccess action="view" showButtons={true} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: '#5865F2', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <>
        <SEOHead
          title="Discord Settings"
          description="Configure Discord notifications for your team"
          path="/teams/discord"
        />
        <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <div className="max-w-2xl mx-auto">
            <Link href="/teams/dashboard" className="inline-flex items-center gap-2 mb-6 text-sm hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            
            <div className="text-center py-12 border rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <svg className="w-16 h-16 mx-auto mb-4" style={{ color: '#5865F2' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>No Teams Owned</h2>
              <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                You need to own a team to configure Discord notifications.
              </p>
              <Link 
                href="/teams/dashboard" 
                className="inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-lg"
                style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
              >
                Create a Team
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <>
      <SEOHead
        title="Discord Settings"
        description="Configure Discord notifications for your team"
        path="/teams/discord"
      />
      <div className="min-h-screen py-10 px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <Link href="/teams/dashboard" className="inline-flex items-center gap-2 mb-4 text-sm hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(88, 101, 242, 0.15)' }}>
                <svg className="w-8 h-8" style={{ color: '#5865F2' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Discord Notifications</h1>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Send schedule updates to your Discord server
                </p>
              </div>
            </div>
          </div>

          {/* Team Selector (if multiple teams) */}
          {teams.length > 1 && (
            <div className="border rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Select Team
              </label>
              <div className="flex flex-wrap gap-2">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedTeamId === team.id ? 'ring-2 ring-offset-2 ring-[#5865F2]' : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: selectedTeamId === team.id ? '#5865F2' : 'var(--color-bg-tertiary)',
                      color: selectedTeamId === team.id ? '#fff' : 'var(--color-text-primary)',
                    }}
                  >
                    {team.tag ? `[${team.tag}] ` : ''}{team.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTeamId && (
            <>
              {/* Status Messages */}
              {error && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}
              {success && (
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#22C55E' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {success}
                  </div>
                </div>
              )}

              {/* Webhook Configuration */}
              <div className="border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Webhook Configuration
                </h2>

                {/* Instructions */}
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  <h3 className="text-sm font-medium mb-2" style={{ color: '#5865F2' }}>
                    How to set up a Discord Webhook:
                  </h3>
                  <ol className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <li>1. Open Discord and go to your server settings</li>
                    <li>2. Navigate to <strong>Integrations</strong> → <strong>Webhooks</strong></li>
                    <li>3. Click <strong>New Webhook</strong> and select the channel</li>
                    <li>4. Copy the webhook URL and paste it below</li>
                  </ol>
                </div>

                {/* Webhook URL Input */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-4 py-3 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2]"
                      style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    {settings?.webhookValid === true && settings?.channelName && (
                      <p className="mt-2 text-sm flex items-center gap-2" style={{ color: '#22C55E' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Connected to #{settings.channelName} in {settings.guildName}
                      </p>
                    )}
                    {settings?.webhookValid === false && (
                      <p className="mt-2 text-sm flex items-center gap-2" style={{ color: '#EF4444' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Invalid or expired webhook URL
                      </p>
                    )}
                  </div>

                  {/* Notification Options */}
                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      What to notify:
                    </h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={notifyEvents}
                            onChange={e => setNotifyEvents(e.target.checked)}
                            className="sr-only"
                          />
                          <div 
                            className={`w-10 h-6 rounded-full transition-colors ${notifyEvents ? 'bg-[#5865F2]' : 'bg-gray-600'}`}
                          >
                            <div 
                              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${notifyEvents ? 'translate-x-4' : ''}`}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            Schedule Events
                          </span>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            Scrims, practices, tournaments, VOD reviews, meetings
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={notifyMembers}
                            onChange={e => setNotifyMembers(e.target.checked)}
                            className="sr-only"
                          />
                          <div 
                            className={`w-10 h-6 rounded-full transition-colors ${notifyMembers ? 'bg-[#5865F2]' : 'bg-gray-600'}`}
                          >
                            <div 
                              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${notifyMembers ? 'translate-x-4' : ''}`}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            Roster Changes
                          </span>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            New members joining, role changes
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-6 py-3 font-semibold rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                      style={{
                        background: '#5865F2',
                        color: '#fff'
                      }}
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Saving...
                        </span>
                      ) : 'Save Settings'}
                    </button>
                    
                    <button
                      onClick={handleTest}
                      disabled={testing || !webhookUrl.trim()}
                      className="px-6 py-3 font-semibold rounded-lg border transition-all hover:opacity-80 disabled:opacity-50"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: 'rgba(88, 101, 242, 0.5)',
                        color: '#5865F2'
                      }}
                    >
                      {testing ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Testing...
                        </span>
                      ) : '🧪 Send Test'}
                    </button>

                    {settings?.webhookUrl && (
                      <button
                        onClick={handleRemoveWebhook}
                        disabled={saving}
                        className="px-6 py-3 font-semibold rounded-lg border transition-all hover:opacity-80 disabled:opacity-50"
                        style={{
                          backgroundColor: 'transparent',
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                          color: '#EF4444'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded-xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Notification Preview
                </h2>
                
                {/* Discord-style embed preview */}
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#36393f' }}>
                  <div className="p-4 flex items-start gap-4">
                    {/* Bot avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))' }}>
                      <span className="text-white font-bold text-sm">RE</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Bot name and timestamp */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">RiftEssence</span>
                        <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: '#5865F2' }}>BOT</span>
                        <span className="text-xs" style={{ color: '#a3a6aa' }}>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      {/* Mention */}
                      <div className="mb-2">
                        <span className="text-sm px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(88, 101, 242, 0.3)', color: '#dee0fc' }}>@everyone</span>
                      </div>
                      
                      {/* Embed */}
                      <div className="rounded overflow-hidden flex" style={{ backgroundColor: '#2f3136' }}>
                        {/* Left accent bar */}
                        <div className="w-1" style={{ backgroundColor: '#22C55E' }} />
                        
                        <div className="p-3 flex-1">
                          {/* Embed title */}
                          <div className="font-semibold mb-2" style={{ color: '#00b0f4' }}>
                            📅 New Event: Practice Session
                          </div>
                          
                          {/* Embed fields */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <div style={{ color: '#a3a6aa' }}>Type</div>
                              <div style={{ color: '#dcddde' }}>Practice</div>
                            </div>
                            <div>
                              <div style={{ color: '#a3a6aa' }}>When</div>
                              <div style={{ color: '#dcddde' }}>Tomorrow, 7:00 PM</div>
                            </div>
                            <div>
                              <div style={{ color: '#a3a6aa' }}>Duration</div>
                              <div style={{ color: '#dcddde' }}>2 hours</div>
                            </div>
                            <div>
                              <div style={{ color: '#a3a6aa' }}>Created by</div>
                              <div style={{ color: '#dcddde' }}>{user?.username || 'You'}</div>
                            </div>
                          </div>
                          
                          {/* Footer */}
                          <div className="mt-3 pt-2 border-t flex items-center gap-2 text-xs" style={{ borderColor: '#40444b', color: '#a3a6aa' }}>
                            <span>{selectedTeam?.name || 'Your Team'}</span>
                            <span>•</span>
                            <span>RiftEssence Team Manager</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="mt-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  This is how notifications will appear in your Discord channel.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DiscordSettingsPage;
