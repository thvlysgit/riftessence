import Head from 'next/head';
import { globalOgImageUrl } from '../utils/ogImage';

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  path?: string;
  keywords?: string;
}

const defaultTitle = 'RiftEssence - The League of Legends Community Platform';
const defaultDescription = 'Find your duo partner, join a team, get free coaching and share matchup knowledge. The all-in-one platform for the LoL community.';
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.riftessence.app';
const defaultOgImage = globalOgImageUrl(baseUrl);
const defaultOgImageAlt = 'RiftEssence - Find better League teammates with duo posts, team rosters, player ratings, and coaching.';
const defaultKeywords = 'League of Legends, LoL, LFD, Looking for Duo, LFT, Looking for Team, Coaching LoL, Matchups LoL, LoL Community';

export default function SEOHead({ 
  title = defaultTitle, 
  description = defaultDescription,
  ogImage: _ogImage = defaultOgImage,
  path = '',
  keywords = defaultKeywords
}: SEOHeadProps) {
  void _ogImage;
  const fullTitle = title === defaultTitle ? title : `${title} | RiftEssence`;
  const url = `${baseUrl}${path}`;
  const ogImage = defaultOgImage;
  
  return (
    <Head>
      {/* Primary Meta Tags */}
      <title key="title">{fullTitle}</title>
      <meta key="meta-title" name="title" content={fullTitle} />
      <meta key="description" name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:site_name" property="og:site_name" content="RiftEssence" />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:title" property="og:title" content={fullTitle} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:image" property="og:image" content={ogImage} />
      <meta key="og:image:secure_url" property="og:image:secure_url" content={ogImage} />
      <meta key="og:image:type" property="og:image:type" content="image/png" />
      <meta key="og:image:alt" property="og:image:alt" content={defaultOgImageAlt} />
      <meta key="og:image:width" property="og:image:width" content="1200" />
      <meta key="og:image:height" property="og:image:height" content="630" />
      
      {/* Twitter */}
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:url" name="twitter:url" content={url} />
      <meta key="twitter:title" name="twitter:title" content={fullTitle} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={ogImage} />
      <meta key="twitter:image:alt" name="twitter:image:alt" content={defaultOgImageAlt} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Head>
  );
}
