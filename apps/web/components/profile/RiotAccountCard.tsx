import React from 'react';

type RiotAccount = {
  id: string;
  gameName: string;
  tagLine: string;
  region: string;
  isMain: boolean;
  verified: boolean;
  hidden: boolean;
  rank?: string;
  division?: string | null;
  winrate?: number | null;
  profileIconId?: number;
};

interface RiotAccountCardProps {
  account: RiotAccount;
  isEditable: boolean;
  onSetMain?: (accountId: string) => void;
  onToggleHidden?: (accountId: string) => void;
  onRemove?: (accountId: string) => void;
  rankColor: (rank: string) => string;
}

export const RiotAccountCard: React.FC<RiotAccountCardProps> = ({
  account,
  isEditable,
  onSetMain,
  onToggleHidden,
  onRemove,
  rankColor
}) => {
  return (
    <div className="relative p-4 rounded-lg border" style={{
      borderColor: account.isMain ? 'var(--color-accent-1)' : 'var(--color-border)',
      backgroundColor: 'var(--color-card)',
    }}>
      {account.isMain && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold" style={{
          backgroundColor: 'var(--color-accent-1)',
          color: 'var(--color-bg-primary)',
        }}>
          MAIN
        </div>
      )}
      
      <div className="flex items-start gap-3">
        {account.profileIconId && (
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${account.profileIconId}.png`}
            alt="Profile Icon"
            className="w-16 h-16 rounded"
          />
        )}
        
        <div className="flex-1">
          <div className="font-bold text-lg">
            {account.gameName}#{account.tagLine}
          </div>
          <div className="text-sm opacity-75">{account.region}</div>
          
          {account.rank && (
            <div className="mt-2 flex items-center gap-2">
              <span className="font-bold" style={{ color: rankColor(account.rank) }}>
                {account.rank} {account.division || ''}
              </span>
              {account.winrate && (
                <span className="text-sm opacity-75">
                  {account.winrate.toFixed(1)}% WR
                </span>
              )}
            </div>
          )}
          
          {account.hidden && (
            <div className="mt-2 text-xs opacity-50">Hidden from public</div>
          )}
        </div>
      </div>
      
      {isEditable && (
        <div className="mt-3 flex gap-2">
          {!account.isMain && onSetMain && (
            <button
              onClick={() => onSetMain(account.id)}
              className="px-3 py-1 text-sm rounded"
              style={{
                backgroundColor: 'var(--color-accent-1)',
                color: 'var(--color-bg-primary)',
              }}
            >
              Set as Main
            </button>
          )}
          {onToggleHidden && (
            <button
              onClick={() => onToggleHidden(account.id)}
              className="px-3 py-1 text-sm rounded border"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {account.hidden ? 'Show' : 'Hide'}
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(account.id)}
              className="px-3 py-1 text-sm rounded border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
};
