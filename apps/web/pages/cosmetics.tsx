import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaBullhorn,
  FaBolt,
  FaCheckCircle,
  FaCrown,
  FaDiceD20,
  FaFont,
  FaGem,
  FaPalette,
  FaTrophy,
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from '../../api/components/GlobalUI';
import { getAuthHeader } from '../utils/auth';
import PrismaticEssenceIcon from '../src/components/PrismaticEssenceIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type CosmeticCategory = 'BADGE' | 'USERNAME_DECORATION' | 'VISUAL_EFFECT' | 'FONT';

type CosmeticItem = {
  key: string;
  title: string;
  description: string;
  category: CosmeticCategory;
  costPrismaticEssence: number;
  repeatable: boolean;
  owned: boolean;
  active: boolean;
  available: boolean;
  blockedReason: string | null;
  adCreditsGrant: number | null;
  badgePreview: { key: string; name: string; icon: string } | null;
};

type ShopState = {
  items: CosmeticItem[];
  adCredits: number;
  loadout: {
    activeUsernameDecoration: string | null;
    activeHoverEffect: string | null;
    activeVisualEffect: string | null;
    activeNameplateFont: string | null;
  };
  wallet: {
    prismaticEssence: number;
  };
};

const EMPTY_SHOP: ShopState = {
  items: [],
  adCredits: 0,
  loadout: {
    activeUsernameDecoration: null,
    activeHoverEffect: null,
    activeVisualEffect: null,
    activeNameplateFont: null,
  },
  wallet: {
    prismaticEssence: 0,
  },
};

const CATEGORY_ORDER: CosmeticCategory[] = [
  'BADGE',
  'USERNAME_DECORATION',
  'VISUAL_EFFECT',
  'FONT',
];

const CATEGORY_META: Record<CosmeticCategory, { label: string; icon: React.ReactNode; color: string }> = {
  BADGE: {
    label: 'Badges',
    icon: <FaGem />,
    color: '#C8AA6E',
  },
  USERNAME_DECORATION: {
    label: 'Username Decoration',
    icon: <FaPalette />,
    color: '#60A5FA',
  },
  VISUAL_EFFECT: {
    label: 'Profile Background Effects',
    icon: <FaBolt />,
    color: '#A78BFA',
  },
  FONT: {
    label: 'Fonts',
    icon: <FaFont />,
    color: '#F59E0B',
  },
};

const ACTIVATABLE_CATEGORIES = new Set<CosmeticCategory>([
  'USERNAME_DECORATION',
  'VISUAL_EFFECT',
  'FONT',
]);

const USERNAME_DECORATION_PREVIEW_STYLES: Record<string, React.CSSProperties> = {
  USERNAME_GILDED_EDGE: {
    textShadow: '0 0 10px rgba(251, 191, 36, 0.34)',
    WebkitTextStroke: '0.6px rgba(245, 158, 11, 0.65)',
  },
  USERNAME_PRISMATIC_SLASH: {
    backgroundImage: 'linear-gradient(92deg, #67e8f9, #93c5fd 35%, #a78bfa 68%, #f9a8d4)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 12px rgba(103, 232, 249, 0.28)',
  },
  USERNAME_SOLAR_FLARE: {
    color: '#fde68a',
    WebkitTextStroke: '0.65px rgba(194, 65, 12, 0.72)',
    textShadow: '0 0 7px rgba(251, 146, 60, 0.52), 0 0 18px rgba(239, 68, 68, 0.35)',
    letterSpacing: '0.015em',
  },
  USERNAME_VOID_GLASS: {
    color: '#dbeafe',
    WebkitTextStroke: '0.55px rgba(99, 102, 241, 0.55)',
    textShadow: '0 0 8px rgba(96, 165, 250, 0.42), 0 0 20px rgba(147, 51, 234, 0.28)',
    filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.28))',
  },
};

