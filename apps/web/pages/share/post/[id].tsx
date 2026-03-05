import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

/* ─── colour helpers ─── */
function getRankColor(rank: string): string {
  const base = rank.split(' ')[0].toUpperCase();
  const c: Record<string, string> = {
    IRON: '#8B8B8B', BRONZE: '#CD7F32', SILVER: '#C0C0C0', GOLD: '#FFD700',
    PLATINUM: '#00CED1', EMERALD: '#50C878', DIAMOND: '#8BE3F9', MASTER: '#C084FC',
    GRANDMASTER: '#FF6B6B', CHALLENGER: '#F4D03F', UNRANKED: '#5B7FA6',
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
function hexRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
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

/** Draw rounded badge, returns drawn width */
function pill(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  bg: string, fg: string,
  opts: { border?: string; font?: string; px?: number; h?: number; r?: number } = {},
): number {
  const font = opts.font ?? 'bold 15px "Segoe UI", sans-serif';
  ctx.font = font;
  const tw = ctx.measureText(text).width;
  const px = opts.px ?? 18;
  const bh = opts.h ?? 34;
  const br = opts.r ?? 6;
  const bw = tw + px * 2;
  rrect(ctx, x, y, bw, bh, br);
  ctx.fillStyle = bg; ctx.fill();
  if (opts.border) { ctx.strokeStyle = opts.border; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(text, x + px, y + bh / 2);
  return bw;
}

/** Spaced label text (workaround for canvas letterSpacing) */
function spacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

/* ─── main drawing routine ─── */
function drawShareImage(canvas: HTMLCanvasElement, post: any): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const W = 1200, H = 630;
  canvas.width = W;
  canvas.height = H;

  const pa = post.postingRiotAccount;
  const rankBase = (pa?.rank || 'UNRANKED').split(' ')[0].toUpperCase();
  const rc = getRankColor(rankBase);
  const rca = (a: number) => hexRgba(rc, a);

  /* ══════════════════ BACKGROUND ══════════════════ */
  ctx.fillStyle = '#030A14';
  ctx.fillRect(0, 0, W, H);

  // Primary glow — top right
  const g1 = ctx.createRadialGradient(W * 0.85, 0, 20, W * 0.85, 0, 580);
  g1.addColorStop(0, rca(0.28));
  g1.addColorStop(0.45, rca(0.08));
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  // Secondary glow — bottom left
  const g2 = ctx.createRadialGradient(0, H, 10, 0, H, 400);
  g2.addColorStop(0, rca(0.14));
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  // Subtle noise lines
  ctx.save();
  ctx.globalAlpha = 0.025;
  ctx.fillStyle = '#FFFFFF';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.restore();

  /* ══════════════════ RIGHT PANEL ══════════════════ */
  const PNL = 795;

  // Panel gradient fill
  const panelGrd = ctx.createLinearGradient(PNL, 0, W, 0);
  panelGrd.addColorStop(0, 'rgba(6,16,32,0)');
  panelGrd.addColorStop(0.12, 'rgba(6,16,32,0.88)');
  panelGrd.addColorStop(1, 'rgba(4,11,24,0.97)');
  ctx.fillStyle = panelGrd;
  ctx.fillRect(PNL, 0, W - PNL, H);

  // Panel left border (faded)
  const pBorderGrd = ctx.createLinearGradient(PNL, 0, PNL, H);
  pBorderGrd.addColorStop(0, 'rgba(0,0,0,0)');
  pBorderGrd.addColorStop(0.25, rca(0.45));
  pBorderGrd.addColorStop(0.75, rca(0.45));
  pBorderGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.strokeStyle = pBorderGrd; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PNL, 0); ctx.lineTo(PNL, H); ctx.stroke();
  ctx.restore();

  /* ══════════════════ LEFT ACCENT BAR ══════════════════ */
  const barGrd = ctx.createLinearGradient(0, 0, 0, H);
  barGrd.addColorStop(0, rc);
  barGrd.addColorStop(0.55, rca(0.85));
  barGrd.addColorStop(1, rca(0.15));
  ctx.fillStyle = barGrd;
  ctx.fillRect(0, 0, 7, H);

  // Corner accent lines
  ctx.save();
  ctx.strokeStyle = rca(0.25); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(200, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(7, 50); ctx.stroke();
  ctx.restore();

  /* ══════════════════ LEFT CONTENT ══════════════════ */
  const LX = 46;

  // "LOOKING FOR DUO" spaced label
  ctx.save();
  ctx.font = '600 12px "Segoe UI", sans-serif';
  ctx.fillStyle = rca(0.6); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  spacedText(ctx, 'LOOKING  FOR  DUO', LX, 32, 3.5);
  ctx.restore();

  // Thin separator beneath label
  const sepGrd = ctx.createLinearGradient(LX, 0, 720, 0);
  sepGrd.addColorStop(0, rca(0.5));
  sepGrd.addColorStop(0.7, rca(0.1));
  sepGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sepGrd; ctx.fillRect(LX, 50, 720, 1);

  // ── Game Name ──
  const gameName = pa?.gameName || post.username || '';
  const tagLine  = pa?.tagLine  || '';
  const gLen = gameName.length;
  const gFS  = gLen > 16 ? 64 : gLen > 12 ? 76 : gLen > 9 ? 88 : 98;

  ctx.save();
  ctx.shadowColor = rca(0.55); ctx.shadowBlur = 36;
  ctx.font = `700 ${gFS}px "Segoe UI", sans-serif`;
  ctx.fillStyle = '#F2ECD8'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillText(gameName, LX, 162);
  const gnW = ctx.measureText(gameName).width;
  ctx.restore();

  // #tagLine
  if (tagLine) {
    ctx.save();
    ctx.font = `600 ${Math.round(gFS * 0.44)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = rc; ctx.globalAlpha = 0.5;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillText('#' + tagLine, LX + gnW + 10, 162);
    ctx.restore();
  }

  // Username line (if different)
  let nameOffsetY = 0;
  if (post.username && post.username !== gameName) {
    ctx.font = '400 13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#3D5470'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillText(`@${post.username}`, LX, 172);
    nameOffsetY = 14;
  }

  // Name underline — gradient bar
  const ulY = 182 + nameOffsetY;
  const ulGrd = ctx.createLinearGradient(LX, ulY, LX + 260, ulY);
  ulGrd.addColorStop(0, rc); ulGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ulGrd; ctx.fillRect(LX, ulY, 260, 3);

  // ── Badge row ──
  const BY = ulY + 22;
  let bx = LX;

  if (post.role) {
    bx += pill(ctx, post.role, bx, BY, rc, '#030A14', { font: `700 15px "Segoe UI", sans-serif`, px: 20, h: 36, r: 6 }) + 10;
  }
  if (post.secondRole) {
    bx += pill(ctx, post.secondRole, bx, BY, rca(0.08), rc, { border: rca(0.45), font: `600 15px "Segoe UI", sans-serif`, px: 20, h: 36 }) + 10;
  }

  // Thin vertical divider
  ctx.fillStyle = '#162436'; ctx.fillRect(bx + 2, BY + 5, 1, 26); bx += 16;

  if (pa) {
    const hi = ['MASTER','GRANDMASTER','CHALLENGER'].includes(rankBase);
    const rl  = hi
      ? `${rankBase}${pa.lp != null ? '  ' + pa.lp + ' LP' : ''}`
      : pa.division ? `${rankBase} ${pa.division}` : rankBase;
    ctx.save(); ctx.shadowColor = rca(0.5); ctx.shadowBlur = 10;
    bx += pill(ctx, rl, bx, BY, rca(0.09), rc, { border: rca(0.38), font: `700 15px "Segoe UI", sans-serif`, px: 20, h: 36 }) + 10;
    ctx.restore();
  }
  if (pa?.winrate != null) {
    const wrc = getWRColor(pa.winrate);
    const wa = (a: number) => hexRgba(wrc, a);
    bx += pill(ctx, `${pa.winrate.toFixed(1)}%  WR`, bx, BY, wa(0.1), wrc, { border: wa(0.5), font: `700 15px "Segoe UI", sans-serif`, px: 20, h: 36 }) + 10;
  }
  if (pa?.lp != null && !['MASTER','GRANDMASTER','CHALLENGER'].includes(rankBase)) {
    const lpText = `${pa.lp} LP`;
    pill(ctx, lpText, bx, BY, rca(0.07), rca(0.6), { border: rca(0.2), font: `500 14px "Segoe UI", sans-serif`, px: 16, h: 36 });
  }

  // ── Message block ──
  const msg = post.message || '';
  if (msg) {
    const MX = LX;
    const MY = BY + 52;
    const maxMW = PNL - LX - 55;
    const trunc = msg.length > 240 ? msg.substring(0, 237) + '…' : msg;

    ctx.font = '400 20px "Segoe UI", sans-serif';
    const words = trunc.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxMW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    const maxL = 4;
    const dLines = lines.slice(0, maxL);
    const lh = 30;
    const blockH = dLines.length * lh + 22;

    // Block background
    rrect(ctx, MX, MY, maxMW + 16, blockH, 8);
    ctx.fillStyle = 'rgba(6,16,32,0.75)'; ctx.fill();
    rrect(ctx, MX, MY, maxMW + 16, blockH, 8);
    ctx.strokeStyle = rca(0.12); ctx.lineWidth = 1; ctx.stroke();

    // Left accent bar on message
    rrect(ctx, MX, MY, 3, blockH, 2);
    ctx.fillStyle = rca(0.7); ctx.fill();

    // Big faded quote mark
    ctx.save();
    ctx.font = '700 56px "Segoe UI", sans-serif';
    ctx.fillStyle = rca(0.08); ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillText('"', MX + maxMW - 18, MY - 8);
    ctx.restore();

    ctx.font = '400 20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#7995B0'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    dLines.forEach((l, i) => ctx.fillText(l, MX + 18, MY + 12 + i * lh));
  }

  /* ══════════════════ RIGHT PANEL CONTENT ══════════════════ */
  const PCX = PNL + (W - PNL) / 2; // panel center x
  let PY = 60;

  // Big rank name with glow
  const rankLabel = rankBase === 'UNRANKED' ? 'UNRANKED' : rankBase;
  const rkFS = rankLabel.length > 9 ? 38 : rankLabel.length > 7 ? 44 : 50;
  ctx.save();
  ctx.shadowColor = rca(0.9); ctx.shadowBlur = 50;
  ctx.font = `900 ${rkFS}px "Segoe UI", sans-serif`;
  ctx.fillStyle = rc; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.fillText(rankLabel, PCX, PY);
  ctx.restore();
  PY += rkFS + 10;

  // Division / LP under rank
  if (pa) {
    if (!['MASTER','GRANDMASTER','CHALLENGER','UNRANKED'].includes(rankBase) && pa.division) {
      ctx.font = `600 22px "Segoe UI", sans-serif`;
      ctx.fillStyle = rca(0.55); ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      ctx.fillText(pa.division, PCX, PY);
      PY += 30;
    } else if (['MASTER','GRANDMASTER','CHALLENGER'].includes(rankBase) && pa.lp != null) {
      ctx.font = `500 17px "Segoe UI", sans-serif`;
      ctx.fillStyle = rca(0.5); ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      ctx.fillText(`${pa.lp} LP`, PCX, PY);
      PY += 26;
    }
  }

  // Panel thin divider
  PY += 10;
  const pdGrd = ctx.createLinearGradient(PNL + 20, PY, W - 20, PY);
  pdGrd.addColorStop(0, 'rgba(0,0,0,0)'); pdGrd.addColorStop(0.5, rca(0.25)); pdGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.strokeStyle = pdGrd; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PNL + 20, PY); ctx.lineTo(W - 20, PY); ctx.stroke();
  PY += 18;

  // WR stat
  if (pa?.winrate != null) {
    const wrc = getWRColor(pa.winrate);
    ctx.save();
    ctx.shadowColor = hexRgba(wrc, 0.6); ctx.shadowBlur = 14;
    ctx.font = `800 34px "Segoe UI", sans-serif`;
    ctx.fillStyle = wrc; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillText(`${pa.winrate.toFixed(1)}%`, PCX, PY);
    ctx.restore();
    PY += 36;
    ctx.font = '500 10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#2E4560'; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    spacedText(ctx, 'WIN  RATE', PCX - 22, PY, 2);
    PY += 22;
  }

  // Region
  if (post.region) {
    PY += 6;
    ctx.font = `700 15px "Segoe UI", sans-serif`;
    const rW = ctx.measureText(post.region).width + 36;
    const rX = PCX - rW / 2;
    rrect(ctx, rX, PY, rW, 30, 6);
    ctx.fillStyle = rca(0.1); ctx.fill();
    ctx.strokeStyle = rca(0.3); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = rca(0.9); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(post.region, PCX, PY + 15);
    PY += 40;
  }

  // VC preference
  if (post.vcPreference) {
    const vcLabel = formatVC(post.vcPreference).toUpperCase();
    ctx.font = '500 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#3A5470'; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillText(vcLabel, PCX, PY);
    PY += 22;
  }

  // Languages
  const langs: string[] = post.languages || [];
  if (langs.length > 0) {
    PY += 6;
    const LANG_PX = 12, LANG_H = 22, GAP = 5;
    ctx.font = '600 11px "Segoe UI", sans-serif';
    const totalW = langs.reduce((s: number, l: string) => s + ctx.measureText(l.toUpperCase()).width + LANG_PX * 2, 0) + (langs.length - 1) * GAP;
    let lx = PCX - Math.min(totalW, (W - PNL - 40)) / 2;
    for (const lang of langs) {
      ctx.font = '600 11px "Segoe UI", sans-serif';
      const lw = ctx.measureText(lang.toUpperCase()).width + LANG_PX * 2;
      rrect(ctx, lx, PY, lw, LANG_H, 4);
      ctx.fillStyle = rca(0.1); ctx.fill();
      ctx.strokeStyle = rca(0.22); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = rca(0.65); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText(lang.toUpperCase(), lx + lw / 2, PY + LANG_H / 2);
      lx += lw + GAP;
    }
  }

  /* ══════════════════ BOTTOM BAR ══════════════════ */
  const botGrd = ctx.createLinearGradient(0, H - 3, W, H - 3);
  botGrd.addColorStop(0, rca(0.05));
  botGrd.addColorStop(0.4, rca(0.9));
  botGrd.addColorStop(0.7, rca(0.5));
  botGrd.addColorStop(1, rca(0.1));
  ctx.fillStyle = botGrd; ctx.fillRect(0, H - 3, W, 3);

  /* ══════════════════ WATERMARK ══════════════════ */
  ctx.save();
  ctx.font = '500 12px "Segoe UI", sans-serif';
  ctx.globalAlpha = 0.3; ctx.fillStyle = rc;
  ctx.textBaseline = 'bottom'; ctx.textAlign = 'right';
  ctx.fillText('riftessence.app', W - 26, H - 9);
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
