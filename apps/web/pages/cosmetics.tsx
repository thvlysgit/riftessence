import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FaBullhorn,
  FaBolt,
  FaCheckCircle,
  FaFont,
  FaGem,
  FaPalette,
  FaStar,
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalUI } from '../../api/components/GlobalUI';
import { getAuthHeader } from '../utils/auth';
import PrismaticEssenceIcon from '../src/components/PrismaticEssenceIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type CosmeticCategory = 'BADGE' | 'USERNAME_DECORATION' | 'HOVER_EFFECT' | 'VISUAL_EFFECT' | 'FONT' | 'ADSPACE';

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
  'HOVER_EFFECT',
  'VISUAL_EFFECT',
  'FONT',
  'ADSPACE',
];

const CATEGORY_META: Record<CosmeticCategory, { label: string; icon: React.ReactNode; color: string }> = {
  BADGE: {
    label: 'Badges',
    icon: <FaGem />,
    color: '#7dd3fc',
  },
  USERNAME_DECORATION: {
    label: 'Username Decoration',
    icon: <FaPalette />,
    color: '#f9a8d4',
  },
  HOVER_EFFECT: {
    label: 'Hover Effects',
    icon: <FaStar />,
    color: '#c4b5fd',
  },
  VISUAL_EFFECT: {
    label: 'Visual Effects',
    icon: <FaBolt />,
    color: '#67e8f9',
  },
  FONT: {
    label: 'Fonts',
    icon: <FaFont />,
    color: '#fcd34d',
  },
  ADSPACE: {
    label: 'Adspace Credits',
    icon: <FaBullhorn />,
    color: '#86efac',
  },
};

const ACTIVATABLE_CATEGORIES = new Set<CosmeticCategory>([
  'USERNAME_DECORATION',
  'HOVER_EFFECT',
  'VISUAL_EFFECT',
  'FONT',
]);

export default function CosmeticsPage() {
  const { user } = useAuth();
  const { showToast } = useGlobalUI();

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopState>(EMPTY_SHOP);
  const [purchaseLoading, setPurchaseLoading] = useState<Record<string, boolean>>({});
  const [activateLoading, setActivateLoading] = useState<Record<string, boolean>>({});

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
      HOVER_EFFECT: [],
      VISUAL_EFFECT: [],
      FONT: [],
      ADSPACE: [],
    };

    shop.items.forEach((item) => {
      groups[item.category].push(item);
    });

    return groups;
  }, [shop.items]);

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
        <div className="max-w-2xl mx-auto rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <h1 className="text-3xl font-black mb-2" style={{ color: '#93c5fd' }}>
            Cosmetics Shop
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to unlock cosmetics with Prismatic Essence.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)', color: '#0b1220' }}
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
          radial-gradient(1000px 520px at -12% -8%, rgba(34,211,238,0.18), transparent 60%),
          radial-gradient(780px 420px at 110% 0%, rgba(244,114,182,0.14), transparent 62%),
          var(--color-bg-primary)
        `,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="rounded-2xl border p-6" style={{ borderColor: 'rgba(125,211,252,0.28)', background: 'rgba(11,18,32,0.88)' }}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#93c5fd' }}>
                Prismatic Shop
              </p>
              <h1 className="text-3xl sm:text-4xl font-black mb-2 flex items-center gap-3" style={{ color: '#e2e8f0' }}>
                <FaPalette />
                Cosmetics
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Buy profile unlocks with PE and activate them instantly.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/purse"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(125,211,252,0.18)', color: '#93c5fd', border: '1px solid rgba(125,211,252,0.35)' }}
                >
                  <PrismaticEssenceIcon /> Purse
                </Link>
                <Link
                  href="/adspace"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(134,239,172,0.16)', color: '#86efac', border: '1px solid rgba(134,239,172,0.35)' }}
                >
                  <FaBullhorn /> Use Ad Credits
                </Link>
              </div>
            </div>

            <div className="text-right space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: '#93c5fd' }}>Balance</p>
              <p className="text-3xl font-black inline-flex items-center gap-2" style={{ color: '#f8fafc' }}>
                <PrismaticEssenceIcon className="text-3xl" />
                {shop.wallet.prismaticEssence.toLocaleString()} PE
              </p>
              <p className="text-sm inline-flex items-center gap-2" style={{ color: '#86efac' }}>
                <FaBullhorn /> {shop.adCredits.toLocaleString()} ad credit{shop.adCredits === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </header>

        {CATEGORY_ORDER.map((categoryKey) => {
          const items = groupedItems[categoryKey];
          if (!items || items.length === 0) return null;

          const category = CATEGORY_META[categoryKey];

          return (
            <section key={categoryKey} className="rounded-2xl border p-5" style={{ borderColor: 'var(--color-border)', background: 'rgba(13,18,28,0.86)' }}>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: category.color }}>
                {category.icon}
                {category.label}
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const canActivate = ACTIVATABLE_CATEGORIES.has(item.category) && item.owned;
                  return (
                    <article key={item.key} className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: 'var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{item.title}</p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.description}</p>
                        </div>
                        <p className="text-sm font-bold inline-flex items-center gap-1" style={{ color: '#67e8f9' }}>
                          <PrismaticEssenceIcon /> {item.costPrismaticEssence.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {item.owned && (
                          <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(56,189,248,0.18)', color: '#7dd3fc' }}>
                            <FaCheckCircle className="inline mr-1" />Owned
                          </span>
                        )}
                        {item.active && (
                          <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.18)', color: '#86efac' }}>
                            Active
                          </span>
                        )}
                        {item.repeatable && (
                          <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(148,163,184,0.18)', color: '#cbd5e1' }}>
                            Repeatable
                          </span>
                        )}
                        {item.adCreditsGrant && item.adCreditsGrant > 0 && (
                          <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(134,239,172,0.16)', color: '#86efac' }}>
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
                              background: item.active ? 'rgba(34,197,94,0.2)' : 'rgba(125,211,252,0.18)',
                              color: item.active ? '#86efac' : '#93c5fd',
                              border: `1px solid ${item.active ? 'rgba(34,197,94,0.45)' : 'rgba(125,211,252,0.35)'}`,
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
                                ? 'linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6)'
                                : 'var(--color-bg-tertiary)',
                              color: item.available ? '#0b1220' : 'var(--color-text-muted)',
                              border: `1px solid ${item.available ? 'rgba(125,211,252,0.5)' : 'var(--color-border)'}`,
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
