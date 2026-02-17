import React from 'react';
import Link from 'next/link';

export default function CookiePolicyPage() {
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
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Cookie Policy
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Last Updated: January 13, 2026
          </p>
        </div>

        {/* Content */}
        <div
          className="prose prose-invert max-w-none rounded-xl p-8"
          style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
        >
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              1. What Are Cookies
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              2. How We Use Cookies
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We use cookies for the following purposes:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Essential Cookies: Required for the platform to function properly, including authentication and session management</li>
              <li>Preference Cookies: Remember your settings and preferences (e.g., theme selection)</li>
              <li>Analytics Cookies: Help us understand how users interact with our platform (if implemented)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              3. Types of Cookies We Use
            </h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Session Cookies
              </h3>
              <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                These are temporary cookies that expire when you close your browser. We use them to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                <li>Maintain your login session</li>
                <li>Remember your actions during a browsing session</li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Persistent Cookies
              </h3>
              <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                These cookies remain on your device for a set period. We use them to:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                <li>Remember your login status</li>
                <li>Save your theme preferences</li>
                <li>Improve your experience on future visits</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              4. Local Storage
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              In addition to cookies, we use browser local storage to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Store your JWT authentication token</li>
              <li>Cache your user preferences</li>
              <li>Save your theme selection</li>
              <li>Maintain application state between sessions</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Local storage data persists until you clear your browser data or log out.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              5. Third-Party Cookies
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We use the following third-party services that may set cookies:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Cloudflare Turnstile: For bot protection and spam prevention</li>
              <li>Discord OAuth: When you authenticate using Discord</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              These third-party services have their own privacy policies and cookie policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              6. Managing Cookies
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You can control and manage cookies in several ways:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Browser Settings: Most browsers allow you to refuse or delete cookies. Check your browser&apos;s help documentation for instructions.</li>
              <li>Opt-Out: You can disable non-essential cookies through your browser settings.</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Please note that disabling essential cookies may affect your ability to use certain features of our platform, including logging in and maintaining your session.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              7. Cookie Retention
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Different cookies have different retention periods:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Session cookies: Deleted when you close your browser</li>
              <li>Authentication tokens: Typically expire after 7 days</li>
              <li>Preference cookies: Persist until you clear them or change your preferences</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              8. Updates to This Policy
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              Contact Us
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              If you have questions about our use of cookies, please contact us through our support channels.
            </p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              For more information about how we handle your personal data, please see our{' '}
              <Link href="/privacy" className="underline" style={{ color: 'var(--color-accent-1)' }}>
                Privacy Policy
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
