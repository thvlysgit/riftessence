import React, { useState } from 'react';
import { useGlobalUI } from './GlobalUI';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

// TODO: TEMPORARY COMPONENT - Remove after bug reporting period ends
// Discord webhook for bug reports - now uses environment variable for security
const DISCORD_WEBHOOK_URL = process.env.NEXT_PUBLIC_DISCORD_BUG_WEBHOOK || '';

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useGlobalUI();
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugDescription.trim()) {
      showToast(t('bug.pleaseDescribe'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown';
      const currentUrl = typeof window !== 'undefined' ? window.location.href : 'Unknown';

      // Fetch additional user details if authenticated
      let userDetails = null;
      if (user) {
        try {
          const res = await fetch(`${API_URL}/api/user/profile`, {
            headers: getAuthHeader(),
          });
          if (res.ok) {
            userDetails = await res.json();
          }
        } catch (err) {
          // Silently fail - we'll just include basic user info
          console.error('Failed to fetch user details:', err);
        }
      }

      // Build user info field
      const userInfoParts = [];
      if (user) {
        userInfoParts.push(`**Username:** ${user.username}`);
        
        if (userDetails?.riotAccounts && userDetails.riotAccounts.length > 0) {
          const mainAccount = userDetails.riotAccounts.find((acc: any) => acc.isMain) || userDetails.riotAccounts[0];
          const riotId = mainAccount.gameName && mainAccount.tagLine 
            ? `${mainAccount.gameName}#${mainAccount.tagLine}`
            : mainAccount.summonerName;
          userInfoParts.push(`**Riot ID:** ${riotId} (${mainAccount.region})`);
        }
        
        if (userDetails?.discordAccount?.username) {
          const discordTag = userDetails.discordAccount.discriminator 
            ? `${userDetails.discordAccount.username}#${userDetails.discordAccount.discriminator}`
            : userDetails.discordAccount.username;
          userInfoParts.push(`**Discord:** ${discordTag}`);
        }
      } else {
        userInfoParts.push('*Not logged in*');
      }

      const fields = [
        {
          name: '👤 User',
          value: userInfoParts.join('\n'),
          inline: false
        },
        {
          name: '📍 Page',
          value: currentUrl,
          inline: false
        },
        {
          name: '🕒 Time',
          value: timestamp,
          inline: true
        },
        {
          name: '🖥️ User Agent',
          value: userAgent.substring(0, 200),
          inline: false
        }
      ];

      const message = {
        content: null,
        embeds: [{
          title: '🐛 Bug Report',
          description: bugDescription,
          color: 15158332, // Red color
          fields: fields,
          timestamp: timestamp
        }]
      };

      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error('Failed to submit bug report');
      }

      showToast(t('bug.submitSuccess'), 'success');
      setBugDescription('');
      setIsOpen(false);
    } catch (error) {
      showToast(t('bug.submitError'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button - Discreet but discoverable */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '88px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--accent-primary-bg)',
          border: '1px solid var(--accent-primary)',
          color: 'var(--accent-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          zIndex: 999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s, opacity 0.2s',
          opacity: 0.7,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title={t('bug.reportBug')}
        aria-label={t('bug.reportBug')}
      >
        🐛
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  marginBottom: '8px',
                }}
              >
                {t('bug.reportButton')}
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                }}
              >
                Describe what went wrong and we'll look into it!
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <textarea
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                placeholder={t('bug.descriptionPlaceholder')}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  resize: 'vertical',
                  marginBottom: '16px',
                }}
                disabled={isSubmitting}
                autoFocus
              />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-card)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--accent-primary)',
                    background: 'var(--accent-primary-bg)',
                    color: 'var(--accent-primary)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
