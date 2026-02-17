import Head from 'next/head';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  path?: string;
}

const defaultTitle = 'RiftEssence - Plateforme Communautaire League of Legends';
const defaultDescription = 'Trouvez votre duo, rejoignez une équipe, obtenez du coaching gratuit et partagez vos connaissances sur les matchups. La plateforme tout-en-un pour la communauté LoL francophone.';
const baseUrl = 'https://qpnpc65t-3000.uks1.devtunnels.ms';
const defaultOgImage = `${baseUrl}/assets/og-image.png`;

export default function SEOHead({ 
  title = defaultTitle, 
  description = defaultDescription,
  ogImage = defaultOgImage,
  path = ''
}: SEOHeadProps) {
  const fullTitle = title === defaultTitle ? title : `${title} | RiftEssence`;
  const url = `${baseUrl}${path}`;
  
  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
}
