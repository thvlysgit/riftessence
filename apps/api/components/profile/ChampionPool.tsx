import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getChampionIconUrl } from '../../../web/utils/championData';

interface ChampionPoolProps {
  championList: string[];
  championTierlist: { S: string[]; A: string[]; B: string[]; C: string[] };
  isEditMode: boolean;
  isValidChampion: (name: string) => boolean;
  onAddToTier: (tier: 'S' | 'A' | 'B' | 'C', champion: string) => void;
  onRemoveFromTier: (tier: 'S' | 'A' | 'B' | 'C', champion: string) => void;
  allChampions?: string[]; // List of all valid champion names for suggestions
}

// Popular champions for suggestions (based on play rates)
const POPULAR_CHAMPIONS = [
  'Jinx', 'Lux', 'Yasuo', 'Ezreal', 'Kai\'Sa', 'Lee Sin', 'Thresh', 'Ahri',
  'Zed', 'Vayne', 'Miss Fortune', 'Leona', 'Darius', 'Morgana', 'Caitlyn',
  'Jhin', 'Ashe', 'Lulu', 'Senna', 'Nami', 'Blitzcrank', 'Yone', 'Viego',
  'Sylas', 'Akali', 'Katarina', 'Master Yi', 'Jax', 'Garen', 'Teemo'
];

