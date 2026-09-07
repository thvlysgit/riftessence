import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import EconomyLayout, {
  EconomyError,
  EconomyLoading,
  SignInPrompt,
} from '../components/economy/EconomyLayout';
import CosmeticPreview from '../components/economy/CosmeticPreview';
import { Cosmetic, economyApi, pe, Shop, walletChanged } from '../utils/economy';

const categories = [
  ['ALL', 'Everything'],
  ['USERNAME_DECORATION', 'Name styles'],
  ['FONT', 'Fonts'],
  ['HOVER_EFFECT', 'Hover effects'],
  ['BADGE', 'Prestige badges'],
];
export default function CollectionPage() {
  const { user, loading, refreshUser } = useAuth();
  const client = useQueryClient();
  const [category, setCategory] = useState('ALL');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [buying, setBuying] = useState<Cosmetic | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const operation = useRef<Record<string, string>>({});
  const shop = useQuery(
    ['economy', user?.id, 'shop'],
    ({ signal }) => economyApi<Shop>('/wallet/cosmetics', { signal }),
    { enabled: Boolean(user) },
  );
  const items =
    shop.data?.items.filter(
      (item) => (category === 'ALL' || category === item.category) && (!ownedOnly || item.owned),
    ) || [];
  const act = async (item: Cosmetic, action: 'purchase' | 'activate' | 'deactivate') => {
    if (busy) return;
    setBusy(item.key);
    setError(null);
    setNotice('');
    try {
      const key = (operation.current[item.key] ||= crypto.randomUUID());
      const result = await economyApi<Shop>(
        action === 'deactivate'
          ? '/wallet/cosmetics/deactivate'
          : `/wallet/cosmetics/${item.key}/${action}`,
        {
          method: 'POST',
          headers: action === 'purchase' ? { 'Idempotency-Key': key } : {},
          body: JSON.stringify(action === 'deactivate' ? { category: item.category } : {}),
        },
      );
      delete operation.current[item.key];
      setBuying(null);
      client.setQueryData(['economy', user?.id, 'shop'], result);
      await client.invalidateQueries(['economy', user?.id]);
      walletChanged();
      await refreshUser();
      setNotice(
        action === 'purchase'
          ? `${item.title} is now in your collection.`
          : action === 'activate'
          ? `${item.title} equipped.`
          : 'Item unequipped.',
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };
  return (
    <EconomyLayout
      title="Make it yours."
      description="Small details. A profile that feels like you."
      aside={
        shop.data ? (
          <div className="essence-game-reward">
            <span className="essence-muted essence-small">Available essence</span>
            <div className="essence-number">
              {pe(shop.data.wallet.prismaticEssence)}
              <small>PE</small>
            </div>
          </div>
        ) : null
      }
    >
      {loading ? (
        <EconomyLoading />
      ) : !user ? (
        <SignInPrompt />
      ) : (
        <>
          <EconomyError error={shop.error} retry={() => shop.refetch()} />
          <EconomyError error={error} />
          {notice ? (
            <div className="essence-notice essence-success" role="status">
              {notice}
            </div>
          ) : null}
          <div className="essence-filters" aria-label="Collection categories">
            {categories.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={category === key}
                onClick={() => setCategory(key)}
              >
                {label}
              </button>
            ))}
            <label className="essence-filter-end">
              <input
                type="checkbox"
                checked={ownedOnly}
                onChange={(e) => setOwnedOnly(e.target.checked)}
              />
              Owned only
            </label>
          </div>
          {shop.isLoading ? (
            <EconomyLoading />
          ) : (
            <>
              <div className="essence-gallery">
                {items.map((item) => (
                  <article className="essence-item" key={item.key}>
                    <CosmeticPreview item={item} username={user.username} />
                    <div className="essence-item-info">
                      <h3>{item.title.replace('Username: ', '').replace('Name Font: ', '')}</h3>
                      <p>{item.description}</p>
                      {item.category === 'HOVER_EFFECT' ? (
                        <p>Hover over your name to preview.</p>
                      ) : null}
                      <div className="essence-item-action">
                        <span className={item.owned ? 'essence-item-status' : 'essence-amount'}>
                          {item.owned
                            ? item.active
                              ? 'Equipped'
                              : 'Collected'
                            : `${pe(item.costPrismaticEssence)} PE`}
                        </span>
                        {!item.owned ? (
                          <button
                            className="essence-button essence-secondary"
                            disabled={!item.available || Boolean(busy)}
                            onClick={() => {
                              setBuying(item);
                              setError(null);
                            }}
                          >
                            Unlock
                          </button>
                        ) : item.category !== 'BADGE' ? (
                          <button
                            className="essence-button essence-secondary"
                            disabled={Boolean(busy)}
                            onClick={() => act(item, item.active ? 'deactivate' : 'activate')}
                          >
                            {busy === item.key ? 'Saving…' : item.active ? 'Unequip' : 'Equip'}
                          </button>
                        ) : null}
                      </div>
                      {!item.owned && !item.available ? (
                        <p className="essence-muted essence-small" style={{ marginTop: 12 }}>
                          {item.blockedReason}
                        </p>
                      ) : null}
                      {buying?.key === item.key ? (
                        <div className="essence-notice" role="group" aria-label="Confirm unlock">
                          <p>Unlock for {pe(item.costPrismaticEssence)} PE?</p>
                          <div className="essence-form-actions">
                            <button
                              className="essence-button"
                              disabled={Boolean(busy)}
                              onClick={() => act(item, 'purchase')}
                            >
                              {busy === item.key ? 'Unlocking…' : 'Confirm'}
                            </button>
                            <button
                              className="essence-text-button"
                              disabled={Boolean(busy)}
                              onClick={() => setBuying(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              {!items.length && !shop.error ? (
                <div className="essence-empty">
                  No items in this view yet. Try another category.
                </div>
              ) : null}
            </>
          )}
          <p className="essence-credit">
            All unlocks are permanent and belong to your account. Name styles, fonts and hover
            effects appear on your profile and in the navigation.
          </p>
        </>
      )}
    </EconomyLayout>
  );
}
