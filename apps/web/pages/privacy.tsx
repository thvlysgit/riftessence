import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
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
            Privacy Policy
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
              1. Information We Collect
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We collect the following types of information:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Discord Account Information: Username, user ID, avatar, and email when you authenticate</li>
              <li>Riot Account Information: Game name, tag, region, rank, and champion data from Riot Games API</li>
              <li>Profile Information: Bio, roles, champions, language preferences, and other data you provide</li>
              <li>Posts and Content: LFT posts, community posts, comments, and ratings you create</li>
              <li>Usage Data: Pages visited, interactions, and feature usage (if analytics implemented)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              2. How We Use Your Information
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We use your information to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Provide and maintain the platform services</li>
              <li>Authenticate your account and maintain your session</li>
              <li>Display your profile information to other users</li>
              <li>Match you with other players based on your preferences</li>
              <li>Send notifications about platform activity (if enabled)</li>
              <li>Improve the platform and develop new features</li>
              <li>Prevent abuse, spam, and violations of our Terms of Service</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              3. Information Sharing
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>With Other Users: Your profile information and posts are visible to other platform users</li>
              <li>Third-Party Services: Discord for authentication, Riot Games API for game data, Cloudflare for security</li>
              <li>Legal Requirements: When required by law or to protect rights and safety</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              4. Data Security
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We implement security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Password Hashing: Passwords are hashed using bcrypt</li>
              <li>JWT Tokens: Secure authentication tokens with 7-day expiration</li>
              <li>HTTPS: All data transmitted over secure connections</li>
              <li>Input Validation: Protection against common attacks (XSS, SQL injection)</li>
              <li>Rate Limiting: Protection against abuse and brute-force attempts</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              5. Your Rights
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You have the following rights regarding your data:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Access: View your profile and data through your account settings</li>
              <li>Update: Modify your profile information at any time</li>
              <li>Delete: Remove your posts, comments, and other content</li>
              <li>Account Deletion: Request deletion of your account and associated data</li>
              <li>Data Portability: Request a copy of your data</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Contact us to exercise your rights regarding data deletion or portability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              6. Cookies and Tracking
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We use cookies and local storage to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Maintain your login session</li>
              <li>Remember your theme and language preferences</li>
              <li>Store your authentication token</li>
              <li>Improve your experience on the platform</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              For more information, see our{' '}
              <Link href="/cookies" className="underline" style={{ color: 'var(--color-accent-1)' }}>
                Cookie Policy
              </Link>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              7. Data Retention
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We retain your data for the following periods:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Active Accounts: Data retained while your account is active</li>
              <li>Deleted Content: Removed immediately upon deletion request</li>
              <li>Account Deletion: Data deleted within 30 days of account deletion request</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Some data may be retained longer if required by law or for legitimate business purposes (e.g., fraud prevention).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              8. Third-Party Services
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We integrate with the following third-party services:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Discord: For account authentication (OAuth 2.0)</li>
              <li>Riot Games: For League of Legends account verification and game data</li>
              <li>Cloudflare: For security, DDoS protection, and Turnstile bot prevention</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              9. Changes to This Policy
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the platform or updating the &quot;Last Updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              Contact Us
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              If you have questions about this Privacy Policy or how we handle your data, please contact us through our support channels.
            </p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              For information about our terms of service, please see our{' '}
              <Link href="/terms" className="underline" style={{ color: 'var(--color-accent-1)' }}>
                Terms of Service
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
