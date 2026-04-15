import React, { useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export type Ad = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  targetUrl: string;
  targetRegions: string[];
  targetMinRank: string | null;
  targetMaxRank: string | null;
  targetFeeds: string[];
  priority: number;
};

interface AdSpotProps {
  ad: Ad;
  feed: 'duo' | 'lft';
  userId?: string | null;
  onDismiss?: (adId: string) => void;
}

export function AdSpot({ ad, feed, userId, onDismiss }: AdSpotProps) {
  const impressionTracked = useRef(false);

  useEffect(() => {
    // Track impression once when component mounts
    if (!impressionTracked.current) {
      impressionTracked.current = true;
      fetch(`${API_URL}/api/ads/impression`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.id, feed, userId }),
      }).catch(err => console.error('Failed to track impression:', err));
    }
  }, [ad.id, feed, userId]);

  const handleClick = () => {
    // Track click
    fetch(`${API_URL}/api/ads/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId: ad.id, feed, userId }),
    }).catch(err => console.error('Failed to track click:', err));
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(ad.id);
    }
  };

  return (
    <div className="relative">
      <a
        href={ad.targetUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block border rounded-xl overflow-hidden transition-all hover:shadow-lg"
        style={{
          background: 'linear-gradient(135deg, var(--color-bg-secondary), var(--color-bg-tertiary))',
          borderColor: 'var(--color-accent-1)',
          borderWidth: '2px',
        }}
      >
        <div className="relative">
          {/* Sponsored badge */}
          <div 
            className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-semibold"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'var(--color-text-muted)',
            }}
          >
            Sponsored
          </div>
          
          {/* Ad image */}
          <div className="w-full flex items-center justify-center">
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full h-auto"
            />
          </div>
        </div>
        
        <div className="p-4">
          <h3 
            className="text-lg font-bold mb-1"
            style={{ color: 'var(--color-accent-1)' }}
          >
            {ad.title}
          </h3>
          {ad.description && (
            <p 
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {ad.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span 
              className="text-xs font-medium"
              style={{ color: 'var(--color-accent-2)' }}
            >
              Learn More →
            </span>
          </div>
        </div>
      </a>
      
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full transition-all hover:scale-110"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'var(--color-text-muted)',
          }}
          title="Dismiss ad"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Helper hook to fetch ads and settings
export function useAds(feed: 'duo' | 'lft') {
  const [ads, setAds] = React.useState<Ad[]>([]);
  const [frequency, setFrequency] = React.useState<number>(5);
  const [loaded, setLoaded] = React.useState(false);

  useEffect(() => {
    async function fetchAdsData() {
      try {
        const [adsRes, settingsRes] = await Promise.all([
          fetch(`${API_URL}/api/ads?feed=${feed}`),
          fetch(`${API_URL}/api/ads/settings`),
        ]);

        if (adsRes.ok) {
          const adsData = await adsRes.json();
          setAds(adsData.ads || []);
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const freq = feed === 'duo' 
            ? settingsData.duoFeedAdFrequency 
            : settingsData.lftFeedAdFrequency;
          setFrequency(freq || 5);
        }
      } catch (err) {
        console.error('Failed to fetch ads:', err);
      } finally {
        setLoaded(true);
      }
    }

    fetchAdsData();
  }, [feed]);

  return { ads, frequency, loaded };
}

// Helper to get ad for a specific position in the feed
export function getAdForPosition(
  ads: Ad[],
  position: number,
  frequency: number,
  userRegion?: string,
  userRank?: string,
  dismissedAdIds?: string[]
): Ad | null {
  if (ads.length === 0 || frequency <= 0) return null;
  
  // Check if this position should show an ad
  // Position 0 is first post, position 4 would be 5th post (index 4)
  // If frequency is 5, show ad after posts 4, 9, 14, etc. (every 5th)
  if ((position + 1) % frequency !== 0) return null;

  // Filter ads by targeting and dismissed status
  let eligibleAds = ads;

  // Filter out dismissed ads
  if (dismissedAdIds && dismissedAdIds.length > 0) {
    eligibleAds = eligibleAds.filter(ad => !dismissedAdIds.includes(ad.id));
  }

  // Filter by region targeting (if ad specifies regions and user has region)
  if (userRegion) {
    eligibleAds = eligibleAds.filter(ad => 
      ad.targetRegions.length === 0 || ad.targetRegions.includes(userRegion)
    );
  }

  // For simplicity, we rotate through eligible ads based on position
  if (eligibleAds.length === 0) return null;
  
  const adIndex = Math.floor(position / frequency) % eligibleAds.length;
  return eligibleAds[adIndex];
}
