import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { MatchupRune, MatchupRuneTree, fetchRuneTrees } from '../utils/matchupKnowledgeData';
import { MatchupButton } from './MatchupButton';

export interface MatchupRunePage {
  id: string;
  name: string;
  primaryTreeId?: number;
  secondaryTreeId?: number;
  selectedRunes: number[];
  statShards: string[];
  notes: string;
}

interface MatchupRuneBuilderProps {
  value: MatchupRunePage[];
  onChange: (pages: MatchupRunePage[]) => void;
}

const shardRows = [
  ['Adaptive Force', 'Attack Speed', 'Ability Haste'],
  ['Adaptive Force', 'Move Speed', 'Health Scaling'],
  ['Health', 'Tenacity', 'Slow Resist'],
];

const newRunePage = (index: number, trees: MatchupRuneTree[] = []): MatchupRunePage => ({
  id: `rune-page-${Date.now()}-${index}`,
  name: `Rune Page ${index + 1}`,
  primaryTreeId: trees[0]?.id,
  secondaryTreeId: trees[1]?.id,
  selectedRunes: [],
  statShards: [],
  notes: '',
});

const findRuneSlot = (trees: MatchupRuneTree[], runeId: number) => {
  for (const tree of trees) {
    for (let slotIndex = 0; slotIndex < tree.slots.length; slotIndex += 1) {
      if (tree.slots[slotIndex].some((rune) => rune.id === runeId)) {
        return { tree, slotIndex };
      }
    }
  }
  return null;
};

const RuneButton: React.FC<{
  rune: MatchupRune;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ rune, selected, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={rune.detail || rune.name}
    className="group flex flex-col items-center gap-1 rounded-lg p-2 transition-all hover:translate-y-[-1px] disabled:opacity-35"
    style={{
      backgroundColor: selected ? 'var(--color-accent-primary-bg)' : 'var(--color-bg-tertiary)',
      border: selected ? '1px solid var(--color-accent-1)' : '1px solid var(--color-border)',
      color: selected ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
    }}
  >
    <Image src={rune.iconUrl} alt={rune.name} width={34} height={34} className="rounded-full" />
    <span className="max-w-[84px] truncate text-[11px] font-semibold">{rune.name}</span>
  </button>
);

