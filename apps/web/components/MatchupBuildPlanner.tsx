import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { MatchupKnowledgeSuggestion, fetchItemSuggestions } from '../utils/matchupKnowledgeData';
import { MatchupButton } from './MatchupButton';

export interface MatchupBuildItem {
  id: string;
  name: string;
  iconUrl: string;
}

export interface MatchupItemBuild {
  id: string;
  name: string;
  startingItems: MatchupBuildItem[];
  boots: MatchupBuildItem[];
  coreItems: MatchupBuildItem[];
  situationalItems: MatchupBuildItem[];
  finalItems: MatchupBuildItem[];
  notes: string;
}

interface MatchupBuildPlannerProps {
  value: MatchupItemBuild[];
  onChange: (builds: MatchupItemBuild[]) => void;
}

type BuildSectionKey = 'startingItems' | 'boots' | 'coreItems' | 'situationalItems' | 'finalItems';

const sections: Array<{ key: BuildSectionKey; label: string; limit: number }> = [
  { key: 'startingItems', label: 'Start', limit: 8 },
  { key: 'boots', label: 'Boots', limit: 4 },
  { key: 'coreItems', label: 'Core', limit: 8 },
  { key: 'situationalItems', label: 'Situational', limit: 12 },
  { key: 'finalItems', label: 'Full build', limit: 8 },
];

const newBuild = (index: number): MatchupItemBuild => ({
  id: `item-build-${Date.now()}-${index}`,
  name: `Build ${index + 1}`,
  startingItems: [],
  boots: [],
  coreItems: [],
  situationalItems: [],
  finalItems: [],
  notes: '',
});

const toBuildItem = (suggestion: MatchupKnowledgeSuggestion): MatchupBuildItem => ({
  id: suggestion.id.replace('item-', ''),
  name: suggestion.name,
  iconUrl: suggestion.iconUrl,
});

const ItemSearch: React.FC<{
  items: MatchupKnowledgeSuggestion[];
  onSelect: (item: MatchupBuildItem) => void;
  disabled?: boolean;
}> = ({ items, onSelect, disabled }) => {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];
    return items
      .filter((item) => item.name.toLowerCase().includes(normalized) || item.keywords.some((keyword) => keyword.toLowerCase().includes(normalized)))
      .slice(0, 6);
  }, [items, query]);

  return (
    <div className="relative">
      <input
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search item..."
        className="w-full rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
      />
      {matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg shadow-xl" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          {matches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(toBuildItem(item));
                setQuery('');
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
            >
              <Image src={item.iconUrl} alt="" width={28} height={28} className="rounded" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.name}</span>
                {item.detail && <span className="block truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.detail}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const MatchupBuildPlanner: React.FC<MatchupBuildPlannerProps> = ({ value, onChange }) => {
  const [items, setItems] = useState<MatchupKnowledgeSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetchItemSuggestions()
      .then((itemSuggestions) => {
        if (!mounted) return;
        setItems(itemSuggestions);
        if (!value.length) onChange([newBuild(0)]);
      })
      .catch(() => setItems([]));

    return () => {
      mounted = false;
    };
  }, []);

  const activeBuild = value[activeIndex] || value[0];

  const updateBuild = (patch: Partial<MatchupItemBuild>) => {
    onChange(value.map((build, index) => (
      index === activeIndex ? { ...build, ...patch } : build
    )));
  };

  const addBuild = () => {
    const next = [...value, newBuild(value.length)];
    onChange(next);
    setActiveIndex(next.length - 1);
  };

  const removeBuild = () => {
    if (value.length <= 1) return;
    const next = value.filter((_, index) => index !== activeIndex);
    onChange(next);
    setActiveIndex(Math.max(0, activeIndex - 1));
  };

  const addItem = (sectionKey: BuildSectionKey, item: MatchupBuildItem, limit: number) => {
    const current = activeBuild[sectionKey];
    if (current.length >= limit) return;
    updateBuild({ [sectionKey]: [...current, item] } as Partial<MatchupItemBuild>);
  };

  const removeItem = (sectionKey: BuildSectionKey, itemIndex: number) => {
    updateBuild({
      [sectionKey]: activeBuild[sectionKey].filter((_, index) => index !== itemIndex),
    } as Partial<MatchupItemBuild>);
  };

  if (!activeBuild) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {value.map((build, index) => (
            <button
              key={build.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="rounded-lg px-3 py-2 text-xs font-bold transition-all"
              style={{
                backgroundColor: index === activeIndex ? 'var(--color-accent-primary-bg)' : 'var(--color-bg-tertiary)',
                border: index === activeIndex ? '1px solid var(--color-accent-1)' : '1px solid var(--color-border)',
                color: index === activeIndex ? 'var(--color-accent-1)' : 'var(--color-text-secondary)',
              }}
            >
              {build.name || `Build ${index + 1}`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <MatchupButton size="sm" variant="secondary" onClick={addBuild}>Add build</MatchupButton>
          {value.length > 1 && <MatchupButton size="sm" variant="danger" onClick={removeBuild}>Remove</MatchupButton>}
        </div>
      </div>

      <input
        value={activeBuild.name}
        onChange={(event) => updateBuild({ name: event.target.value.slice(0, 80) })}
        className="w-full rounded-lg px-3 py-2 text-sm font-semibold outline-none"
        style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
      />

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.key} className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{section.label}</h3>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{activeBuild[section.key].length}/{section.limit}</span>
            </div>

            <div className="mb-3 flex min-h-[42px] flex-wrap gap-2">
              {activeBuild[section.key].map((item, itemIndex) => (
                <button
                  key={`${item.id}-${itemIndex}`}
                  type="button"
                  onClick={() => removeItem(section.key, itemIndex)}
                  title={`Remove ${item.name}`}
                  className="group relative rounded-md transition-transform hover:scale-105"
                >
                  <Image src={item.iconUrl} alt={item.name} width={40} height={40} className="rounded-md" />
                  <span className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold group-hover:flex" style={{ backgroundColor: 'var(--color-error)', color: '#fff' }}>x</span>
                </button>
              ))}
              {!activeBuild[section.key].length && (
                <span className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>No items yet.</span>
              )}
            </div>

            <ItemSearch
              items={items}
              disabled={activeBuild[section.key].length >= section.limit}
              onSelect={(item) => addItem(section.key, item, section.limit)}
            />
          </div>
        ))}
      </div>

      <textarea
        value={activeBuild.notes}
        onChange={(event) => updateBuild({ notes: event.target.value.slice(0, 500) })}
        placeholder="Recall timing, substitutions, or matchup-specific item rules..."
        rows={3}
        className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
        style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
      />
    </div>
  );
};

export const MatchupItemBuildsView: React.FC<{ builds?: MatchupItemBuild[] }> = ({ builds = [] }) => {
  if (!builds.length) {
    return <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>No item builds saved.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {builds.map((build, index) => (
        <div key={build.id || index} className="rounded-lg p-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
          <h3 className="mb-3 font-bold" style={{ color: 'var(--color-text-primary)' }}>{build.name || `Build ${index + 1}`}</h3>
          <div className="space-y-3">
            {sections.map((section) => {
              const items = build[section.key] || [];
              if (!items.length) return null;

              return (
                <div key={section.key}>
                  <div className="mb-1 text-xs font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{section.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item, itemIndex) => (
                      <span key={`${item.id}-${itemIndex}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                        <Image src={item.iconUrl} alt="" width={22} height={22} className="rounded" />
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {build.notes && <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{build.notes}</p>}
        </div>
      ))}
    </div>
  );
};
