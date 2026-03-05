import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

/* ─── colour helpers ─── */
function getRankColor(rank: string): string {
  const base = rank.split(' ')[0].toUpperCase();
  const c: Record<string, string> = {
    IRON: '#6B7280', BRONZE: '#CD7F32', SILVER: '#C0C0C0', GOLD: '#FFD700',
    PLATINUM: '#00CED1', EMERALD: '#50C878', DIAMOND: '#8BE3F9', MASTER: '#C084FC',
    GRANDMASTER: '#FF6B6B', CHALLENGER: '#F4D03F', UNRANKED: '#6B7280',
  };
  return c[base] || '#C8AA6D';
}
function getWRColor(wr: number): string {
  if (wr >= 60) return '#F97316';
  if (wr >= 55) return '#10B981';
  if (wr >= 50) return '#84CC16';
  if (wr >= 45) return '#F59E0B';
  return '#EF4444';
}
function formatVC(vc: string): string {
  return ({ ALWAYS: 'VC Required', SOMETIMES: 'VC Optional', NEVER: 'No VC' } as Record<string, string>)[vc] || vc;
}

/* ─── canvas primitives ─── */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draw a pill badge, return its width */
function badge(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  bg: string, fg: string, opts?: { border?: string; font?: string },
): number {
  const font = opts?.font || 'bold 18px "Segoe UI", sans-serif';
  ctx.font = font;
  const tw = ctx.measureText(text).width;
  const px = 22, bh = 38;
  const bw = tw + px * 2;

  rrect(ctx, x, y, bw, bh, 8);
  ctx.fillStyle = bg;
  ctx.fill();
  if (opts?.border) { ctx.strokeStyle = opts.border; ctx.lineWidth = 1.5; ctx.stroke(); }

  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + px, y + bh / 2);
  return bw;
}

/* ─── main drawing routine ─── */
function drawShareImage(canvas: HTMLCanvasElement, post: any): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const W = 1200, H = 630;
  canvas.width = W;
  canvas.height = H;

  const pa = post.postingRiotAccount;
  const rc = pa ? getRankColor(pa.rank) : '#C8AA6D';

  /* background */
  ctx.fillStyle = '#06101F';
  ctx.fillRect(0, 0, W, H);

  /* left accent bar */
  ctx.fillStyle = rc;
  ctx.fillRect(0, 0, 12, H);

  const cx = 56;
  let cy = 44;

  /* ── "LOOKING FOR DUO" pill ── */
  const pillText = 'LOOKING FOR DUO';
  ctx.font = 'bold 28px "Segoe UI", sans-serif';
  const pillTW = ctx.measureText(pillText).width;
  const pillW = pillTW + 68, pillH = 48;
  rrect(ctx, cx, cy, pillW, pillH, 40);
  ctx.strokeStyle = rc; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = rc; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(pillText, cx + 34, cy + pillH / 2);

  /* ── Region badge (top-right) ── */
  const regionText = post.region || '';
  if (regionText) {
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    const rTW = ctx.measureText(regionText).width;
    const rBW = rTW + 32, rBH = 34, rX = W - 52 - rBW;
    rrect(ctx, rX, cy + 7, rBW, rBH, 6);
    ctx.fillStyle = '#0D1B2E'; ctx.fill();
    ctx.strokeStyle = rc; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = rc; ctx.textBaseline = 'middle';
    ctx.fillText(regionText, rX + 16, cy + 7 + rBH / 2);
  }

  cy += pillH + 20;

  /* ── Riot ID hero ── */
  const gameName = pa?.gameName || post.username || '';
  const tagLine = pa?.tagLine || '';
  ctx.font = 'bold 80px "Segoe UI", sans-serif';
  ctx.fillStyle = '#F0E6D2'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillText(gameName, cx, cy + 70);
  const gnW = ctx.measureText(gameName).width;
  if (tagLine) {
    ctx.save();
    ctx.font = 'bold 42px "Segoe UI", sans-serif';
    ctx.fillStyle = rc; ctx.globalAlpha = 0.6;
    ctx.fillText('#' + tagLine, cx + gnW + 8, cy + 70);
    ctx.restore();
  }
  cy += 84;

  /* ── Divider ── */
  rrect(ctx, cx, cy, 110, 4, 2);
  ctx.fillStyle = rc; ctx.fill();
  cy += 28;

  /* ── Badge row ── */
  let bx = cx;
  if (post.role)       bx += badge(ctx, post.role, bx, cy, rc, '#06101F') + 12;
  if (post.secondRole) bx += badge(ctx, post.secondRole, bx, cy, '#0D1B2E', rc, { border: rc }) + 12;
  // separator
  ctx.fillStyle = '#1E2D42'; ctx.fillRect(bx, cy + 4, 1, 30); bx += 13;
  if (pa) {
    const hi = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];
    const rl = hi.includes(pa.rank)
      ? `${pa.rank}${pa.lp != null ? ' ' + pa.lp + 'LP' : ''}`
      : pa.division ? `${pa.rank} ${pa.division}` : pa.rank;
    bx += badge(ctx, rl, bx, cy, '#0D1B2E', rc) + 12;
  }
  if (pa?.winrate != null) {
    const wrc = getWRColor(pa.winrate);
    bx += badge(ctx, `WR ${pa.winrate.toFixed(1)}%`, bx, cy, '#0D1B2E', wrc, { border: wrc }) + 12;
  }
  if (post.vcPreference)
    badge(ctx, formatVC(post.vcPreference), bx, cy, '#0D1B2E', '#5B6B82', { font: 'bold 16px "Segoe UI", sans-serif' });

  cy += 54;

  /* ── Message ── */
  const msg = post.message || '';
  if (msg) {
    const trunc = msg.length > 200 ? msg.substring(0, 197) + '…' : msg;
    ctx.font = 'italic 24px "Segoe UI", sans-serif';
    const maxW = W - cx - 100;
    const words = trunc.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);

    const lh = 36;
    const mh = lines.length * lh;

    ctx.save(); ctx.globalAlpha = 0.5;
    rrect(ctx, cx, cy, 4, mh, 2);
    ctx.fillStyle = rc; ctx.fill(); ctx.restore();

    ctx.font = 'italic 24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8B9CB5'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    lines.forEach((l, i) => ctx.fillText(l, cx + 28, cy + i * lh));
  }

  /* ── Watermark ── */
  ctx.save();
  ctx.font = '15px "Segoe UI", sans-serif';
  ctx.globalAlpha = 0.45; ctx.fillStyle = '#C8AA6D';
  ctx.textBaseline = 'bottom'; ctx.textAlign = 'right';
  ctx.fillText('riftessence.app', W - 40, H - 24);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/* ════════════════════════════════════════════════ */
