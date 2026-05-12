import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  fetchChampionSpellSuggestions,
  fetchMatchupKnowledge,
  MatchupKnowledgeSuggestion,
} from '../utils/matchupKnowledgeData';
import { MatchupRichText } from './MatchupRichText';

interface MatchupSmartTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  champion: string;
  maxLength?: number;
  rows?: number;
  helperText?: string;
}

interface ActiveFragment {
  start: number;
  end: number;
  query: string;
}

const typeLabel: Record<string, string> = {
  spell: 'Spell',
  item: 'Item',
  rune: 'Rune',
};

const getActiveFragment = (text: string, cursor: number): ActiveFragment | null => {
  const beforeCursor = text.slice(0, cursor);
  const match = beforeCursor.match(/(^|[\s([{"'`*_>-])([A-Za-z0-9.'& -]{1,32})$/);
  if (!match) return null;

  const query = match[2].trimStart();
  if (!query.trim()) return null;

  return {
    start: cursor - query.length,
    end: cursor,
    query,
  };
};

const matchesSuggestion = (suggestion: MatchupKnowledgeSuggestion, query: string) => {
  const normalizedQuery = query.toLowerCase();

  if (suggestion.type === 'spell') {
    return suggestion.keywords.some(keyword => keyword.toLowerCase().startsWith(normalizedQuery));
  }

  if (normalizedQuery.length < 2) return false;

  return suggestion.keywords.some(keyword => keyword.toLowerCase().includes(normalizedQuery));
};

export const MatchupSmartTextarea: React.FC<MatchupSmartTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  champion,
  maxLength = 2000,
  rows = 5,
  helperText,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [itemsAndRunes, setItemsAndRunes] = useState<MatchupKnowledgeSuggestion[]>([]);
  const [spells, setSpells] = useState<MatchupKnowledgeSuggestion[]>([]);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadKnowledge = async () => {
      setIsKnowledgeLoading(true);
      try {
        const [knowledge, championSpells] = await Promise.all([
          fetchMatchupKnowledge(),
          fetchChampionSpellSuggestions(champion),
        ]);

        if (!cancelled) {
          setItemsAndRunes([...knowledge.items, ...knowledge.runes]);
          setSpells(championSpells);
        }
      } catch (error) {
        console.error('Failed to load matchup autocomplete data:', error);
      } finally {
        if (!cancelled) {
          setIsKnowledgeLoading(false);
        }
      }
    };

    loadKnowledge();

    return () => {
      cancelled = true;
    };
  }, [champion]);

  const activeFragment = useMemo(() => getActiveFragment(value, cursorPosition), [cursorPosition, value]);

  const suggestions = useMemo(() => {
    if (!activeFragment) return [];

    const allSuggestions = [...spells, ...itemsAndRunes];
    return allSuggestions
      .filter(suggestion => matchesSuggestion(suggestion, activeFragment.query))
      .slice(0, 7);
  }, [activeFragment, itemsAndRunes, spells]);

  const insertSuggestion = (suggestion: MatchupKnowledgeSuggestion) => {
    if (!activeFragment) return;

    const nextValue = `${value.slice(0, activeFragment.start)}${suggestion.insertText}${value.slice(activeFragment.end)}`;
    const nextCursor = activeFragment.start + suggestion.insertText.length;

    onChange(nextValue.slice(0, maxLength));
    setCursorPosition(nextCursor);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value.slice(0, maxLength));
    setCursorPosition(event.target.selectionStart);
  };

  const handleSelectionChange = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition(event.currentTarget.selectionStart);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </label>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {maxLength - value.length} left
        </span>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onClick={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-none rounded-lg px-4 py-3 text-sm leading-6 outline-none transition-all focus:ring-2"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        />

        {suggestions.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg shadow-xl"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => {
                  insertSuggestion(suggestion);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
              >
                <Image
                  src={suggestion.iconUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {suggestion.label}
                  </span>
                  {suggestion.detail && (
                    <span className="block truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {suggestion.detail}
                    </span>
                  )}
                </span>
                <span
                  className="rounded px-2 py-1 text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: 'var(--color-accent-primary-bg)',
                    color: 'var(--color-accent-1)',
                  }}
                >
                  {typeLabel[suggestion.type]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>{helperText}</span>
        {champion && <span>Type Q/W/E/R for {champion} spells.</span>}
        <span>{isKnowledgeLoading ? 'Loading icons...' : 'Items and runes use Data Dragon icons.'}</span>
      </div>

      {value.trim() && (
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Rendered preview
          </div>
          <MatchupRichText text={value} champion={champion} compact />
        </div>
      )}
    </div>
  );
};
