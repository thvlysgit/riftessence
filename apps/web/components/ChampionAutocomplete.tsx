import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { fetchChampions, getChampionIconUrl } from '../utils/championData';
import { LoadingSpinner } from './LoadingSpinner';

interface ChampionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export const ChampionAutocomplete: React.FC<ChampionAutocompleteProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Search champion...',
}) => {
  const [champions, setChampions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredChampions, setFilteredChampions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Load champions on mount
  useEffect(() => {
    const loadChampions = async () => {
      try {
        const data = await fetchChampions();
        setChampions(data);
        setFilteredChampions(data);
      } catch (error) {
        console.error('Failed to load champions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChampions();
  }, []);
  
  // Filter champions based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredChampions(champions);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = champions.filter(champ => 
      champ.toLowerCase().includes(term)
    );
    setFilteredChampions(filtered);
  }, [searchTerm, champions]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };
  
  const handleSelectChampion = (champion: string) => {
    onChange(champion);
    setSearchTerm('');
    setIsOpen(false);
  };
  
  const handleInputFocus = () => {
    setIsOpen(true);
  };
  
  const handleClearSelection = () => {
    onChange('');
    setSearchTerm('');
  };
  
  return (
    <div ref={wrapperRef} className="relative w-full">
      <label 
        className="block text-sm font-medium mb-2" 
        style={{ color: 'var(--color-text-primary)' }}
      >
        {label}
      </label>
      
      {/* Selected champion display or input */}
      {value && !isOpen ? (
        <div 
          className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
          onClick={() => setIsOpen(true)}
        >
          <div className="flex items-center gap-3">
            <Image
              src={getChampionIconUrl(value)}
              alt={value}
              width={32}
              height={32}
              className="rounded"
            />
            <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearSelection();
            }}
            className="text-red-500 hover:text-red-600 transition-colors p-1"
            aria-label="Clear selection"
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full p-3 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          disabled={isLoading}
        />
      )}
      
      {/* Dropdown list */}
      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {isLoading ? (
            <div className="p-4 flex justify-center">
              <LoadingSpinner compact />
            </div>
          ) : filteredChampions.length > 0 ? (
            <div className="py-1">
              {filteredChampions.map((champion) => (
                <div
                  key={champion}
                  onClick={() => handleSelectChampion(champion)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
                  style={{
                    color: 'var(--color-text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Image
                    src={getChampionIconUrl(champion)}
                    alt={champion}
                    width={32}
                    height={32}
                    className="rounded"
                  />
                  <span>{champion}</span>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="p-4 text-center"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No champions found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