const FONT_PREVIEW_FAMILIES: Record<string, string> = {
  FONT_ORBITRON: 'Orbitron, "Segoe UI", sans-serif',
  FONT_CINZEL: 'Cinzel, Georgia, serif',
  FONT_EXO2: '"Exo 2", "Segoe UI", sans-serif',
  FONT_RAJDHANI: 'Rajdhani, "Segoe UI", sans-serif',
  FONT_AUDIOWIDE: 'Audiowide, "Segoe UI", sans-serif',
  FONT_UNBOUNDED: 'Unbounded, "Segoe UI", sans-serif',
  FONT_BEBAS_NEUE: '"Bebas Neue", "Segoe UI", sans-serif',
};

const VISUAL_EFFECT_PREVIEW_CLASSES: Record<string, string> = {
  VISUAL_STARDUST: 'profile-visual-stardust',
  VISUAL_SCANLINES: 'profile-visual-scanlines',
  VISUAL_NEBULA_PULSE: 'profile-visual-nebula-pulse',
};

const PRESTIGE_BADGE_PREVIEW_META: Record<string, { icon: React.ReactNode; frame: string; glow: string }> = {
  BADGE_FORTUNE_COIN: {
    icon: <FaGem />,
    frame: 'linear-gradient(145deg, rgba(180,83,9,0.5), rgba(217,119,6,0.42))',
    glow: 'rgba(249,115,22,0.35)',
  },
  BADGE_ORACLE_DICE: {
    icon: <FaDiceD20 />,
    frame: 'linear-gradient(145deg, rgba(180,83,9,0.52), rgba(234,179,8,0.4), rgba(217,119,6,0.35))',
    glow: 'rgba(245,158,11,0.38)',
  },
  BADGE_JACKPOT_CROWN: {
    icon: <FaCrown />,
    frame: 'linear-gradient(145deg, rgba(146,64,14,0.56), rgba(217,119,6,0.42), rgba(192,132,252,0.34))',
    glow: 'rgba(251,191,36,0.36)',
  },
  BADGE_VAULT_ASCENDANT: {
    icon: <FaTrophy />,
    frame: 'linear-gradient(145deg, rgba(120,53,15,0.58), rgba(217,119,6,0.44), rgba(168,85,247,0.38))',
    glow: 'rgba(234,179,8,0.42)',
  },
};

