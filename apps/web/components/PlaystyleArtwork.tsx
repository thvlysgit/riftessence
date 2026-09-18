import { useEffect, useRef } from 'react';

/** Small, deliberately paced gameplay vignettes. CSS owns the animation timeline. */
export default function PlaystyleArtwork({ playstyle }: { playstyle: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let inView = false;
    const syncPlayback = () => {
      element.dataset.running = String(inView && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.15 });
    observer.observe(element);
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
    };
  }, []);

  return (
    <div className="playstyle-art" ref={root} data-running="false" aria-hidden="true">
      <svg viewBox="0 0 300 108" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {playstyle === 'Controlled Chaos' ? (
          <>
            <g className="ps-terrain">
              <path d="M24 91 76 91 108 65 148 65 180 83 276 83 M24 20 96 20 126 44 182 44 212 20 276 20" />
              <path d="m116 23 16-7 26 9-5 13-22-1Z M91 82l19-8 19 13-10 12H96Z M183 62l15-10 17 8-3 13-21 1Z" />
              <path d="M35 55H270" strokeDasharray="2 7" />
            </g>
            <path className="ps-route-base" d="M48 75C78 75 77 29 113 29S160 17 177 27 192 54 238 54" strokeDasharray="3 5" />
            <path className="ps-chaos-route ps-motion" d="M48 75C78 75 77 29 113 29S160 17 177 27 192 54 238 54" pathLength="1" />
            <g className="ps-chaos-ally"><path d="m207 64 5-5 5 5-5 5Z" /><path d="m223 72 5-5 5 5-5 5Z" /></g>
            <g className="ps-chaos-target ps-motion"><circle cx="238" cy="54" r="10" /><path d="m235 51 6 6m0-6-6 6" /></g>
            <g className="ps-chaos-unit ps-motion"><circle r="7" className="ps-solid" /><circle r="11" opacity=".3" /><path d="m-2 2 4-4" className="ps-cutout" /></g>
            <g transform="translate(238 54)"><circle className="ps-chaos-impact ps-motion" r="13" /></g>
          </>
        ) : playstyle === 'FUNDAMENTALS' ? (
          <>
            <g className="ps-terrain"><path d="M24 31H276M24 81H276M67 31V81M237 31V81" /><path d="M30 95H270" strokeDasharray="1 9" /></g>
            <path className="ps-fort" d="M37 43h6v-9h6v9h6v-9h6v9h6v29H37Zm9 29V59h12v13" />
            <path d="M79 45 90 41 101 45V56C101 64 90 69 90 69S79 64 79 56Z" className="ps-shield" />
            <path d="m85 54 4 4 7-8" />
            <g className="ps-wave-allies ps-motion"><path d="m116 45 5-5 5 5-5 5Zm0 21 5-5 5 5-5 5Zm18-10 5-5 5 5-5 5Z" className="ps-solid" /></g>
            <g className="ps-wave-enemies ps-motion"><path d="m205 45 5-5 5 5-5 5Zm0 21 5-5 5 5-5 5Z" /><g className="ps-last-hit-target ps-motion"><path d="m186 56 5-5 5 5-5 5Z" /><path d="M184 44H198" opacity=".25" /><path d="M184 44H188" strokeWidth="2" /></g></g>
            <path className="ps-last-hit ps-motion" d="M102 56H170" pathLength="1" strokeWidth="2" />
            <g transform="translate(169 56)"><path className="ps-farm-spark ps-motion" d="M-7 0H7M0-7V7m-4-4 8 8m0-8-8 8" /></g>
            <g className="ps-farm-gold ps-motion"><circle cx="169" cy="37" r="5" /><path d="M169 35v4" /></g>
          </>
        ) : playstyle === 'CoinFlips' ? (
          <>
            <g className="ps-terrain"><path d="M42 89H258M150 13V20M91 26l5 5m113-5-5 5" /><path d="M68 75C76 6 224 6 232 75" strokeDasharray="2 6" /></g>
            <ellipse className="ps-coin-shadow ps-motion" cx="150" cy="88" rx="25" ry="3" fill="currentColor" stroke="none" />
            <g className="ps-coin-toss ps-motion">
              <g className="ps-coin-turn ps-motion">
                <circle cx="150" cy="65" r="20" className="ps-coin-body" strokeWidth="2" />
                <circle cx="150" cy="65" r="15" strokeWidth=".8" />
                <path d="m150 54 7 11-7 11-7-11Z" className="ps-coin-face" />
                <path d="M138 54l3-3m18 28 3-3M146 47h8M146 83h8" opacity=".5" />
              </g>
            </g>
            <path className="ps-coin-landing ps-motion" d="M119 85l-6-3m68 3 6-3M124 78l-3-4m55 4 3-4" />
          </>
        ) : playstyle === 'Scaling' ? (
          <>
            <g className="ps-terrain"><path d="M28 18V89H275M28 65H275M28 41H275M90 18V89M152 18V89M214 18V89" /></g>
            <g className="ps-scaling-bars">
              {[10, 14, 20, 31, 49, 73].map((height, index) => <rect key={height} className={`ps-growth-bar ps-motion ps-growth-bar-${index}`} x={48 + index * 36} y={88 - height} width="14" height={height} rx="1" />)}
            </g>
            <path className="ps-route-base" d="M35 83C109 83 173 78 202 54S235 24 263 12" />
            <path className="ps-growth-curve ps-motion" d="M35 83C109 83 173 78 202 54S235 24 263 12" pathLength="1" strokeWidth="2.5" />
            <circle className="ps-growth-tip ps-motion ps-solid" r="3.5" />
            <g transform="translate(263 12)"><path className="ps-growth-crown ps-motion" d="m-7 3-2-11 6 4 3-7 3 7 6-4-2 11Z" /></g>
          </>
        ) : playstyle === 'Snowball' ? (
          <>
            <g className="ps-terrain"><path d="M24 64C107 65 164 91 277 91M34 74l7 1m33 4 7 2m31 7 8 2m34 8 8 1" /></g>
            <path className="ps-snow-trail ps-motion" d="M39 61C112 65 166 87 253 88" pathLength="1" strokeWidth="3" />
            {[{ x: 99, y: 65 }, { x: 157, y: 78 }, { x: 214, y: 85 }].map(({ x, y }, index) => (
              <g key={x} transform={`translate(${x} ${y})`}><path className={`ps-snow-pickup ps-motion ps-snow-pickup-${index}`} d="m0-5 4 5-4 5-4-5Z" /></g>
            ))}
            <g className="ps-snow-roll ps-motion">
              <circle r="20" className="ps-snow-body" strokeWidth="1.5" />
              <g className="ps-snow-spin ps-motion"><path d="M-12-11C-2-18 13-9 12 2S0 17-9 10M-8-6C-1-10 7-5 6 2" opacity=".6" /><path d="M-15 2l2 3M4-14l3 1M4 13h2" /></g>
            </g>
          </>
        ) : <path d="m150 23 28 31-28 31-28-31Z" />}
      </svg>
    </div>
  );
}
