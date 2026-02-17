import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const LoadingSpinner: React.FC<{ text?: string; compact?: boolean }> = ({ text, compact = false }) => {
  const { theme } = useTheme();

  const renderAnimation = () => {
    switch (theme.name) {
      case 'infernal-ember':
        return (
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="relative w-16 h-24">
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
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-20"
                style={{
                  background: 'linear-gradient(to top, #B50000 0%, #FF5F1F 50%, #FFB347 100%)',
                  animation: 'flame-flicker 1.5s ease-in-out infinite, ember-glow 2.5s ease-in-out infinite',
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                }}
              />
              <div 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-16"
                style={{
                  background: 'linear-gradient(to top, #FF5F1F 0%, #FFD700 70%, #FFF 100%)',
                  animation: 'flame-flicker 1.2s ease-in-out infinite 0.3s, flame-inner 1s ease-in-out infinite',
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                }}
              />
            </div>
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

      case 'ocean-depths':
        return (
          <div className="relative w-20 h-20">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes water-vortex {
                0% { transform: rotate(0deg) scale(1); }
                50% { transform: rotate(180deg) scale(1.05); }
                100% { transform: rotate(360deg) scale(1); }
              }
              @keyframes bubble-rise {
                0% { 
                  transform: translateY(0) scale(0);
                  opacity: 0;
                }
                20% { 
                  opacity: 0.8;
                  transform: translateY(-5px) scale(1);
                }
                80% { 
                  opacity: 0.8;
                  transform: translateY(-35px) scale(1);
                }
                100% { 
                  transform: translateY(-40px) scale(0);
                  opacity: 0;
                }
              }
              @keyframes wave-pulse {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
              }
            `}} />
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, #1C2A3A, #00B8D4, #00D9FF, #00B8D4, #1C2A3A)`,
                animation: 'water-vortex 2s ease-in-out infinite, wave-pulse 3s ease-in-out infinite',
                filter: 'blur(1px)',
              }}
            />
            <div 
              className="absolute bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
              style={{
                backgroundColor: '#00D9FF',
                animation: 'bubble-rise 2.5s ease-in-out infinite',
              }}
            />
            <div 
              className="absolute bottom-2 left-1/3 w-2 h-2 rounded-full"
              style={{
                backgroundColor: '#4DD0E1',
                animation: 'bubble-rise 2.8s ease-in-out infinite 0.5s',
              }}
            />
            <div 
              className="absolute bottom-2 right-1/3 w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: '#00B8D4',
                animation: 'bubble-rise 2.3s ease-in-out infinite 1s',
              }}
            />
          </div>
        );

      case 'forest-mystic':
        return (
          <div className="relative w-20 h-20">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes leaf-orbit {
                0% { transform: translate(-50%, -50%) rotate(0deg) translateX(32px); }
                100% { transform: translate(-50%, -50%) rotate(360deg) translateX(32px); }
              }
              @keyframes nature-glow {
                0%, 100% { 
                  filter: drop-shadow(0 0 8px rgba(118, 255, 3, 0.6));
                }
                50% { 
                  filter: drop-shadow(0 0 15px rgba(118, 255, 3, 0.9));
                }
              }
            `}} />
            {/* Center circle */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full z-10"
              style={{
                backgroundColor: '#2B4A2B',
                border: '2px solid #76FF03',
              }}
            />
            {/* Individual rotating leaves */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: '18px',
                  height: '24px',
                  backgroundColor: i % 2 === 0 ? '#76FF03' : '#00E676',
                  borderRadius: '50% 0 50% 0',
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(32px)`,
                  animation: 'leaf-orbit 3s linear infinite, nature-glow 2s ease-in-out infinite',
                  animationDelay: `-${(angle / 360) * 3}s`,
                }}
              />
            ))}
          </div>
        );

      case 'sunset-blaze':
        return (
          <div className="relative w-20 h-20">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes ray-rotate {
                0% { transform: translate(-50%, -50%) rotate(0deg) translateY(-38px); }
                100% { transform: translate(-50%, -50%) rotate(360deg) translateY(-38px); }
              }
              @keyframes sun-pulse {
                0%, 100% { 
                  transform: translate(-50%, -50%) scale(1);
                  box-shadow: 0 0 20px rgba(255, 149, 0, 0.8), 0 0 40px rgba(255, 214, 10, 0.5);
                }
                50% { 
                  transform: translate(-50%, -50%) scale(1.1);
                  box-shadow: 0 0 30px rgba(255, 149, 0, 1), 0 0 60px rgba(255, 214, 10, 0.7);
                }
              }
              @keyframes ray-glow {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
              }
            `}} />
            {/* Sun core */}
            <div 
              className="absolute top-1/2 left-1/2 w-10 h-10 rounded-full"
              style={{
                background: `radial-gradient(circle, #FFD60A, #FF9500)`,
                animation: 'sun-pulse 2s ease-in-out infinite',
              }}
            />
            {/* Rotating rays - each independently animated */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: '3px',
                  height: '28px',
                  background: `linear-gradient(to top, ${i % 2 === 0 ? '#FF9500' : '#FFD60A'}, transparent)`,
                  borderRadius: '2px',
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-38px)`,
                  animation: 'ray-rotate 4s linear infinite, ray-glow 2s ease-in-out infinite',
                  animationDelay: `-${(angle / 360) * 4}s, ${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        );

      case 'shadow-assassin':
        return (
          <div className="relative w-20 h-20">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes smoke-orbit {
                0% { transform: translate(-18px, -5px) rotate(0deg) translateX(28px); }
                100% { transform: translate(-18px, -5px) rotate(360deg) translateX(28px); }
              }
              @keyframes smoke-fade {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 0.9; }
              }
              @keyframes shadow-glow {
                0%, 100% { 
                  filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.6));
                }
                50% { 
                  filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.9));
                }
              }
            `}} />
            {/* Center core */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full z-10"
              style={{
                background: `radial-gradient(circle, #A78BFA, #6D28D9)`,
                animation: 'smoke-fade 1.5s ease-in-out infinite',
              }}
            />
            {/* Individual rotating smoke trails */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: '36px',
                  height: '10px',
                  background: `linear-gradient(90deg, transparent, ${i % 3 === 0 ? '#8B5CF6' : i % 3 === 1 ? '#6D28D9' : '#A78BFA'}, transparent)`,
                  borderRadius: '50%',
                  transform: `translate(-18px, -5px) rotate(${angle}deg) translateX(28px)`,
                  animation: 'smoke-orbit 3s ease-in-out infinite, shadow-glow 2s ease-in-out infinite',
                  animationDelay: `-${(angle / 360) * 3}s`,
                  filter: 'blur(0.5px)',
                }}
              />
            ))}
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

  if (compact) {
    return (
      <div className="w-20 h-20 flex items-center justify-center mx-auto">
        {renderAnimation()}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.colors.bgPrimary }}>
      {renderAnimation()}
    </div>
  );
};
