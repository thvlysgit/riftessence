import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { RiotAuthButton } from '@components/RiotBrand';
import { DiscordIcon } from '../src/components/DiscordBrand';
import { useLanguage } from '../contexts/LanguageContext';

type AccessRequirementType = 'riot-required' | 'account-required' | 'admin-only' | 'discord-required' | 'banned';

interface AccessRequirementModalProps {
  type: AccessRequirementType;
  countdown?: number;
  reason?: string;
  onClose?: () => void;
}

export default function AccessRequirementModal({ type, countdown, reason, onClose }: AccessRequirementModalProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const defaultReasonByType: Record<AccessRequirementType, string> = {
    'account-required': t('access.accountRequired'),
    'riot-required': t('access.riotRequired'),
    'discord-required': t('access.discordRequired'),
    'admin-only': t('access.adminOnly'),
    'banned': t('access.banned'),
  };

  const titleByType: Record<AccessRequirementType, string> = {
    'account-required': t('access.restricted'),
    'riot-required': t('access.restricted'),
    'discord-required': t('access.restricted'),
    'admin-only': t('access.restricted'),
    'banned': t('access.restricted'),
  };

  const handleBack = () => {
    const fallback = '/';
    if (typeof window === 'undefined') {
      router.push(fallback);
      return;
    }

    const remembered = sessionStorage.getItem('riftessence_last_accessible_path');
    if (remembered && remembered !== router.asPath) {
      router.push(remembered);
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallback);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(5, 7, 14, 0.72)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold" style={{ color: type === 'admin-only' || type === 'banned' ? 'var(--color-error)' : 'var(--color-accent-1)' }}>
            {titleByType[type]}
          </h2>
          <button
            type="button"
            onClick={onClose || handleBack}
            className="inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span aria-hidden="true">←</span>
            {t('common.back')}
          </button>
        </div>

        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {reason || defaultReasonByType[type]}
        </p>

        {type === 'admin-only' && (
          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('access.redirecting', { count: countdown ?? 3, plural: (countdown ?? 3) === 1 ? '' : 's' })}
          </p>
        )}

        {type !== 'admin-only' && type !== 'banned' && (
          <div className="mt-5 flex flex-col gap-2">
            {type === 'account-required' && (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg font-semibold text-center"
                  style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
                >
                  {t('access.signIn')}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg border font-semibold text-center"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {t('access.createAccount')}
                </Link>
              </>
            )}

            {type === 'riot-required' && (
              <>
                <RiotAuthButton label={t('access.connectRiot')} />
                <Link
                  href="/profile"
                  className="px-4 py-2 rounded-lg border font-semibold text-center"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {t('access.openProfile')}
                </Link>
              </>
            )}

            {type === 'discord-required' && (
              <>
                <Link
                  href="/profile"
                  className="discord-cta inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  <DiscordIcon className="w-4 h-4" />
                  {t('access.linkDiscordProfile')}
                </Link>
                <Link
                  href="/settings"
                  className="px-4 py-2 rounded-lg border font-semibold text-center"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  {t('access.openSettings')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