export const ChampionPool: React.FC<ChampionPoolProps> = ({
  championTierlist,
  isEditMode,
  isValidChampion,
  onAddToTier,
  onRemoveFromTier,
  allChampions = []
}) => {
  const [championInput, setChampionInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'S' | 'A' | 'B' | 'C'>('S');
  const [hoveredSuggestion, setHoveredSuggestion] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get all champions currently in any tier
  const allTierChampions = useMemo(() => {
    return [...championTierlist.S, ...championTierlist.A, ...championTierlist.B, ...championTierlist.C];
  }, [championTierlist]);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!championInput.trim()) return [];
    const input = championInput.toLowerCase();
    const validChamps = allChampions.length > 0 ? allChampions : POPULAR_CHAMPIONS;
    return validChamps
      .filter(champ => 
        champ.toLowerCase().includes(input) && 
        !allTierChampions.includes(champ)
      )
      .slice(0, 8);
  }, [championInput, allChampions, allTierChampions]);

  // Get suggested champions (popular ones not yet added)
  const quickSuggestions = useMemo(() => {
    return POPULAR_CHAMPIONS
      .filter(champ => !allTierChampions.includes(champ) && isValidChampion(champ))
      .slice(0, 10);
  }, [allTierChampions, isValidChampion]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddChampion = (tier: 'S' | 'A' | 'B' | 'C', champion?: string) => {
    const champName = champion || championInput.trim();
    if (!champName) return;
    
    if (!isValidChampion(champName)) {
      return;
    }
    
    onAddToTier(tier, champName);
    setChampionInput('');
    setShowSuggestions(false);
    setHoveredSuggestion(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHoveredSuggestion(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHoveredSuggestion(prev => 
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hoveredSuggestion >= 0 && filteredSuggestions[hoveredSuggestion]) {
        handleAddChampion(selectedTier, filteredSuggestions[hoveredSuggestion]);
      } else if (isValidChampion(championInput.trim())) {
        handleAddChampion(selectedTier);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const tiers: Array<{ key: 'S' | 'A' | 'B' | 'C'; label: string; color: string; gradient: string }> = [
    { key: 'S', label: 'S', color: '#FFD700', gradient: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)' },
    { key: 'A', label: 'A', color: '#C0C0C0', gradient: 'linear-gradient(135deg, rgba(192,192,192,0.15) 0%, rgba(192,192,192,0.05) 100%)' },
    { key: 'B', label: 'B', color: '#CD7F32', gradient: 'linear-gradient(135deg, rgba(205,127,50,0.15) 0%, rgba(205,127,50,0.05) 100%)' },
    { key: 'C', label: 'C', color: '#808080', gradient: 'linear-gradient(135deg, rgba(128,128,128,0.15) 0%, rgba(128,128,128,0.05) 100%)' },
  ];

  return (
    <div className="space-y-4">
      {isEditMode && (
        <>
          {/* Search and tier selector */}
          <div className="rounded-lg p-4" style={{ 
            background: 'var(--bg-elevated)', 
            border: '1px solid var(--border-card)' 
          }}>
            <div className="flex flex-col gap-3">
              {/* Tier selector tabs */}
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                {tiers.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTier(key)}
                    className="flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all"
                    style={{
                      background: selectedTier === key ? color : 'transparent',
                      color: selectedTier === key ? '#1a1a1a' : color,
                      boxShadow: selectedTier === key ? `0 2px 8px ${color}40` : 'none',
                    }}
                  >
                    {label} Tier
                  </button>
                ))}
              </div>

              {/* Search input with autocomplete */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={championInput}
                      onChange={(e) => {
                        setChampionInput(e.target.value);
                        setShowSuggestions(true);
                        setHoveredSuggestion(-1);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search champion..."
                      className="w-full px-4 py-3 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        border: `2px solid ${championInput && isValidChampion(championInput) ? tiers.find(t => t.key === selectedTier)?.color : 'var(--border-card)'}`,
                        color: 'var(--text-main)',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                  </div>
                  <button
                    onClick={() => handleAddChampion(selectedTier)}
                    disabled={!championInput || !isValidChampion(championInput)}
                    className="px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: tiers.find(t => t.key === selectedTier)?.color,
                      color: '#1a1a1a',
                    }}
                  >
                    Add
                  </button>
                </div>

                {/* Autocomplete dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-card)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                  >
                    {filteredSuggestions.map((champ, idx) => (
                      <button
                        key={champ}
                        onClick={() => handleAddChampion(selectedTier, champ)}
                        onMouseEnter={() => setHoveredSuggestion(idx)}
                        className="w-full px-3 py-2 flex items-center gap-3 transition-colors"
                        style={{
                          background: hoveredSuggestion === idx ? 'var(--bg-input)' : 'transparent',
                        }}
                      >
                        <img
                          src={getChampionIconUrl(champ)}
                          alt={champ}
                          className="w-8 h-8 rounded"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <span style={{ color: 'var(--text-main)' }}>{champ}</span>
                        <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{ 
                          background: tiers.find(t => t.key === selectedTier)?.color + '30',
                          color: tiers.find(t => t.key === selectedTier)?.color,
                        }}>
                          → {selectedTier}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick suggestions */}
            {quickSuggestions.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-card)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    ✨ Quick Add
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    (Popular champions)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((champ) => (
                    <button
                      key={champ}
                      onClick={() => handleAddChampion(selectedTier, champ)}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all hover:scale-105"
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-card)',
                      }}
                    >
                      <img
                        src={getChampionIconUrl(champ)}
                        alt={champ}
                        className="w-6 h-6 rounded"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>{champ}</span>
                      <span 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        style={{ color: tiers.find(t => t.key === selectedTier)?.color }}
                      >
                        +{selectedTier}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Tier lists */}
      {tiers.map(({ key, label, color, gradient }) => (
        <div 
          key={key} 
          className="rounded-lg overflow-hidden transition-all"
          style={{
            background: gradient,
            border: `1px solid ${color}40`,
            boxShadow: championTierlist[key].length > 0 ? `0 0 20px ${color}10` : 'none',
          }}
        >
          <div 
            className="flex items-center gap-3 px-4 py-2"
            style={{ 
              borderBottom: `1px solid ${color}30`,
              background: `${color}15`,
            }}
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
              style={{ 
                background: color,
                color: '#1a1a1a',
                boxShadow: `0 2px 8px ${color}50`,
              }}
            >
              {label}
            </div>
            <span className="font-semibold" style={{ color }}>
              {label} Tier
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
              background: `${color}20`,
              color: color,
            }}>
              {championTierlist[key].length} champion{championTierlist[key].length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="p-3">
            <div className="flex flex-wrap gap-2">
              {championTierlist[key].length === 0 ? (
                <span className="text-sm py-2 px-3 rounded-lg" style={{ 
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                }}>
                  {isEditMode ? `Click "Add" or use Quick Add to add champions` : 'No champions in this tier'}
                </span>
              ) : (
                championTierlist[key].map((champ) => (
                  <div
                    key={champ}
                    className="group relative px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all hover:scale-105"
                    style={{
                      background: 'var(--bg-main)',
                      border: `1px solid ${color}40`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <img
                      src={getChampionIconUrl(champ)}
                      alt={champ}
                      className="w-10 h-10 rounded-lg"
                      style={{ 
                        border: `2px solid ${color}60`,
                        boxShadow: `0 0 8px ${color}30`,
                      }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span className="font-medium" style={{ color: 'var(--text-main)' }}>{champ}</span>
                    {isEditMode && (
                      <button
                        onClick={() => onRemoveFromTier(key, champ)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ 
                          background: 'var(--accent-danger)',
                          color: 'white',
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
