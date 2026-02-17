import React from 'react';

// Helper to get champion icon URL from Data Dragon
const getChampionIconUrl = (championName: string): string => {
  // Normalize champion name for Data Dragon API
  // Remove spaces, apostrophes, and special characters
  let normalized = championName.replace(/['\s.&]/g, '');
  
  // Special cases for champions with different Data Dragon names
  const specialCases: Record<string, string> = {
    'Wukong': 'MonkeyKing',
    'RenataGlasc': 'Renata',
    'NunuWillump': 'Nunu',
    'Nunu&Willump': 'Nunu',
    'KaiSa': 'Kaisa',
    'Kai\'Sa': 'Kaisa',
    'KhaZix': 'Khazix',
    'Kha\'Zix': 'Khazix',
    'ChoGath': 'Chogath',
    'Cho\'Gath': 'Chogath',
    'KogMaw': 'KogMaw',
    'Kog\'Maw': 'KogMaw',
    'RekSai': 'RekSai',
    'Rek\'Sai': 'RekSai',
    'VelKoz': 'Velkoz',
    'Vel\'Koz': 'Velkoz',
    'LeBlanc': 'Leblanc',
    'BelVeth': 'Belveth',
    'Bel\'Veth': 'Belveth',
  };
  
  // Check special cases first (including original name)
  if (specialCases[championName]) {
    normalized = specialCases[championName];
  } else {
    normalized = specialCases[normalized] || normalized;
  }
  
  return `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/${normalized}.png`;
};

interface ChampionPoolProps {
  championList: string[];
  championTierlist: { S: string[]; A: string[]; B: string[]; C: string[] };
  isEditMode: boolean;
  isValidChampion: (name: string) => boolean;
  onAddToTier: (tier: 'S' | 'A' | 'B' | 'C', champion: string) => void;
  onRemoveFromTier: (tier: 'S' | 'A' | 'B' | 'C', champion: string) => void;
}

export const ChampionPool: React.FC<ChampionPoolProps> = ({
  championTierlist,
  isEditMode,
  isValidChampion,
  onAddToTier,
  onRemoveFromTier
}) => {
  const [championInput, setChampionInput] = React.useState('');
  
  const handleAddChampion = (tier: 'S' | 'A' | 'B' | 'C') => {
    const trimmed = championInput.trim();
    if (!trimmed) return;
    
    if (!isValidChampion(trimmed)) {
      alert(`"${trimmed}" is not a valid champion name`);
      return;
    }
    
    onAddToTier(tier, trimmed);
    setChampionInput('');
  };

  const tiers: Array<{ key: 'S' | 'A' | 'B' | 'C'; label: string; color: string }> = [
    { key: 'S', label: 'S Tier', color: '#FFD700' },
    { key: 'A', label: 'A Tier', color: '#C0C0C0' },
    { key: 'B', label: 'B Tier', color: '#CD7F32' },
    { key: 'C', label: 'C Tier', color: '#808080' },
  ];

  return (
    <div className="space-y-4">
      {isEditMode && (
        <div className="flex gap-2">
          <input
            type="text"
            value={championInput}
            onChange={(e) => setChampionInput(e.target.value)}
            placeholder="Enter champion name..."
            className="flex-1 px-3 py-2 rounded border"
            style={{
              backgroundColor: 'var(--color-input-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddChampion('S');
              }
            }}
          />
        </div>
      )}
      
      {tiers.map(({ key, label, color }) => (
        <div key={key} className="p-3 rounded-lg" style={{
          backgroundColor: 'var(--color-card)',
          borderLeft: `4px solid ${color}`,
        }}>
          <div className="font-bold mb-2" style={{ color }}>
            {label}
          </div>
          <div className="flex flex-wrap gap-2">
            {championTierlist[key].length === 0 ? (
              <span className="text-sm opacity-50">No champions</span>
            ) : (
              championTierlist[key].map((champ) => {
                return (
                  <div
                    key={champ}
                    className="px-2 py-1 rounded-lg text-sm flex items-center gap-2 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {/* Diagnostic test with visible content */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#00ff00',
                        border: '3px solid #ff0000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '20px',
                        fontWeight: 'bold',
                      }}
                    >
                      ?
                    </div>
                    <span className="font-medium">{champ}</span>
                    {isEditMode && (
                      <button
                        onClick={() => onRemoveFromTier(key, champ)}
                        className="ml-1 hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--color-error)' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })
            )}
            {isEditMode && championInput && isValidChampion(championInput) && (
              <button
                onClick={() => handleAddChampion(key)}
                className="px-3 py-1 rounded-full text-sm border-dashed border-2"
                style={{
                  borderColor: color,
                  color,
                }}
              >
                + Add to {key}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
