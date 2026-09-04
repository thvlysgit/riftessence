import React from 'react';
import { getProfileIconUrl } from '../utils/championData';

type Props = {
  targetIconId: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Shared wording and interaction for every icon-based ownership challenge. */
export function RiotIconConfirmation({ targetIconId, checked, onChange }: Props) {
  return <div className="space-y-5">
    <div className="rounded-xl p-5 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)' }}>
      <img src={getProfileIconUrl(targetIconId)} alt={`Assigned profile icon ${targetIconId}`} className="mx-auto h-24 w-24 rounded-lg" />
      <p className="mt-3 font-semibold" style={{ color: 'var(--accent-primary)' }}>Change to this icon in the League client</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Icon {targetIconId} is assigned by RiftEssence and cannot be chosen.</p>
    </div>
    <label className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      I changed my icon and will keep it for at least 30 minutes.
    </label>
    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Checks run automatically at 5, 15, and 30 minutes. You can continue immediately. If Riot is delayed, keep the icon until verification finishes.</p>
  </div>;
}
