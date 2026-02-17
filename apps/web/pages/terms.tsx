import React from 'react';
import Link from 'next/link';

export default function TermsOfServicePage() {
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
            Terms of Service
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
              1. Acceptance of Terms
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              By accessing or using RiftEssence, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>You must be at least 13 years old to use this platform</li>
              <li>You agree to use the platform in accordance with all applicable laws</li>
              <li>You accept responsibility for all activity under your account</li>
              <li>You agree to these Terms and our Privacy Policy</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              2. Account Registration
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              To use certain features, you must create an account:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>You must authenticate using a valid Discord account</li>
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              3. User Conduct
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You agree not to engage in the following prohibited activities:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Harassment, bullying, or threatening other users</li>
              <li>Posting obscene, offensive, or illegal content</li>
              <li>Spamming or flooding the platform with excessive content</li>
              <li>Impersonating other users or providing false information</li>
              <li>Attempting to hack, exploit, or disrupt the platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              4. Content Ownership and License
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You retain ownership of content you post on RiftEssence. However, by posting content, you grant us a license to use, display, and distribute your content on the platform.
            </p>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You represent and warrant that:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>You own or have the necessary rights to the content you post</li>
              <li>Your content does not violate any laws or third-party rights</li>
              <li>Your content does not infringe on intellectual property rights</li>
              <li>You grant us a worldwide, non-exclusive license to use your content</li>
              <li>We may remove content that violates these terms at our discretion</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              5. Prohibited Content
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              The following types of content are strictly prohibited:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Hate speech, discrimination, or content promoting violence</li>
              <li>Sexually explicit or pornographic content</li>
              <li>Content that harasses, threatens, or bullies others</li>
              <li>Spam, advertisements, or unsolicited promotions</li>
              <li>Content that infringes on intellectual property rights</li>
              <li>Malicious code, viruses, or attempts to compromise security</li>
              <li>Content that violates privacy or discloses personal information without consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              6. Moderation and Enforcement
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              We reserve the right to moderate content and enforce these Terms:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>We may remove content that violates these Terms without notice</li>
              <li>We may suspend or terminate accounts for violations</li>
              <li>Users can report content using the reporting system</li>
              <li>Admins review reports and take appropriate action</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              7. Intellectual Property
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              RiftEssence and its original content are protected by intellectual property laws:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Our platform, code, and design are protected by copyright</li>
              <li>You may not copy, modify, or distribute our platform without permission</li>
              <li>League of Legends content is owned by Riot Games, Inc.</li>
              <li>Discord integration is subject to Discord&apos;s terms and policies</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              RiftEssence is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              8. Third-Party Services
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              RiftEssence integrates with third-party services:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>Discord for authentication</li>
              <li>Riot Games API for League of Legends data</li>
              <li>Cloudflare for security and bot protection</li>
              <li>These services have their own terms and privacy policies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              9. Disclaimer of Warranties
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              RiftEssence is provided &quot;as is&quot; without warranties of any kind:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>We do not guarantee continuous, uninterrupted access to the platform</li>
              <li>We are not responsible for the accuracy of user-generated content</li>
              <li>We do not guarantee matches or successful connections with other players</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              10. Limitation of Liability
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              To the fullest extent permitted by law:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>We are not responsible for user conduct or interactions</li>
              <li>You use the platform at your own risk</li>
            </ul>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Some jurisdictions do not allow certain liability limitations, so some of these limitations may not apply to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>
              Contact Us
            </h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              If you have questions about these Terms of Service, please contact us through our support channels.
            </p>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              For information about how we handle your data, please see our{' '}
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
