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
            Last Updated: March 29, 2026
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
              <li>Discord Account Information: Username, user ID, avatar, and email when you authenticate via Discord OAuth</li>
              <li>Riot Games Account Information (via Riot Sign-On): When you authenticate using RSO, we collect your PUUID (Player Universal Unique Identifier), summoner name, tagline, region, account verification status, and associated game data</li>
              <li>Riot Games Data (via API): Rank, division, LP, match history, champion statistics, profile icon, and other publicly available game data from Riot Games</li>
              <li>Authentication Tokens: Secure OAuth tokens from Discord and Riot Games to maintain your authenticated session</li>
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
              <li>Authenticate your account via Discord OAuth or Riot Sign-On and maintain your session</li>
              <li>Verify your Riot Games account ownership and link it to your profile</li>
              <li>Retrieve and display your League of Legends game statistics, rank, match history, and champion data</li>
              <li>Display your profile information to other users</li>
              <li>Match you with other players based on your preferences and game data</li>
              <li>Send notifications about platform activity (if enabled)</li>
              <li>Forward in-app chat messages to your Discord account via Direct Messages, if you have opted in to this feature</li>
              <li>Improve the platform and develop new features</li>
              <li>Prevent abuse, spam, and violations of our Terms of Service</li>
              <li>Comply with legal obligations and Riot Games&apos; Developer Terms of Service</li>
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
              <li>Third-Party Services: Discord for authentication, Riot Games for authentication and game data via RSO and Riot API, Cloudflare for security</li>
              <li>Riot Games: We access your Riot Games data through their official API and RSO in accordance with their Developer Terms of Service. We do not share your data with Riot Games beyond what is required for authentication</li>
              <li>Discord DM Notifications: linked Discord accounts receive chat previews, team event updates, and announcements by default via the RiftEssence bot. You can disable this at any time from your settings</li>
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
              <li>Encrypted Storage: OAuth tokens from Discord and Riot Games are stored securely</li>
              <li>Password Hashing: Passwords are hashed using bcrypt</li>
              <li>JWT Tokens: Secure authentication tokens with 7-day expiration</li>
              <li>HTTPS: All data transmitted over secure connections (TLS/SSL)</li>
              <li>API Security: Riot Games API keys and credentials are stored securely and never exposed to clients</li>
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
              <li>Unlink Accounts: Disconnect your Discord or Riot Games account from your profile at any time</li>
              <li>Revoke Access: Revoke RiftEssence&apos;s access to your Discord or Riot Games account through their respective security settings</li>
              <li>Account Deletion: Request deletion of your account and associated data. When you delete your account, we delete all stored Riot Games data and Discord data within 30 days</li>
              <li>Data Portability: Request a copy of your data</li>
              <li>Opt-Out: Disable Discord DM notifications and other optional features at any time from your account settings</li>
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
              <li>Riot Games Data: We refresh your game statistics periodically from Riot&apos;s API. Cached data is automatically updated or expires according to Riot&apos;s policies</li>
              <li>OAuth Tokens: Discord and Riot Games authentication tokens are retained until you revoke access or delete your account</li>
              <li>Deleted Content: Removed immediately upon deletion request</li>
              <li>Account Deletion: All data, including Riot Games and Discord data, deleted within 30 days of account deletion request</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Some data may be retained longer if required by law or for legitimate business purposes (e.g., fraud prevention). We comply with Riot Games&apos; data retention policies for any data obtained through their services.
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
              <li>Discord: For account authentication (OAuth 2.0) and optional chat message DM notifications</li>
              <li>Riot Games Sign-On (RSO): For secure Riot Games account authentication via OAuth 2.0. When you use RSO, you authorize us to access your account information as permitted by Riot Games</li>
              <li>Riot Games API: For League of Legends account verification, match history, champion statistics, and other publicly available game data</li>
              <li>Cloudflare: For security, DDoS protection, and Turnstile bot prevention</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Each third-party service has its own Terms of Service and Privacy Policy. We recommend reviewing:
            </p>
            <ul className="list-disc pl-6 mt-2 text-sm space-y-1" style={{ color: 'var(--color-text-muted)' }}>
              <li>Riot Games Terms of Service and Privacy Notice</li>
              <li>Discord Terms of Service and Privacy Policy</li>
              <li>Cloudflare Privacy Policy</li>
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
