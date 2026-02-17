// Footer component for RiftEssence
// Built with Next.js, TypeScript, and Tailwind CSS
// Styled to match the theme system

import React from 'react';
import Link from 'next/link';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { currentTheme } = useTheme();
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="border-t mt-auto"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
                }}
              >
                <span className="font-bold text-sm" style={{ color: 'var(--color-bg-primary)' }}>
                  LFD
                </span>
              </div>
              <span className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                RiftEssence
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {t('footer.tagline')}
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {t('footer.legal')}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t('footer.termsOfService')}
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t('footer.cookiePolicy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Additional Info */}
          <div>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {t('footer.about')}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {t('footer.disclaimer')}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className="mt-8 pt-8 border-t text-center text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <p>{t('footer.copyright').replace('{year}', currentYear.toString())}</p>
        </div>
      </div>
    </footer>
  );
}