export default function CosmeticsPage() {
  const { user } = useAuth();
  const { showToast } = useGlobalUI();

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopState>(EMPTY_SHOP);
  const [purchaseLoading, setPurchaseLoading] = useState<Record<string, boolean>>({});
  const [activateLoading, setActivateLoading] = useState<Record<string, boolean>>({});
  const [deactivateLoading, setDeactivateLoading] = useState<Record<string, boolean>>({});

  const authHeaders = useCallback(() => {
    const headers = getAuthHeader();
    if (!headers || !('Authorization' in headers)) return null;
    return headers as Record<string, string>;
  }, []);

  const loadShop = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return EMPTY_SHOP;

    const res = await fetch(`${API_URL}/api/wallet/cosmetics`, { headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load cosmetics shop.');
    }

    return {
      items: (data?.items || []) as CosmeticItem[],
      adCredits: Number(data?.adCredits || 0),
      loadout: {
        activeUsernameDecoration: data?.loadout?.activeUsernameDecoration || null,
        activeHoverEffect: data?.loadout?.activeHoverEffect || null,
        activeVisualEffect: data?.loadout?.activeVisualEffect || null,
        activeNameplateFont: data?.loadout?.activeNameplateFont || null,
      },
      wallet: {
        prismaticEssence: Number(data?.wallet?.prismaticEssence || 0),
      },
    } as ShopState;
  }, [authHeaders]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await loadShop();
        if (!active) return;
        setShop(data);
      } catch (error: any) {
        if (!active) return;
        showToast(error?.message || 'Failed to load cosmetics.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [user, loadShop, showToast]);

  const groupedItems = useMemo(() => {
    const groups: Record<CosmeticCategory, CosmeticItem[]> = {
      BADGE: [],
      USERNAME_DECORATION: [],
      VISUAL_EFFECT: [],
      FONT: [],
    };

    shop.items.forEach((item) => {
      groups[item.category].push(item);
    });

    return groups;
  }, [shop.items]);

  const hasActiveCosmetics = Boolean(
    shop.loadout.activeUsernameDecoration
    || shop.loadout.activeHoverEffect
    || shop.loadout.activeVisualEffect
    || shop.loadout.activeNameplateFont
  );

  const updateShopFromResponse = (data: any) => {
    setShop({
      items: (data?.items || []) as CosmeticItem[],
      adCredits: Number(data?.adCredits || 0),
      loadout: {
        activeUsernameDecoration: data?.loadout?.activeUsernameDecoration || null,
        activeHoverEffect: data?.loadout?.activeHoverEffect || null,
        activeVisualEffect: data?.loadout?.activeVisualEffect || null,
        activeNameplateFont: data?.loadout?.activeNameplateFont || null,
      },
      wallet: {
        prismaticEssence: Number(data?.wallet?.prismaticEssence || 0),
      },
    });
  };

  const renderCosmeticPreview = (item: CosmeticItem) => {
    if (item.category === 'BADGE') {
      const meta = PRESTIGE_BADGE_PREVIEW_META[item.key] || {
        icon: <FaGem />,
        frame: 'linear-gradient(145deg, rgba(71,85,105,0.6), rgba(51,65,85,0.52))',
        glow: 'rgba(148,163,184,0.24)',
      };

      return (
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-card)', background: 'rgba(15,23,42,0.55)' }}>
          <div
            className="mx-auto h-14 w-14 rounded-2xl border flex items-center justify-center text-xl"
            style={{
              background: meta.frame,
              borderColor: 'rgba(255,255,255,0.16)',
              color: '#f8fafc',
              boxShadow: `0 10px 20px ${meta.glow}`,
            }}
          >
            {meta.icon}
          </div>
        </div>
      );
    }

    if (item.category === 'USERNAME_DECORATION') {
      const previewStyle = USERNAME_DECORATION_PREVIEW_STYLES[item.key] || undefined;
      return (
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-card)', background: 'rgba(15,23,42,0.55)' }}>
          <p className="text-center text-lg font-bold" style={{ color: 'var(--accent-primary)', ...(previewStyle || {}) }}>
            RiftEssence
          </p>
        </div>
      );
    }

    if (item.category === 'VISUAL_EFFECT') {
      const effectClass = VISUAL_EFFECT_PREVIEW_CLASSES[item.key] || '';
      return (
        <div className="rounded-lg border p-2" style={{ borderColor: 'var(--border-card)', background: 'rgba(15,23,42,0.55)' }}>
          <div
            className={`profile-card-shell rounded-lg h-16 flex items-center justify-center ${effectClass}`.trim()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Profile Background Preview</span>
          </div>
        </div>
      );
    }

    if (item.category === 'FONT') {
      const fontFamily = FONT_PREVIEW_FAMILIES[item.key] || undefined;
      return (
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-card)', background: 'rgba(15,23,42,0.55)' }}>
          <p className="text-center text-xl leading-tight" style={{ color: 'var(--text-main)', fontFamily }}>
            RiftEssence
          </p>
        </div>
      );
    }

    return null;
  };

  const handlePurchase = async (item: CosmeticItem) => {
    if (!user || !item.available) return;

    setPurchaseLoading((prev) => ({ ...prev, [item.key]: true }));
    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Please sign in first.');

      const res = await fetch(`${API_URL}/api/wallet/cosmetics/${item.key}/purchase`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Purchase failed.');
      }

      updateShopFromResponse(data);

      if (Number(data?.result?.adCreditsAdded || 0) > 0) {
        showToast(`Ad credits added: +${Number(data.result.adCreditsAdded)}.`, 'success');
      } else if (data?.result?.badgeGranted) {
        showToast('Badge unlocked.', 'success');
      } else {
        showToast('Item unlocked.', 'success');
      }
    } catch (error: any) {
      showToast(error?.message || 'Purchase failed.', 'error');
    } finally {
      setPurchaseLoading((prev) => ({ ...prev, [item.key]: false }));
    }
  };

  const handleActivate = async (item: CosmeticItem) => {
    if (!user || !item.owned || item.active) return;

    setActivateLoading((prev) => ({ ...prev, [item.key]: true }));
    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Please sign in first.');

      const res = await fetch(`${API_URL}/api/wallet/cosmetics/${item.key}/activate`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Activation failed.');
      }

      updateShopFromResponse(data);
      showToast('Cosmetic activated.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Activation failed.', 'error');
    } finally {
      setActivateLoading((prev) => ({ ...prev, [item.key]: false }));
    }
  };

  const handleDeactivate = async (category: 'ALL' | 'USERNAME_DECORATION' | 'VISUAL_EFFECT' | 'FONT') => {
    if (!user) return;

    setDeactivateLoading((prev) => ({ ...prev, [category]: true }));
    try {
      const headers = authHeaders();
      if (!headers) throw new Error('Please sign in first.');

      const res = await fetch(`${API_URL}/api/wallet/cosmetics/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ category }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to disable cosmetic.');
      }

      updateShopFromResponse(data);
      showToast(category === 'ALL' ? 'All active cosmetics disabled.' : 'Cosmetic disabled.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to disable cosmetic.', 'error');
    } finally {
      setDeactivateLoading((prev) => ({ ...prev, [category]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-center py-24">
          <div
            className="h-14 w-14 rounded-full animate-spin border-4 border-t-transparent"
            style={{ borderColor: '#67e8f9', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--color-bg-primary)' }}>
        <div
          className="max-w-2xl mx-auto rounded-2xl border p-8 text-center"
          style={{
            border: '2px solid var(--border-card)',
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--accent-primary)' }}>
            Cosmetics Shop
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to unlock cosmetics with Prismatic Essence.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold"
            style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}
          >
            <PrismaticEssenceIcon className="text-lg" />
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        background: `
          radial-gradient(900px 460px at 8% -12%, rgba(200,170,110,0.16), transparent 60%),
          radial-gradient(720px 360px at 100% 0%, rgba(96,165,250,0.12), transparent 64%),
          var(--color-bg-primary)
        `,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <header
          className="rounded-2xl border p-6"
          style={{
            border: '2px solid var(--border-card)',
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-secondary)' }}>
                Prismatic Shop
              </p>
              <h1 className="text-3xl sm:text-4xl font-black mb-2 flex items-center gap-3" style={{ color: 'var(--accent-primary)' }}>
                <FaPalette />
                Cosmetics
              </h1>
              <p className="text-sm max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
                Unlock profile cosmetics with Prismatic Essence, then activate your current loadout instantly.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/purse"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary-border)' }}
                >
                  <PrismaticEssenceIcon /> Purse
                </Link>
                <Link
                  href="/adspace"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(34,197,94,0.14)', color: '#86efac', border: '1px solid rgba(34,197,94,0.38)' }}
                >
                  <FaBullhorn /> Use Ad Credits
                </Link>
                <button
                  type="button"
                  onClick={() => handleDeactivate('ALL')}
                  disabled={!hasActiveCosmetics || Boolean(deactivateLoading.ALL)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: hasActiveCosmetics ? 'rgba(239,68,68,0.14)' : 'rgba(148,163,184,0.12)',
                    color: hasActiveCosmetics ? '#fca5a5' : 'var(--color-text-muted)',
                    border: hasActiveCosmetics ? '1px solid rgba(239,68,68,0.38)' : '1px solid var(--color-border)',
                  }}
                >
                  {deactivateLoading.ALL ? 'Disabling...' : 'Disable All Active'}
                </button>
              </div>
            </div>

            <div className="text-right rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Balance</p>
              <p className="text-3xl font-black inline-flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <PrismaticEssenceIcon className="text-3xl" />
                {shop.wallet.prismaticEssence.toLocaleString()} PE
              </p>
            </div>
          </div>
        </header>

        {CATEGORY_ORDER.map((categoryKey) => {
          const items = groupedItems[categoryKey];
          if (!items || items.length === 0) return null;

          const category = CATEGORY_META[categoryKey];

          return (
            <section
              key={categoryKey}
              className="rounded-2xl border p-5"
              style={{
                border: '2px solid var(--border-card)',
                background: 'var(--bg-card)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: category.color }}>
                  {category.icon}
                  {category.label}
                </h2>
                {ACTIVATABLE_CATEGORIES.has(categoryKey) && (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(categoryKey as 'USERNAME_DECORATION' | 'VISUAL_EFFECT' | 'FONT')}
                    disabled={!items.some((entry) => entry.active) || Boolean(deactivateLoading[categoryKey])}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: items.some((entry) => entry.active) ? 'rgba(239,68,68,0.14)' : 'rgba(148,163,184,0.12)',
                      color: items.some((entry) => entry.active) ? '#fca5a5' : 'var(--color-text-muted)',
                      border: items.some((entry) => entry.active) ? '1px solid rgba(239,68,68,0.38)' : '1px solid var(--color-border)',
                    }}
                  >
                    {deactivateLoading[categoryKey] ? 'Disabling...' : 'Disable Current'}
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const canActivate = ACTIVATABLE_CATEGORIES.has(item.category) && item.owned;
                  return (
                    <article
                      key={item.key}
                      className="rounded-xl border p-4 flex flex-col gap-3"
                      style={{ borderColor: 'var(--border-card)', background: 'var(--bg-input)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{item.title}</p>
                        </div>
                        <p className="text-sm font-bold inline-flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                          <PrismaticEssenceIcon /> {item.costPrismaticEssence.toLocaleString()}
                        </p>
                      </div>

                      {renderCosmeticPreview(item)}

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {item.owned && (
                          <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary-border)' }}>
                            <FaCheckCircle className="inline mr-1" />Owned
                          </span>
                        )}
                        {item.active && (
                          <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-success-bg)', color: '#86efac', border: '1px solid var(--accent-success-border)' }}>
                            Active
                          </span>
                        )}
                        {item.repeatable && (
                          <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(148,163,184,0.18)', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.28)' }}>
                            Repeatable
                          </span>
                        )}
                        {item.adCreditsGrant && item.adCreditsGrant > 0 && (
                          <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.14)', color: '#86efac', border: '1px solid rgba(34,197,94,0.32)' }}>
                            +{item.adCreditsGrant} credit{item.adCreditsGrant === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      {item.blockedReason && !canActivate && (
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.blockedReason}</p>
                      )}

                      <div className="mt-auto flex gap-2">
                        {canActivate ? (
                          <button
                            onClick={() => handleActivate(item)}
                            disabled={item.active || Boolean(activateLoading[item.key])}
                            className="w-full px-3 py-2 rounded-lg text-xs font-semibold"
                            style={{
                              background: item.active ? 'var(--accent-success-bg)' : 'var(--accent-primary-bg)',
                              color: item.active ? '#86efac' : 'var(--accent-primary)',
                              border: `1px solid ${item.active ? 'var(--accent-success-border)' : 'var(--accent-primary-border)'}`,
                            }}
                          >
                            {activateLoading[item.key] ? 'Applying...' : item.active ? 'Active' : 'Activate'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePurchase(item)}
                            disabled={!item.available || Boolean(purchaseLoading[item.key])}
                            className="w-full px-3 py-2 rounded-lg text-xs font-semibold"
                            style={{
                              background: item.available
                                ? 'var(--btn-gradient)'
                                : 'var(--color-bg-tertiary)',
                              color: item.available ? 'var(--btn-gradient-text)' : 'var(--color-text-muted)',
                              border: `1px solid ${item.available ? 'var(--accent-primary-border)' : 'var(--color-border)'}`,
                            }}
                          >
                            {purchaseLoading[item.key] ? 'Processing...' : item.owned && !item.repeatable ? 'Owned' : 'Buy'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
