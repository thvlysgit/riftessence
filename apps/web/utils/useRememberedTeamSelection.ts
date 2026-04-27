import { useEffect, useState } from 'react';
import { getStorageItem, setStorageItem } from './storage';

const DEFAULT_TEAM_SELECTION_STORAGE_KEY = 'riftessence:last-selected-team-id';

export function useRememberedTeamSelection(teamIds: string[], storageKey = DEFAULT_TEAM_SELECTION_STORAGE_KEY) {
  const [selectedTeamId, setSelectedTeamId] = useState('');

  useEffect(() => {
    if (!teamIds.length) {
      if (selectedTeamId) {
        setSelectedTeamId('');
      }
      return;
    }

    const rememberedTeamId = getStorageItem(storageKey);
    if (rememberedTeamId && teamIds.includes(rememberedTeamId)) {
      if (rememberedTeamId !== selectedTeamId) {
        setSelectedTeamId(rememberedTeamId);
      }
      return;
    }

    if (!selectedTeamId || !teamIds.includes(selectedTeamId)) {
      setSelectedTeamId(teamIds[0]);
    }
  }, [selectedTeamId, storageKey, teamIds]);

  useEffect(() => {
    if (!selectedTeamId) return;
    setStorageItem(storageKey, selectedTeamId);
  }, [selectedTeamId, storageKey]);

  return [selectedTeamId, setSelectedTeamId] as const;
}