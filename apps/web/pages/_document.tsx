import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document';
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

type RiftDocumentProps = DocumentInitialProps & {
  nonce?: string;
};

export default class RiftDocument extends Document<RiftDocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<RiftDocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);
    const rawNonce = ctx.req?.headers['x-nonce'];
    const nonce = Array.isArray(rawNonce) ? rawNonce[0] : rawNonce;
    return { ...initialProps, nonce };
  }

  render() {
    const { nonce } = this.props;

    return (
      <Html lang="en">
        <Head nonce={nonce}>
          <meta name="theme-color" content="#C8AA6E" />
          {/* Critical: Apply theme before rendering to prevent flash. */}
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: THEME_BOOTSTRAP_SCRIPT,
            }}
          />
        </Head>
        <body style={{ margin: 0, padding: 0, backgroundColor: '#0B0D12' }}>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}
