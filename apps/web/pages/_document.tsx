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
        {/* Critical: Apply theme before rendering to prevent flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOTSTRAP_SCRIPT,
          }}
        />
      </Head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0B0D12' }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
