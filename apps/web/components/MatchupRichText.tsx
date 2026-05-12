import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  MatchupKnowledgeSuggestion,
  fetchChampionSpellSuggestions,
  fetchMatchupKnowledge,
} from '../utils/matchupKnowledgeData';

interface MatchupRichTextProps {
  text?: string | null;
  champion?: string;
  emptyText?: string;
  compact?: boolean;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const InlineToken: React.FC<{ suggestion: MatchupKnowledgeSuggestion; label?: string; compact?: boolean }> = ({
  suggestion,
  label,
  compact = false,
}) => (
  <span
    className="mx-0.5 inline-flex items-center gap-1 rounded-md align-middle font-semibold"
    style={{
      backgroundColor: 'var(--color-bg-tertiary)',
      border: '1px solid var(--color-border)',
      color: 'var(--color-text-primary)',
      padding: compact ? '1px 5px' : '2px 6px',
    }}
  >
    <Image src={suggestion.iconUrl} alt="" width={compact ? 16 : 18} height={compact ? 16 : 18} className="rounded-sm" />
    <span>{label || suggestion.label}</span>
  </span>
);

export const MatchupRichText: React.FC<MatchupRichTextProps> = ({
  text,
  champion,
  emptyText = 'No notes yet.',
  compact = false,
}) => {
  const [suggestions, setSuggestions] = useState<MatchupKnowledgeSuggestion[]>([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [knowledge, spells] = await Promise.all([
          fetchMatchupKnowledge(),
          fetchChampionSpellSuggestions(champion || ''),
        ]);

        if (!isMounted) return;
        setSuggestions([...knowledge.items, ...knowledge.runes, ...spells]);
      } catch {
        if (isMounted) setSuggestions([]);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [champion]);

  const lookup = useMemo(() => {
    const map = new Map<string, MatchupKnowledgeSuggestion>();
    suggestions.forEach((suggestion) => {
      map.set(suggestion.name.toLowerCase(), suggestion);
      map.set(suggestion.label.toLowerCase(), suggestion);
    });
    return map;
  }, [suggestions]);

  const spellSuggestions = useMemo(() => (
    suggestions
      .filter((suggestion) => suggestion.type === 'spell' && suggestion.label.length > 3)
      .sort((a, b) => b.label.length - a.label.length)
  ), [suggestions]);

  const renderPlainSegment = (segment: string, keyPrefix: string) => {
    if (!spellSuggestions.length || !segment) return [segment];

    let parts: React.ReactNode[] = [segment];
    spellSuggestions.forEach((suggestion) => {
      const regex = new RegExp(escapeRegExp(suggestion.label), 'gi');
      parts = parts.flatMap((part, index) => {
        if (typeof part !== 'string') return [part];

        const split: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(part)) !== null) {
          if (match.index > lastIndex) split.push(part.slice(lastIndex, match.index));
          split.push(
            <InlineToken
              key={`${keyPrefix}-spell-${suggestion.id}-${index}-${match.index}`}
              suggestion={suggestion}
              label={match[0]}
              compact={compact}
            />
          );
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < part.length) split.push(part.slice(lastIndex));
        return split;
      });
    });

    return parts;
  };

  if (!text?.trim()) {
    return <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>{emptyText}</p>;
  }

  const pieces = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <div className="text-sm leading-7" style={{ color: 'var(--color-text-secondary)' }}>
      {pieces.map((piece, index) => {
        if (piece.startsWith('**') && piece.endsWith('**')) {
          const label = piece.slice(2, -2);
          const suggestion = lookup.get(label.toLowerCase());
          if (suggestion) {
            return <InlineToken key={`${label}-${index}`} suggestion={suggestion} label={label} compact={compact} />;
          }

          return (
            <strong key={`${label}-${index}`} style={{ color: 'var(--color-text-primary)' }}>
              {label}
            </strong>
          );
        }

        return (
          <React.Fragment key={`plain-${index}`}>
            {renderPlainSegment(piece, `plain-${index}`).map((part, partIndex) => (
              <React.Fragment key={`${index}-${partIndex}`}>
                {typeof part === 'string'
                  ? part.split('\n').map((line, lineIndex, lines) => (
                    <React.Fragment key={`${index}-${partIndex}-${lineIndex}`}>
                      {line}
                      {lineIndex < lines.length - 1 && <br />}
                    </React.Fragment>
                  ))
                  : part}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
};