export const MatchupRuneBuilder: React.FC<MatchupRuneBuilderProps> = ({ value, onChange }) => {
  const [trees, setTrees] = useState<MatchupRuneTree[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetchRuneTrees()
      .then((runeTrees) => {
        if (!mounted) return;
        setTrees(runeTrees);
        if (!value.length) onChange([newRunePage(0, runeTrees)]);
      })
      .catch(() => setTrees([]));

    return () => {
      mounted = false;
    };
  }, []);

  const activePage = value[activeIndex] || value[0];
  const primaryTree = trees.find((tree) => tree.id === activePage?.primaryTreeId) || trees[0];
  const secondaryTree = trees.find((tree) => tree.id === activePage?.secondaryTreeId) || trees.find((tree) => tree.id !== primaryTree?.id);

  const updatePage = (patch: Partial<MatchupRunePage>) => {
    const next = value.map((page, index) => (
      index === activeIndex ? { ...page, ...patch } : page
    ));
    onChange(next);
  };

  const setPrimaryTree = (treeId: number) => {
    const fallbackSecondary = trees.find((tree) => tree.id !== treeId)?.id;
    updatePage({
      primaryTreeId: treeId,
      secondaryTreeId: activePage.secondaryTreeId === treeId ? fallbackSecondary : activePage.secondaryTreeId,
      selectedRunes: [],
    });
  };

  const setSecondaryTree = (treeId: number) => {
    updatePage({
      secondaryTreeId: treeId,
      selectedRunes: activePage.selectedRunes.filter((runeId) => {
        const location = findRuneSlot(trees, runeId);
        return location?.tree.id === activePage.primaryTreeId;
      }),
    });
  };

  const toggleRune = (rune: MatchupRune, tree: MatchupRuneTree, isPrimary: boolean) => {
    const selected = activePage.selectedRunes.includes(rune.id);
    if (selected) {
      updatePage({ selectedRunes: activePage.selectedRunes.filter((id) => id !== rune.id) });
      return;
    }

    if (isPrimary) {
      const sameSlotIds = tree.slots[rune.slotIndex].map((slotRune) => slotRune.id);
      updatePage({
        selectedRunes: [
          ...activePage.selectedRunes.filter((id) => !sameSlotIds.includes(id)),
          rune.id,
        ],
      });
      return;
    }

    const secondarySelected = activePage.selectedRunes.filter((id) => {
      const location = findRuneSlot(trees, id);
      return location?.tree.id === tree.id && location.slotIndex > 0;
    });
    const withoutSameSlot = activePage.selectedRunes.filter((id) => {
      const location = findRuneSlot(trees, id);
      return !(location?.tree.id === tree.id && location.slotIndex === rune.slotIndex);
    });
    const trimmed = secondarySelected.length >= 2
      ? withoutSameSlot.filter((id) => id !== secondarySelected[0])
      : withoutSameSlot;

    updatePage({ selectedRunes: [...trimmed, rune.id] });
  };

  const addPage = () => {
    const next = [...value, newRunePage(value.length, trees)];
    onChange(next);
    setActiveIndex(next.length - 1);
  };

  const removePage = () => {
    if (value.length <= 1) return;
    const next = value.filter((_, index) => index !== activeIndex);
    onChange(next);
    setActiveIndex(Math.max(0, activeIndex - 1));
  };

  if (!activePage) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {value.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="rounded-lg px-3 py-2 text-xs font-bold transition-all"
              style={{
                backgroundColor: index === activeIndex ? 'var(--color-accent-primary-bg)' : 'var(--color-bg-tertiary)',
                border: index === activeIndex ? '1px solid var(--color-accent-1)' : '1px solid var(--color-border)',
                color: index === activeIndex ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
              }}
            >
              {page.name || `Rune Page ${index + 1}`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <MatchupButton size="sm" variant="secondary" onClick={addPage}>Add page</MatchupButton>
          {value.length > 1 && <MatchupButton size="sm" variant="danger" onClick={removePage}>Remove</MatchupButton>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-3">
          <input
            value={activePage.name}
            onChange={(event) => updatePage({ name: event.target.value.slice(0, 80) })}
            className="w-full rounded-lg px-3 py-2 text-sm font-semibold outline-none"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            {trees.map((tree) => (
              <button
                key={tree.id}
                type="button"
                onClick={() => setPrimaryTree(tree.id)}
                className="flex items-center gap-2 rounded-lg p-2 text-left text-xs font-bold transition-all"
                style={{
                  backgroundColor: primaryTree?.id === tree.id ? 'var(--color-accent-primary-bg)' : 'var(--color-bg-tertiary)',
                  border: primaryTree?.id === tree.id ? '1px solid var(--color-accent-1)' : '1px solid var(--color-border)',
                  color: primaryTree?.id === tree.id ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
                }}
              >
                <Image src={tree.iconUrl} alt="" width={24} height={24} />
                <span className="truncate">{tree.name}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {trees.filter((tree) => tree.id !== primaryTree?.id).map((tree) => (
              <button
                key={tree.id}
                type="button"
                onClick={() => setSecondaryTree(tree.id)}
                className="flex items-center gap-2 rounded-lg p-2 text-left text-xs font-bold transition-all"
                style={{
                  backgroundColor: secondaryTree?.id === tree.id ? 'var(--color-accent-primary-bg)' : 'var(--color-bg-tertiary)',
                  border: secondaryTree?.id === tree.id ? '1px solid var(--color-accent-1)' : '1px solid var(--color-border)',
                  color: secondaryTree?.id === tree.id ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
                }}
              >
                <Image src={tree.iconUrl} alt="" width={24} height={24} />
                <span className="truncate">{tree.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {primaryTree && (
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                <Image src={primaryTree.iconUrl} alt="" width={24} height={24} />
                Primary: {primaryTree.name}
              </div>
              <div className="space-y-3">
                {primaryTree.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {slot.map((rune) => (
                      <RuneButton key={rune.id} rune={rune} selected={activePage.selectedRunes.includes(rune.id)} onClick={() => toggleRune(rune, primaryTree, true)} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {secondaryTree && (
            <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
              <div className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                <Image src={secondaryTree.iconUrl} alt="" width={24} height={24} />
                Secondary: {secondaryTree.name}
              </div>
              <div className="space-y-3">
                {secondaryTree.slots.slice(1).map((slot, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {slot.map((rune) => (
                      <RuneButton key={rune.id} rune={rune} selected={activePage.selectedRunes.includes(rune.id)} onClick={() => toggleRune(rune, secondaryTree, false)} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <div className="mb-3 text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Stat shards</div>
            <div className="space-y-2">
              {shardRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex flex-wrap gap-2">
                  {row.map((shard) => {
                    const selected = activePage.statShards[rowIndex] === shard;
                    return (
                      <button
                        key={shard}
                        type="button"
                        onClick={() => {
                          const next = [...activePage.statShards];
                          next[rowIndex] = shard;
                          updatePage({ statShards: next });
                        }}
                        className="rounded-md px-3 py-2 text-xs font-bold transition-all"
                        style={{
                          backgroundColor: selected ? 'var(--color-accent-primary-bg)' : 'var(--color-bg-secondary)',
                          border: selected ? '1px solid var(--color-accent-1)' : '1px solid var(--color-border)',
                          color: selected ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {shard}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <textarea
            value={activePage.notes}
            onChange={(event) => updatePage({ notes: event.target.value.slice(0, 500) })}
            placeholder="When this page is best..."
            rows={3}
            className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>
      </div>
    </div>
  );
};

export const MatchupRunePagesView: React.FC<{ pages?: MatchupRunePage[] }> = ({ pages = [] }) => {
  const [trees, setTrees] = useState<MatchupRuneTree[]>([]);

  useEffect(() => {
    fetchRuneTrees().then(setTrees).catch(() => setTrees([]));
  }, []);

  const runeMap = useMemo(() => {
    const map = new Map<number, MatchupRune>();
    trees.forEach((tree) => tree.slots.flat().forEach((rune) => map.set(rune.id, rune)));
    return map;
  }, [trees]);

  if (!pages.length) {
    return <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>No rune pages saved.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {pages.map((page, index) => {
        const primaryTree = trees.find((tree) => tree.id === page.primaryTreeId);
        const secondaryTree = trees.find((tree) => tree.id === page.secondaryTreeId);

        return (
          <div key={page.id || index} className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{page.name || `Rune Page ${index + 1}`}</h3>
              <div className="flex gap-2">
                {[primaryTree, secondaryTree].filter(Boolean).map((tree) => (
                  <Image key={tree!.id} src={tree!.iconUrl} alt={tree!.name} width={26} height={26} />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {page.selectedRunes.map((runeId) => {
                const rune = runeMap.get(runeId);
                if (!rune) return null;
                return (
                  <span key={rune.id} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                    <Image src={rune.iconUrl} alt="" width={18} height={18} className="rounded-full" />
                    {rune.name}
                  </span>
                );
              })}
            </div>
            {!!page.statShards?.length && (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{page.statShards.filter(Boolean).join(' / ')}</p>
            )}
            {page.notes && <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{page.notes}</p>}
          </div>
        );
      })}
    </div>
  );
};
