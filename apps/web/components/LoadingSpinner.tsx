import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const LoadingSpinner: React.FC<{ text?: string }> = ({ text }) => {
  const { theme } = useTheme();

  const renderAnimation = () => {
    switch (theme.name) {
      case 'infernal-ember':
        return (
          <div className="relative w-24 h-32">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes flame-flicker {
                0%, 100% { 
                  transform: translateY(0) scaleY(1) scaleX(1);
                  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                }
                25% { 
                  transform: translateY(-6px) scaleY(1.1) scaleX(0.95);
                  border-radius: 50% 50% 50% 50% / 70% 70% 30% 30%;
                }
                50% { 
                  transform: translateY(-3px) scaleY(0.95) scaleX(1.05);
                  border-radius: 50% 50% 50% 50% / 55% 55% 45% 45%;
                }
                75% { 
                  transform: translateY(-8px) scaleY(1.15) scaleX(0.9);
                  border-radius: 50% 50% 50% 50% / 65% 65% 35% 35%;
                }
              }
              @keyframes flame-inner {
                0%, 100% { 
                  transform: translateY(0) scaleY(1);
                  opacity: 1;
                }
                50% { 
                  transform: translateY(-5px) scaleY(1.2);
                  opacity: 0.8;
                }
              }
              @keyframes ember-glow {
                0%, 100% { 
                  filter: blur(3px) brightness(1);
                  box-shadow: 0 0 30px rgba(181, 0, 0, 0.8), 0 0 60px rgba(255, 95, 31, 0.5);
                }
                50% { 
                  filter: blur(4px) brightness(1.2);
                  box-shadow: 0 0 40px rgba(181, 0, 0, 1), 0 0 80px rgba(255, 95, 31, 0.7);
                }
              }
            `}} />
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-24"
              style={{
                background: 'linear-gradient(to top, #B50000 0%, #FF5F1F 50%, #FFB347 100%)',
                animation: 'flame-flicker 1.5s ease-in-out infinite, ember-glow 2.5s ease-in-out infinite',
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              }}
            />
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-20"
              style={{
                background: 'linear-gradient(to top, #FF5F1F 0%, #FFD700 70%, #FFF 100%)',
                animation: 'flame-flicker 1.2s ease-in-out infinite 0.3s, flame-inner 1s ease-in-out infinite',
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              }}
            />
          </div>
        );

      case 'nightshade':
        return (
          <div className="relative w-20 h-20">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes moon-pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.7; }
              }
              @keyframes moon-glow {
                0%, 100% { box-shadow: 0 0 20px rgba(181, 124, 255, 0.6), 0 0 40px rgba(60, 239, 255, 0.3); }
                50% { box-shadow: 0 0 35px rgba(181, 124, 255, 0.9), 0 0 60px rgba(60, 239, 255, 0.5); }
              }
              @keyframes stars-twinkle {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 1; }
              }
            `}} />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #B57CFF, #3CEFFF)',
                animation: 'moon-pulse 2s ease-in-out infinite, moon-glow 3s ease-in-out infinite',
              }}
            />
            <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-white" style={{ animation: 'stars-twinkle 1.5s ease-in-out infinite' }} />
            <div className="absolute top-4 right-3 w-1 h-1 rounded-full bg-white" style={{ animation: 'stars-twinkle 2s ease-in-out infinite 0.5s' }} />
            <div className="absolute bottom-3 left-4 w-1 h-1 rounded-full bg-white" style={{ animation: 'stars-twinkle 1.8s ease-in-out infinite 0.3s' }} />
          </div>
        );

      case 'arcane-pastel':
        return (
          <div className="relative w-20 h-20">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes magic-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes sparkle-fade {
                0%, 100% { opacity: 0; transform: scale(0); }
                50% { opacity: 1; transform: scale(1); }
              }
            `}} />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4"
              style={{
                borderColor: `${theme.colors.accent1} ${theme.colors.accent2} ${theme.colors.accent3} ${theme.colors.accent1}`,
                animation: 'magic-spin 1.5s linear infinite',
              }}
            />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.colors.accent1}, ${theme.colors.accent2})`,
                animation: 'sparkle-fade 1.5s ease-in-out infinite',
              }}
            />
          </div>
        );

      case 'radiant-light':
        return (
          <div className="relative w-20 h-20">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes radiant-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}} />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4 border-t-transparent"
              style={{
                borderColor: theme.colors.accent1,
                borderTopColor: 'transparent',
                animation: 'radiant-spin 1s linear infinite',
              }}
            />
          </div>
        );

      case 'classic':
      default:
        return (
          <div className="relative w-20 h-20">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes classic-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes gold-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
              }
            `}} />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-4 border-t-transparent"
              style={{
                borderColor: theme.colors.accent1,
                borderTopColor: 'transparent',
                animation: 'classic-spin 1s linear infinite, gold-pulse 2s ease-in-out infinite',
              }}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.colors.bgPrimary }}>
      {renderAnimation()}
    </div>
  );
};