export default function SharePostPage() {
  const router = useRouter();
  const { id } = router.query;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* fetch post and render canvas */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_URL}/api/posts/${id}`)
      .then(r => { if (!r.ok) throw new Error('Post not found'); return r.json(); })
      .then(data => {
        const p = data.post;
        if (!p) { setError('Post not found'); return; }
        if (canvasRef.current) setImageUrl(drawShareImage(canvasRef.current, p));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.download = `riftessence-duo-${id}.png`;
    a.href = imageUrl;
    a.click();
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvasRef.current!.toBlob(b => (b ? res(b) : rej()), 'image/png'),
      );
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
    } catch {
      if (imageUrl) { await navigator.clipboard.writeText(imageUrl).catch(() => {}); setCopied(true); }
    }
    if (copied) return; // already scheduled
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Reset copied state after 2s
  useEffect(() => { if (copied) { const t = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(t); } }, [copied]);

  return (
    <>
      <Head><title>Share Post | RiftEssence</title></Head>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        {loading && (
          <div className="text-center">
            <div
              className="inline-block w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: 'var(--color-accent-1)', borderTopColor: 'transparent' }}
            />
            <p className="mt-4" style={{ color: 'var(--color-text-muted)' }}>Generating image…</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-accent-1)' }}>Post Not Found</h2>
            <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
            <Link href="/feed" className="px-6 py-3 rounded font-semibold" style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}>
              Back to Feed
            </Link>
          </div>
        )}

        {!loading && imageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Duo Post"
              className="w-full max-w-4xl rounded-xl shadow-2xl border"
              style={{ borderColor: 'var(--color-border)' }}
            />

            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={handleDownload}
                className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-transform hover:scale-105"
                style={{ background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))', color: 'var(--color-bg-primary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>

              <button
                onClick={handleCopy}
                className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all border"
                style={{
                  backgroundColor: copied ? 'var(--color-accent-1)' : 'var(--color-bg-secondary)',
                  color: copied ? 'var(--color-bg-primary)' : 'var(--color-accent-1)',
                  borderColor: 'var(--color-accent-1)',
                }}
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy Image
                  </>
                )}
              </button>
            </div>

            <Link
              href="/feed"
              className="mt-6 text-sm transition-colors hover:underline"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ← Back to Feed
            </Link>
          </>
        )}
      </div>
    </>
  );
}
