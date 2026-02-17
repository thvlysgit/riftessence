import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useGlobalUI } from '../../components/GlobalUI';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ChampionAutocomplete } from '../../components/ChampionAutocomplete';
import { DifficultySlider } from '../../components/DifficultySlider';
import { getAuthHeader } from '../../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL'];

// Role icon helper
const getRoleIcon = (role: string) => {
  const r = role.toUpperCase();
  switch(r) {
    case 'TOP':
      return <svg className="w-5 h-5" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c32.06 0 64.12-.01 96.18.01-6.72 6.67-13.45 13.33-20.19 19.99H36v56c-6.66 6.73-13.33 13.46-19.99 20.18-.02-32.06 0-64.12-.01-96.18Z"/><path d="M104 44.02c5.32-5.33 10.65-10.64 15.99-15.94.02 30.64.01 61.28.01 91.92-30.64 0-61.28.01-91.93-.01 5.33-5.34 10.66-10.66 16-15.99 19.97-.01 39.95.01 59.93 0V44.02Z" opacity="0.75"/><path d="M56 56h28v28H56V56Z" opacity="0.75"/></svg>;
    case 'JUNGLE':
      return <svg className="w-5 h-5" viewBox="0 0 136 136" fill="currentColor"><path d="M72.13 57.86C78.7 41.1 90.04 26.94 99.94 12.1 93 29.47 84.31 46.87 84.04 65.97c-.73 4.81-2.83 9.31-4 14.03-2.08-7.57-4.91-14.9-7.91-22.14ZM36.21 12.35c13.06 20.19 26.67 40.61 33.61 63.87 4.77 15.49 5.42 32.94-1.8 47.8-5.58-6.1-11.08-12.29-16.71-18.34-4.97-4.72-10.26-9.1-15.32-13.71-1.55-11.73-2.97-23.87-8.72-34.42-2.75-5.24-6.71-9.72-11.19-13.55 9.67 4.75 19.18 10.41 26.23 18.72 4.37 4.98 7.46 10.94 9.69 17.15 1.15-10.29.58-20.79-2.05-30.81-3.31-12.68-8.99-24.55-13.74-36.71ZM105.84 53.83c4.13-4 8.96-7.19 14.04-9.84-4.4 3.88-8.4 8.32-11.14 13.55-5.75 10.56-7.18 22.71-8.74 34.45-5.32 5.35-10.68 10.65-15.98 16.01.15-4.37-.25-8.84 1.02-13.1 3.39-15.08 9.48-30.18 20.8-41.07Z"/></svg>;
    case 'MID':
    case 'MIDDLE':
      return <svg className="w-5 h-5" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c22.67 0 45.33 0 67.99.01C78.62 21.34 73.28 26.69 67.88 32c-11.96 0-23.92-.01-35.88 0-.01 12 .01 24-.01 36-5.32 5.3-10.64 10.6-15.98 15.89C15.99 61.26 16 38.63 16 16zm87.95 51.9c5.32-5.37 10.69-10.68 16.04-16.02.02 22.71.01 45.41 0 68.12-22.65 0-45.31.01-67.97-.01 5.33-5.33 10.65-10.67 15.99-15.99 12-.01 23.99.01 35.99 0 .04-12.04-.05-24.07-.05-36.1z" opacity="0.75"/><path d="M100.02 16H120v19.99C92 64 64 92 35.99 120H16v-19.99C44 72 72 43.99 100.02 16z"/></svg>;
    case 'ADC':
    case 'BOT':
    case 'BOTTOM':
      return <svg className="w-5 h-5" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16h19.99C64 44 92 72 120 100.02V120h-19.99C72 92 44 64 16 35.99V16z"/><path d="M32.03 120H16v-15.99c28-28.01 56.01-56 84.02-83.99V36c-22.67 0-45.33.01-67.99-.01 5.33 5.35 10.67 10.69 15.99 16.01 12 .01 24-.01 36 .01.01 11.96-.01 23.92 0 35.88-5.3 5.32-10.6 10.64-15.89 15.98-12.04.02-24.07-.05-36.1-.05V120z" opacity="0.75"/><path d="M56 56h28v28H56V56z" opacity="0.75"/></svg>;
    case 'SUPPORT':
    case 'SUP':
      return <svg className="w-5 h-5" viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
    case 'FILL':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M6 12h12"/></svg>;
    default:
      return null;
  }
};

const CreateMatchupPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useGlobalUI();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state
  const [role, setRole] = useState('');
  const [myChampion, setMyChampion] = useState('');
  const [enemyChampion, setEnemyChampion] = useState('');
  const [difficulty, setDifficulty] = useState('SKILL_MATCHUP');
  const [laningNotes, setLaningNotes] = useState('');
  const [teamfightNotes, setTeamfightNotes] = useState('');
  const [itemBuild, setItemBuild] = useState('');
  const [powerSpikes, setPowerSpikes] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Fetch existing matchup if in edit mode
  useEffect(() => {
    if (id && user) {
      setIsEditMode(true);
      fetchMatchup();
    }
  }, [id, user]);
  
  const fetchMatchup = async () => {
    setIsFetchingData(true);
    try {
      const response = await fetch(`${API_URL}/api/matchups/${id}`, {
        headers: getAuthHeader() as Record<string, string>,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch matchup');
      }
      
      const data = await response.json();
      const matchup = data.matchup;
      
      // Pre-fill form
      setRole(matchup.role || '');
      setMyChampion(matchup.myChampion || '');
      setEnemyChampion(matchup.enemyChampion || '');
      setDifficulty(matchup.difficulty || 'SKILL_MATCHUP');
      setLaningNotes(matchup.laningNotes || '');
      setTeamfightNotes(matchup.teamfightNotes || '');
      setItemBuild(matchup.itemNotes || '');
      setPowerSpikes(matchup.spikeNotes || '');
      setIsPublic(matchup.isPublic || false);
      setTitle(matchup.title || '');
      setDescription(matchup.description || '');
    } catch (error) {
      console.error('Error fetching matchup:', error);
      showToast(t('common.error'), 'error');
      router.push('/matchups');
    } finally {
      setIsFetchingData(false);
    }
  };
  
  const validateForm = (): boolean => {
    if (!role || !myChampion || !enemyChampion) {
      showToast(t('matchups.fieldsRequired'), 'error');
      return false;
    }
    
    if (isPublic && !title.trim()) {
      showToast(t('matchups.titleRequired'), 'error');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const payload = {
        userId: user?.id,
        role,
        myChampion,
        enemyChampion,
        difficulty,
        laningNotes,
        teamfightNotes,
        itemNotes: itemBuild,
        spikeNotes: powerSpikes,
        isPublic,
        title: isPublic ? title : undefined,
        description: isPublic ? description : undefined,
      };
      
      const url = isEditMode 
        ? `${API_URL}/api/matchups/${id}`
        : `${API_URL}/api/matchups`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        } as Record<string, string>,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save matchup');
      }
      
      showToast(
        isEditMode ? t('matchups.updated') : t('matchups.created'),
        'success'
      );
      router.push('/matchups');
    } catch (error: any) {
      console.error('Error saving matchup:', error);
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    router.push('/matchups');
  };
  
  if (!user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div 
          className="max-w-md w-full mx-4 p-8 rounded-lg text-center"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2 
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Authentication Required
          </h2>
          <p 
            className="mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            You must be logged in to create matchup guides.
          </p>
          <Link href="/login">
            <button
              className="px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                background: 'var(--btn-gradient)',
                color: 'var(--btn-gradient-text)',
              }}
            >
              {t('nav.login')}
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (isFetchingData) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {isEditMode ? t('matchups.editMatchup') : t('matchups.create')}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {isEditMode ? 'Update your matchup guide' : 'Create a new matchup guide'}
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div 
            className="rounded-lg p-6 space-y-6"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Role Selector */}
            <div>
              <label 
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('matchups.role')} *
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`p-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${
                      role === r ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: role === r 
                        ? 'var(--color-accent-primary-bg)' 
                        : 'var(--color-bg-tertiary)',
                      color: role === r 
                        ? 'var(--color-accent-1)' 
                        : 'var(--color-text-secondary)',
                      borderColor: role === r 
                        ? 'var(--color-accent-1)' 
                        : 'transparent',
                    }}
                  >
                    {getRoleIcon(r)}
                    <span className="text-xs font-medium">{r}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Champion Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChampionAutocomplete
                value={myChampion}
                onChange={setMyChampion}
                label={`${t('matchups.myChampion')} *`}
                placeholder={t('matchups.searchPlaceholder')}
              />
              
              <ChampionAutocomplete
                value={enemyChampion}
                onChange={setEnemyChampion}
                label={`${t('matchups.enemyChampion')} *`}
                placeholder={t('matchups.searchPlaceholder')}
              />
            </div>
            
            {/* Difficulty Slider */}
            <DifficultySlider
              value={difficulty}
              onChange={setDifficulty}
              label={t('matchups.difficulty')}
            />
            
            {/* Notes Sections */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('matchups.laningPhase')}
              </label>
              <textarea
                value={laningNotes}
                onChange={(e) => setLaningNotes(e.target.value.slice(0, 2000))}
                placeholder={t('matchups.laningNotesPlaceholder')}
                rows={4}
                className="w-full px-4 py-3 rounded-lg resize-none"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <div 
                className="text-xs text-right mt-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {2000 - laningNotes.length} {t('matchups.charactersRemaining')}
              </div>
            </div>
            
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('matchups.teamFights')}
              </label>
              <textarea
                value={teamfightNotes}
                onChange={(e) => setTeamfightNotes(e.target.value.slice(0, 2000))}
                placeholder={t('matchups.teamfightNotesPlaceholder')}
                rows={4}
                className="w-full px-4 py-3 rounded-lg resize-none"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <div 
                className="text-xs text-right mt-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {2000 - teamfightNotes.length} {t('matchups.charactersRemaining')}
              </div>
            </div>
            
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('matchups.items')}
              </label>
              <textarea
                value={itemBuild}
                onChange={(e) => setItemBuild(e.target.value.slice(0, 2000))}
                placeholder={t('matchups.itemNotesPlaceholder')}
                rows={4}
                className="w-full px-4 py-3 rounded-lg resize-none"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <div 
                className="text-xs text-right mt-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {2000 - itemBuild.length} {t('matchups.charactersRemaining')}
              </div>
            </div>
            
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('matchups.powerSpikes')}
              </label>
              <textarea
                value={powerSpikes}
                onChange={(e) => setPowerSpikes(e.target.value.slice(0, 2000))}
                placeholder={t('matchups.spikeNotesPlaceholder')}
                rows={4}
                className="w-full px-4 py-3 rounded-lg resize-none"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <div 
                className="text-xs text-right mt-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {2000 - powerSpikes.length} {t('matchups.charactersRemaining')}
              </div>
            </div>
            
            {/* Public Sharing Toggle */}
            <div 
              className="pt-4 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer"
                  style={{
                    accentColor: 'var(--color-accent-1)',
                  }}
                />
                <span 
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {t('matchups.makePublic')}
                </span>
              </label>
            </div>
            
            {/* Public Fields */}
            {isPublic && (
              <div className="space-y-4 pt-4">
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {t('matchups.titleLabel')} *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                    placeholder={t('matchups.titlePlaceholder')}
                    className="w-full px-4 py-3 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <div 
                    className="text-xs text-right mt-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {100 - title.length} {t('matchups.charactersRemaining')}
                  </div>
                </div>
                
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {t('matchups.descriptionLabel')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                    placeholder={t('matchups.descriptionPlaceholder')}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg resize-none"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <div 
                    className="text-xs text-right mt-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {500 - description.length} {t('matchups.charactersRemaining')}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {t('matchups.cancel')}
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              style={{
                background: 'var(--btn-gradient)',
                color: 'var(--btn-gradient-text)',
              }}
            >
              {isLoading 
                ? t('common.saving') 
                : isEditMode 
                  ? t('matchups.update') 
                  : t('matchups.save')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMatchupPage;
