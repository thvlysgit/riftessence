import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Critical: Apply theme BEFORE any rendering to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const themes = {
                    'classic': {
                      bgPrimary: '#0B0D12',
                      bgSecondary: '#1A1A1D',
                      bgTertiary: '#2B2B2F',
                      textPrimary: '#FFFFFF',
                      textSecondary: '#E5E5E5',
                      textMuted: '#9CA3AF',
                      accent1: '#C8AA6E',
                      accent2: '#9A8352',
                      accent3: '#D4B678',
                      border: '#2B2B2F',
                      borderHover: '#C8AA6E',
                      success: '#22c55e',
                      error: '#ef4444',
                      warning: '#f59e0b',
                      borderRadius: '0.75rem',
                      shadow: '0 6px 10px -2px rgb(0 0 0 / 0.18), 0 3px 6px -2px rgb(0 0 0 / 0.12)',
                      borderWidth: '1px',
                    },
                    'arcane-pastel': {
                      bgPrimary: '#FAFAFF',
                      bgSecondary: '#F5F0FF',
                      bgTertiary: '#EDE4FF',
                      textPrimary: '#2D2D3A',
                      textSecondary: '#4A4A5E',
                      textMuted: '#7D7D8F',
                      accent1: '#C6A7FF',
                      accent2: '#FFB3D6',
                      accent3: '#8EFFC1',
                      border: '#DACCFB',
                      borderHover: '#C6A7FF',
                      success: '#8EFFC1',
                      error: '#FFB3D6',
                      warning: '#FFCE9E',
                      borderRadius: '1rem',
                      shadow: '0 4px 12px rgba(198, 167, 255, 0.12)',
                      borderWidth: '2px',
                    },
                    'nightshade': {
                      bgPrimary: '#0A0A0F',
                      bgSecondary: '#14141F',
                      bgTertiary: '#1E1E2E',
                      textPrimary: '#E8E8F0',
                      textSecondary: '#B8B8D0',
                      textMuted: '#7D7D9F',
                      accent1: '#8B5CF6',
                      accent2: '#A78BFA',
                      accent3: '#C4B5FD',
                      border: '#2E2E4E',
                      borderHover: '#8B5CF6',
                      success: '#10b981',
                      error: '#f43f5e',
                      warning: '#f59e0b',
                      borderRadius: '0.5rem',
                      shadow: '0 8px 16px rgba(139, 92, 246, 0.15)',
                      borderWidth: '1px',
                    },
                    'infernal-ember': {
                      bgPrimary: '#120808',
                      bgSecondary: '#1F0F0F',
                      bgTertiary: '#2D1616',
                      textPrimary: '#FFE5CC',
                      textSecondary: '#FFCCAA',
                      textMuted: '#CC9977',
                      accent1: '#FF6B35',
                      accent2: '#FF8C42',
                      accent3: '#FFB347',
                      border: '#3D2626',
                      borderHover: '#FF6B35',
                      success: '#22c55e',
                      error: '#FF4444',
                      warning: '#FF8C42',
                      borderRadius: '0.375rem',
                      shadow: '0 6px 20px rgba(255, 107, 53, 0.25)',
                      borderWidth: '2px',
                    },
                    'radiant-light': {
                      bgPrimary: '#FFFFFF',
                      bgSecondary: '#F8F9FA',
                      bgTertiary: '#E9ECEF',
                      textPrimary: '#212529',
                      textSecondary: '#495057',
                      textMuted: '#6C757D',
                      accent1: '#FFD700',
                      accent2: '#FFA500',
                      accent3: '#FFB347',
                      border: '#DEE2E6',
                      borderHover: '#FFD700',
                      success: '#28a745',
                      error: '#dc3545',
                      warning: '#ffc107',
                      borderRadius: '0.5rem',
                      shadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      borderWidth: '1px',
                    },
                  };
                  
                  const savedTheme = localStorage.getItem('lfd_theme') || 'classic';
                  const theme = themes[savedTheme] || themes.classic;
                  const root = document.documentElement;
                  
                  root.style.setProperty('--color-bg-primary', theme.bgPrimary);
                  root.style.setProperty('--color-bg-secondary', theme.bgSecondary);
                  root.style.setProperty('--color-bg-tertiary', theme.bgTertiary);
                  root.style.setProperty('--color-text-primary', theme.textPrimary);
                  root.style.setProperty('--color-text-secondary', theme.textSecondary);
                  root.style.setProperty('--color-text-muted', theme.textMuted);
                  root.style.setProperty('--color-accent-1', theme.accent1);
                  root.style.setProperty('--color-accent-2', theme.accent2);
                  root.style.setProperty('--color-accent-3', theme.accent3);
                  root.style.setProperty('--color-border', theme.border);
                  root.style.setProperty('--color-border-hover', theme.borderHover);
                  root.style.setProperty('--color-success', theme.success);
                  root.style.setProperty('--color-error', theme.error);
                  root.style.setProperty('--color-warning', theme.warning);
                  root.style.setProperty('--border-radius', theme.borderRadius);
                  root.style.setProperty('--shadow', theme.shadow);
                  root.style.setProperty('--border-width', theme.borderWidth);
                  
                  // Derived variables
                  root.style.setProperty('--bg-card', theme.bgSecondary);
                  root.style.setProperty('--border-card', theme.border);
                  root.style.setProperty('--text-main', theme.textPrimary);
                  root.style.setProperty('--text-secondary', theme.textSecondary);
                  root.style.setProperty('--text-muted', theme.textMuted);
                  
                  // Mark as loaded
                  root.setAttribute('data-theme', savedTheme);
                } catch (e) {
                  console.error('[Theme] Failed to apply initial theme:', e);
                }
              })();
            `,
          }}
        />
        
        {/* Open Graph Meta Tags for Discord/Social Media Embeds */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://qpnpc65t-3000.uks1.devtunnels.ms/" />
        <meta property="og:title" content="RiftEssence - Plateforme Communautaire League of Legends" />
        <meta property="og:description" content="Trouvez votre duo, rejoignez une équipe, obtenez du coaching gratuit et partagez vos connaissances sur les matchups. La plateforme tout-en-un pour la communauté LoL francophone." />
        <meta property="og:image" content="https://qpnpc65t-3000.uks1.devtunnels.ms/assets/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="RiftEssence" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="RiftEssence - Plateforme Communautaire League of Legends" />
        <meta name="twitter:description" content="Trouvez votre duo, rejoignez une équipe, obtenez du coaching gratuit et partagez vos connaissances sur les matchups. La plateforme tout-en-un pour la communauté LoL francophone." />
        <meta name="twitter:image" content="https://qpnpc65t-3000.uks1.devtunnels.ms/assets/og-image.png" />
      </Head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0B0D12' }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
