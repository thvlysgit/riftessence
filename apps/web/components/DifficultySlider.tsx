import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type DifficultyLevel = 
  | 'FREE_WIN' 
  | 'VERY_FAVORABLE' 
  | 'FAVORABLE' 
  | 'SKILL_MATCHUP' 
  | 'HARD' 
  | 'VERY_HARD' 
  | 'FREE_LOSE';

const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  'FREE_WIN',
  'VERY_FAVORABLE',
  'FAVORABLE',
  'SKILL_MATCHUP',
  'HARD',
  'VERY_HARD',
  'FREE_LOSE',
];

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  FREE_WIN: '#22c55e',
  VERY_FAVORABLE: '#84cc16',
  FAVORABLE: '#eab308',
  SKILL_MATCHUP: '#f59e0b',
  HARD: '#fb923c',
  VERY_HARD: '#f87171',
  FREE_LOSE: '#ef4444',
};

interface DifficultySliderProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export const DifficultySlider: React.FC<DifficultySliderProps> = ({
  value,
  onChange,
  label,
}) => {
  const { t } = useLanguage();
  
  const currentIndex = DIFFICULTY_LEVELS.indexOf(value as DifficultyLevel);
  const validIndex = currentIndex >= 0 ? currentIndex : 3; // Default to SKILL_MATCHUP
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    onChange(DIFFICULTY_LEVELS[index]);
  };
  
  const getDifficultyLabel = (level: DifficultyLevel): string => {
    const key = `matchups.difficulty.${level.toLowerCase()}` as any;
    return t(key);
  };
  
  const currentColor = DIFFICULTY_COLORS[DIFFICULTY_LEVELS[validIndex]];
  const gradientStops = DIFFICULTY_LEVELS.map((level, idx) => {
    const percentage = (idx / (DIFFICULTY_LEVELS.length - 1)) * 100;
    return `${DIFFICULTY_COLORS[level]} ${percentage}%`;
  }).join(', ');
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </label>
      )}
      
      <div className="space-y-3">
        {/* Current difficulty display */}
        <div 
          className="text-center py-2 px-4 rounded-lg font-semibold transition-colors"
          style={{
            backgroundColor: `${currentColor}20`,
            color: currentColor,
            border: `2px solid ${currentColor}40`,
          }}
        >
          {getDifficultyLabel(DIFFICULTY_LEVELS[validIndex])}
        </div>
        
        {/* Slider */}
        <div className="relative px-2">
          <input
            type="range"
            min="0"
            max={DIFFICULTY_LEVELS.length - 1}
            value={validIndex}
            onChange={handleSliderChange}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer difficulty-slider"
            style={{
              background: `linear-gradient(to right, ${gradientStops})`,
            }}
          />
          
          {/* Tick marks */}
          <div className="flex justify-between mt-2 px-1">
            {DIFFICULTY_LEVELS.map((level, idx) => (
              <div
                key={level}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => onChange(level)}
              >
                <div
                  className={`w-2 h-2 rounded-full mb-1 transition-all ${
                    idx === validIndex ? 'scale-150' : 'scale-100'
                  }`}
                  style={{
                    backgroundColor: DIFFICULTY_COLORS[level],
                    opacity: idx === validIndex ? 1 : 0.5,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Labels */}
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>{getDifficultyLabel('FREE_WIN')}</span>
          <span>{getDifficultyLabel('FREE_LOSE')}</span>
        </div>
      </div>
      
      <style jsx>{`
        .difficulty-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${currentColor};
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: all 0.2s;
        }
        
        .difficulty-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
        }
        
        .difficulty-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${currentColor};
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: all 0.2s;
        }
        
        .difficulty-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
};
