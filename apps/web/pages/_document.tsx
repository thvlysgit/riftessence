import { Html, Head, Main, NextScript } from 'next/document';
import { DEFAULT_THEME_NAME, THEME_CSS_VARIABLES } from '../utils/themeRegistry';

const THEME_BOOTSTRAP_SCRIPT = `
  (function() {
    try {
      var themes = ${JSON.stringify(THEME_CSS_VARIABLES)};
      var fallbackTheme = ${JSON.stringify(DEFAULT_THEME_NAME)};
      var savedTheme = localStorage.getItem('lfd_theme');
      var themeName = savedTheme && themes[savedTheme] ? savedTheme : fallbackTheme;
      var root = document.documentElement;
      var variables = themes[themeName];

      Object.keys(variables).forEach(function(variableName) {
        root.style.setProperty(variableName, variables[variableName]);
      });

      root.setAttribute('data-theme', themeName);

      var themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta && variables['--color-accent-1']) {
        themeColorMeta.setAttribute('content', variables['--color-accent-1']);
      }
    } catch (error) {
      console.error('[Theme] Failed to apply initial theme:', error);
    }
  })();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#C8AA6E" />
        {/* Critical: Apply theme BEFORE any rendering to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOTSTRAP_SCRIPT,
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
