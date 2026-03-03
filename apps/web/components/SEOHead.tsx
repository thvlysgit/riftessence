import Head from 'next/head';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  path?: string;
  keywords?: string;
}

const defaultTitle = 'RiftEssence - The League of Legends Community Platform';
const defaultDescription = 'Find your duo partner, join a team, get free coaching and share matchup knowledge. The all-in-one platform for the LoL community.';
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://riftessence.app';
const defaultOgImage = `${baseUrl}/assets/og-image.png`;
const defaultKeywords = 'League of Legends, LoL, LFD, Looking for Duo, LFT, Looking for Team, Coaching LoL, Matchups LoL, LoL Community';

export default function SEOHead({ 
  title = defaultTitle, 
  description = defaultDescription,
  ogImage = defaultOgImage,
  path = '',
  keywords = defaultKeywords
}: SEOHeadProps) {
  const fullTitle = title === defaultTitle ? title : `${title} | RiftEssence`;
  const url = `${baseUrl}${path}`;
  
  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Head>
  );
}
