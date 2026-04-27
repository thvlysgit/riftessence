import { useEffect, useState } from 'react';
import { getStorageItem, setStorageItem } from './storage';

const DEFAULT_TEAM_SELECTION_STORAGE_KEY = 'riftessence:last-selected-team-id';

export function useRememberedTeamSelection(teamIds: string[], storageKey = DEFAULT_TEAM_SELECTION_STORAGE_KEY) {
  const [selectedTeamId, setSelectedTeamId] = useState(() => getStorageItem(storageKey) || '');

  useEffect(() => {
    if (!teamIds.length) {
      if (selectedTeamId) {
        setSelectedTeamId('');
      }
      return;
    }

    if (selectedTeamId && teamIds.includes(selectedTeamId)) {
      return;
    }

    const rememberedTeamId = getStorageItem(storageKey);
    const nextTeamId = rememberedTeamId && teamIds.includes(rememberedTeamId) ? rememberedTeamId : teamIds[0];
    if (nextTeamId !== selectedTeamId) {
      setSelectedTeamId(nextTeamId);
    }
  }, [selectedTeamId, storageKey, teamIds]);

  useEffect(() => {
    if (!selectedTeamId) return;
    setStorageItem(storageKey, selectedTeamId);
  }, [selectedTeamId, storageKey]);

  return [selectedTeamId, setSelectedTeamId] as const;
}