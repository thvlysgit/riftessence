import React, { useState } from 'react';
import { useGlobalUI } from './GlobalUI';
import { useLanguage } from '../contexts/LanguageContext';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { showToast } = useGlobalUI();
  const { t } = useLanguage();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!bugDescription.trim()) {
      showToast(t('bug.pleaseDescribe'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const pageUrl = typeof window !== 'undefined' ? window.location.href : 'Unknown';
      const response = await fetch(`${API_URL}/api/bug-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          description: bugDescription,
          pageUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit bug report');
      }

      showToast(t('bug.submitSuccess'), 'success');
      setBugDescription('');
      setIsOpen(false);
    } catch {
      showToast(t('bug.submitError'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes bugPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200, 170, 110, 0.4), 0 2px 8px rgba(0,0,0,0.2); }
          50% { box-shadow: 0 0 0 8px rgba(200, 170, 110, 0), 0 2px 12px rgba(0,0,0,0.3); }
        }
        @keyframes tooltipFade {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div style={{ position: 'fixed', bottom: '24px', right: '88px', zIndex: 999 }}>
        <div
          style={{
            position: 'absolute',
            right: '56px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-main) 100%)',
            border: '1px solid var(--accent-primary)',
            borderRadius: '8px',
            padding: '8px 14px',
            whiteSpace: 'nowrap',
            color: 'var(--accent-primary)',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 0 20px rgba(200, 170, 110, 0.15)',
            opacity: isHovered ? 1 : 0,
            pointerEvents: 'none',
            animation: isHovered ? 'tooltipFade 0.25s ease-out' : 'none',
          }}
        >
          {t('bug.reportBug')}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isHovered
              ? 'linear-gradient(135deg, var(--accent-primary-bg) 0%, rgba(200, 170, 110, 0.2) 100%)'
              : 'var(--accent-primary-bg)',
            border: '2px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: isHovered
              ? '0 0 20px rgba(200, 170, 110, 0.5), 0 4px 16px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: isHovered ? 'scale(1.15)' : 'scale(1)',
            opacity: isHovered ? 1 : 0.8,
            animation: isHovered ? 'bugPulse 1.5s ease-in-out infinite' : 'none',
          }}
          aria-label={t('bug.reportBug')}
        >
          !
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
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
            onClick={(event) => event.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              {t('bug.reportButton')}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Describe what went wrong and we will look into it.
            </p>

            <form onSubmit={handleSubmit}>
              <textarea
                value={bugDescription}
                onChange={(event) => setBugDescription(event.target.value)}
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
                    fontWeight: 500,
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
                    fontWeight: 500,
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
