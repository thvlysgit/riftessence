import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useGlobalUI } from './GlobalUI';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const THEMES = [
  { key: 'classic', nameKey: 'onboarding.themeClassic', descKey: 'onboarding.themeClassicDesc' },
  { key: 'infernal-ember', nameKey: 'onboarding.themeInfernalEmber', descKey: 'onboarding.themeInfernalEmberDesc' },
  { key: 'arcane-pastel', nameKey: 'onboarding.themeArcanePastel', descKey: 'onboarding.themeArcanePastelDesc' },
  { key: 'nightshade', nameKey: 'onboarding.themeNightshade', descKey: 'onboarding.themeNightshadeDesc' },
] as const;

const LANGUAGES = [
  'English',
  'Spanish', 
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Polish',
  'Russian',
  'Korean',
  'Japanese',
];

export default function OnboardingWizard() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();
  const { showToast } = useGlobalUI();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState(theme.name);
  const [saving, setSaving] = useState(false);

  // Check if onboarding should be shown
  const shouldShow = user && !user.onboardingCompleted;
  const hasRiotAccount = (user?.riotAccountsCount || 0) > 0;
  
  // Hide wizard on authenticate page so user can link their account
  const isOnAuthenticatePage = router.pathname === '/authenticate';

  // Close wizard when user completes onboarding or has riot account
  useEffect(() => {
    if (user?.onboardingCompleted) {
      return;
    }
  }, [user]);

  if (!shouldShow || isOnAuthenticatePage) {
    return null;
  }

  const handleClose = async () => {
    // Can only close if user has riot account
    if (!hasRiotAccount) {
      showToast(t('onboarding.linkRiotRequired'), 'error');
      return;
    }

    // Mark onboarding as completed
    try {
      await fetch(`${API_URL}/api/user/onboarding-complete`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      await refreshUser();
    } catch (err) {
      console.error('Failed to mark onboarding complete:', err);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 0) {
      // Step 0: Link Riot Account
      if (!hasRiotAccount) {
        // User needs to link account - navigate to authenticate page
        router.push('/authenticate?returnUrl=/feed');
        return;
      }
      // User already has riot account - advance to next step
      setCurrentStep(currentStep + 1);
      return;
    }

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save languages if selected
      if (selectedLanguages.length > 0) {
        await fetch(`${API_URL}/api/user/languages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ languages: selectedLanguages }),
        });
      }

      // Apply selected theme
      if (selectedTheme !== theme.name) {
        setTheme(selectedTheme);
      }

      // Mark onboarding as completed
      await fetch(`${API_URL}/api/user/onboarding-complete`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      await refreshUser();
      showToast('Welcome to RiftEssence! 🎉', 'success');
      router.push('/create');
    } catch (err) {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
    } else if (selectedLanguages.length < 3) {
      setSelectedLanguages([...selectedLanguages, lang]);
    } else {
      showToast('You can select up to 3 languages', 'info');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Link Your Riot Account
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Connect your League of Legends account to get started and unlock all features
              </p>
            </div>

            {hasRiotAccount ? (
              <div className="text-center p-4 rounded border" style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                borderColor: 'var(--color-border)' 
              }}>
                <div className="text-3xl mb-2">✓</div>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Riot Account Connected!
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Let's personalize your profile
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded border" style={{ 
                  backgroundColor: 'var(--color-bg-tertiary)', 
                  borderColor: 'var(--color-border)' 
                }}>
                  <span style={{ color: 'var(--color-accent-1)' }}>1.</span>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Change your summoner icon in the League client
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded border" style={{ 
                  backgroundColor: 'var(--color-bg-tertiary)', 
                  borderColor: 'var(--color-border)' 
                }}>
                  <span style={{ color: 'var(--color-accent-1)' }}>2.</span>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Enter your summoner name and verify
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded border" style={{ 
                  backgroundColor: 'var(--color-bg-tertiary)', 
                  borderColor: 'var(--color-border)' 
                }}>
                  <span style={{ color: 'var(--color-accent-1)' }}>3.</span>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Come back here to continue onboarding
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">�</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Choose Your Languages
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Select up to 3 languages you speak to find teammates (optional)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className="px-4 py-3 text-sm font-medium border transition-all rounded"
                  style={{
                    backgroundColor: selectedLanguages.includes(lang) 
                      ? 'var(--color-accent-1)' 
                      : 'var(--color-bg-tertiary)',
                    borderColor: selectedLanguages.includes(lang) 
                      ? 'var(--color-accent-1)' 
                      : 'var(--color-border)',
                    color: selectedLanguages.includes(lang) 
                      ? 'var(--color-bg-primary)' 
                      : 'var(--color-text-primary)',
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎨</div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Choose Your Theme
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Personalize your experience with a theme that suits your style
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {THEMES.map(themeItem => (
                <button
                  key={themeItem.key}
                  onClick={() => setSelectedTheme(themeItem.key as any)}
                  className="p-4 text-left border transition-all rounded"
                  style={{
                    backgroundColor: selectedTheme === themeItem.key 
                      ? 'var(--color-bg-tertiary)' 
                      : 'var(--color-bg-secondary)',
                    borderColor: selectedTheme === themeItem.key 
                      ? 'var(--color-accent-1)' 
                      : 'var(--color-border)',
                    borderWidth: selectedTheme === themeItem.key ? '2px' : '1px',
                  }}
                >
                  <div className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {t(themeItem.nameKey)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {t(themeItem.descKey)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Progress calculation
  const totalSteps = 3;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
    >
      <div 
        className="w-full max-w-lg rounded-xl shadow-2xl"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-accent-1)' }}>
              Welcome to RiftEssence
            </h1>
            {hasRiotAccount && (
              <button
                onClick={handleClose}
                className="text-sm px-3 py-1 rounded transition-colors"
                style={{
                  color: 'var(--color-text-muted)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                }}
              >
                Skip
              </button>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className="px-4 py-2 font-semibold rounded transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            Back
          </button>
          
          <button
            onClick={handleNextStep}
            disabled={saving}
            className="px-6 py-2 font-bold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
              color: 'var(--color-bg-primary)',
            }}
          >
            {saving ? 'Saving...' : currentStep === 2 ? 'Finish & Create Post' : currentStep === 0 && !hasRiotAccount ? 'Link Account' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
