import React from 'react';
import Link from 'next/link';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function CookiePolicyPage() {
  const { currentTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 text-sm hover:underline"
            style={{ color: 'var(--color-accent-1)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('legal.backToHome')}
          </Link>
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {t('cookies.title')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('legal.lastUpdated').replace('{date}', 'January 13, 2026')}
          </p>
        </div>

        {/* Content */}
        <div
          className="prose prose-invert max-w-none rounded-xl p-8"
          style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
        >
          <p className="mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            {t('cookies.intro')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('cookies.section1Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('cookies.section1Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('cookies.section1Item1')}</li>
              <li>{t('cookies.section1Item2')}</li>
              <li>{t('cookies.section1Item3')}</li>
              <li>{t('cookies.section1Item4')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('cookies.section2Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('cookies.section2Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('cookies.section2Item1')}</li>
              <li>{t('cookies.section2Item2')}</li>
              <li>{t('cookies.section2Item3')}</li>
              <li>{t('cookies.section2Item4')}</li>
              <li>{t('cookies.section2Item5')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('cookies.section3Title')}
            </h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('cookies.section3Subtitle1')}
              </h3>
              <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('cookies.section3Description1')}
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                <li>{t('cookies.section3Item1a')}</li>
                <li>{t('cookies.section3Item1b')}</li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('cookies.section3Subtitle2')}
              </h3>
              <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {t('cookies.section3Description2')}
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                <li>{t('cookies.section3Item2a')}</li>
                <li>{t('cookies.section3Item2b')}</li>
                <li>{t('cookies.section3Item2c')}</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('cookies.section4Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('cookies.section4Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('cookies.section4Item1')}</li>
              <li>{t('cookies.section4Item2')}</li>
              <li>{t('cookies.section4Item3')}</li>
              <li>{t('cookies.section4Item4')}</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('cookies.section4Note')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('cookies.section5Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('cookies.section5Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('cookies.section5Item1')}</li>
              <li>{t('cookies.section5Item2')}</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('cookies.section5Note')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('cookies.section6Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('cookies.section6Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('cookies.section6Item1')}</li>
              <li>{t('cookies.section6Item2')}</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('cookies.section6Note')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('cookies.section7Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('cookies.section7Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('cookies.section7Item1')}</li>
              <li>{t('cookies.section7Item2')}</li>
              <li>{t('cookies.section7Item3')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('cookies.section8Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('cookies.section8Description')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('legal.contactUs')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('cookies.section9Description1')}
            </p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {t('cookies.section9Description2')}{' '}
              <Link href="/privacy" className="underline" style={{ color: 'var(--color-accent-1)' }}>
                {t('privacy.title')}
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
