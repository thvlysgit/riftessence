import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';

export default function TermsOfServicePage() {
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
            {t('terms.title')}
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
            {t('terms.intro')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section1Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section1Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section1Item1')}</li>
              <li>{t('terms.section1Item2')}</li>
              <li>{t('terms.section1Item3')}</li>
              <li>{t('terms.section1Item4')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section2Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section2Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section2Item1')}</li>
              <li>{t('terms.section2Item2')}</li>
              <li>{t('terms.section2Item3')}</li>
              <li>{t('terms.section2Item4')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section3Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section3Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section3Item1')}</li>
              <li>{t('terms.section3Item2')}</li>
              <li>{t('terms.section3Item3')}</li>
              <li>{t('terms.section3Item4')}</li>
              <li>{t('terms.section3Item5')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section4Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section4Description')}
            </p>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section4Note')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section4Item1')}</li>
              <li>{t('terms.section4Item2')}</li>
              <li>{t('terms.section4Item3')}</li>
              <li>{t('terms.section4Item4')}</li>
              <li>{t('terms.section4Item5')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section5Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section5Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section5Item1')}</li>
              <li>{t('terms.section5Item2')}</li>
              <li>{t('terms.section5Item3')}</li>
              <li>{t('terms.section5Item4')}</li>
              <li>{t('terms.section5Item5')}</li>
              <li>{t('terms.section5Item6')}</li>
              <li>{t('terms.section5Item7')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section6Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section6Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section6Item1')}</li>
              <li>{t('terms.section6Item2')}</li>
              <li>{t('terms.section6Item3')}</li>
              <li>{t('terms.section6Item4')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section7Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section7Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section7Item1')}</li>
              <li>{t('terms.section7Item2')}</li>
              <li>{t('terms.section7Item3')}</li>
              <li>{t('terms.section7Item4')}</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('terms.section7Note')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section8Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section8Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section8Item1')}</li>
              <li>{t('terms.section8Item2')}</li>
              <li>{t('terms.section8Item3')}</li>
              <li>{t('terms.section8Item4')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section9Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section9Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section9Item1')}</li>
              <li>{t('terms.section9Item2')}</li>
              <li>{t('terms.section9Item3')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('terms.section10Title')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section10Description')}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>{t('terms.section10Item1')}</li>
              <li>{t('terms.section10Item2')}</li>
              <li>{t('terms.section10Item3')}</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('terms.section10Note')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              {t('legal.contactUs')}
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section11Description1')}
            </p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {t('terms.section11Description2')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
