import React, { useEffect, useState } from 'react';

type IconPickerProps = {
  onSelect: (id: number) => void;
  selectedId?: number | null;
  // how many icons to show (0..n-1)
  count?: number;
  // icon IDs to exclude (e.g., current icon to prevent spoofing)
  excludeIds?: number[];
};

export default function IconPicker({ onSelect, selectedId = null, count = 29, excludeIds = [] }: IconPickerProps) {
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // Fetch Data Dragon versions to get a CDN version for images
    fetch('https://ddragon.leagueoflegends.com/api/versions.json')
      .then((r) => r.json())
      .then((v: string[]) => {
        if (!mounted) return;
        if (Array.isArray(v) && v.length > 0) setVersion(v[0]);
      })
      .catch((err) => {
        if (!mounted) return;
        setError('Failed to fetch DDragon versions');
        console.error(err);
      });
    return () => { mounted = false; };
  }, []);

  const ids = Array.from({ length: count }, (_, i) => i).filter(id => !excludeIds.includes(id));

  return (
    <div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!version && !error && <div className="text-sm text-gray-500">Loading icons…</div>}
      {version && (
        <div className="grid grid-cols-8 gap-2 mt-3">
          {ids.map((id) => {
            const src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${id}.png`;
            const selected = selectedId === id;
            const excluded = excludeIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => !excluded && onSelect(id)}
                disabled={excluded}
                title={excluded ? `Icon ${id} (excluded)` : `Icon ${id}`}
                className={
                  'w-12 h-12 rounded overflow-hidden transition-all ' + 
                  (excluded
                    ? 'border-2 border-[#C84040] opacity-30 cursor-not-allowed'
                    : selected 
                      ? 'border-4 border-[#C8AA6E] ring-4 ring-[#C8AA6E]/30 scale-110 shadow-lg shadow-[#C8AA6E]/50' 
                      : 'border-2 border-[#2B2B2F] hover:border-[#C8AA6E] hover:scale-105')
                }
              >
                <img src={src} alt={`icon-${id}`} className="w-full h-full object-cover" />
                {excluded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <svg className="w-6 h-6 text-[#C84040]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
