import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const LoadingSpinner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme } = useTheme();
  const size = compact ? 96 : 112;

  const renderAnimation = () => {
    switch (theme.name) {
      case 'arcane-pastel':
        return (
          <div className="rift-spinner rift-spinner-arcane" aria-hidden="true">
            {[
              { color: '#FFB3D6', leaf: '#8EFFC1', angle: 0, shape: '46% 54% 48% 52%' },
              { color: '#FFCE9E', leaf: '#92E6A7', angle: 72, shape: '52% 48% 44% 56%' },
              { color: '#C6A7FF', leaf: '#8EFFC1', angle: 144, shape: '48% 52% 56% 44%' },
              { color: '#8EFFC1', leaf: '#C6A7FF', angle: 216, shape: '56% 44% 50% 50%' },
              { color: '#FFE69A', leaf: '#FFB3D6', angle: 288, shape: '50% 50% 42% 58%' },
            ].map((fruit, index) => (
              <span
                key={fruit.angle}
                className="arcane-fruit"
                style={{
                  '--fruit-color': fruit.color,
                  '--fruit-leaf': fruit.leaf,
                  '--fruit-angle': `${fruit.angle}deg`,
                  '--fruit-angle-inverse': `${-fruit.angle}deg`,
                  '--fruit-dance-angle': `${fruit.angle + 18}deg`,
                  '--fruit-dance-angle-inverse': `${-(fruit.angle + 18)}deg`,
                  '--fruit-delay': `${index * -0.16}s`,
                  borderRadius: fruit.shape,
                } as React.CSSProperties}
              />
            ))}
            <span className="arcane-sparkle" />
          </div>
        );

      case 'nightshade':
        return (
          <div className="rift-spinner rift-spinner-nightshade" aria-hidden="true">
            <span className="night-orbit" />
            <span className="night-moon" />
            <span className="night-star night-star-a" />
            <span className="night-star night-star-b" />
            <span className="night-star night-star-c" />
          </div>
        );

      case 'infernal-ember':
        return (
          <div className="rift-spinner rift-spinner-infernal" aria-hidden="true">
            <svg viewBox="0 0 120 120" className="infernal-flame" role="img">
              <defs>
                <radialGradient id="infernalGlow" cx="50%" cy="62%" r="48%">
                  <stop offset="0%" stopColor="#FFD27A" stopOpacity="0.95" />
                  <stop offset="42%" stopColor="#FF5F1F" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#B50000" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="infernalOuter" x1="0" x2="0" y1="1" y2="0">
                  <stop offset="0%" stopColor="#7A0903" />
                  <stop offset="42%" stopColor="#FF3B10" />
                  <stop offset="76%" stopColor="#FF9B27" />
                  <stop offset="100%" stopColor="#FFE7A3" />
                </linearGradient>
                <linearGradient id="infernalInner" x1="0" x2="0" y1="1" y2="0">
                  <stop offset="0%" stopColor="#FF5F1F" />
                  <stop offset="58%" stopColor="#FFD166" />
                  <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>
              </defs>
              <ellipse className="infernal-glow" cx="60" cy="78" rx="42" ry="35" fill="url(#infernalGlow)" />
              <path
                className="infernal-flame-outer"
                d="M60 108 C35 96 25 75 35 54 C40 41 50 35 50 18 C67 30 75 44 73 59 C82 51 86 43 86 33 C103 55 100 84 82 100 C76 105 69 108 60 108 Z"
                fill="url(#infernalOuter)"
              />
              <path
                className="infernal-flame-mid"
                d="M59 100 C43 91 39 76 45 63 C49 53 59 47 57 33 C69 43 75 55 72 68 C79 65 83 59 84 51 C94 69 88 91 72 99 C68 101 63 102 59 100 Z"
                fill="#FF8A1F"
                opacity="0.82"
              />
              <path
                className="infernal-flame-inner"
                d="M60 97 C50 90 49 78 54 70 C58 63 63 58 61 47 C72 59 76 75 68 89 C66 93 64 96 60 97 Z"
                fill="url(#infernalInner)"
              />
              <circle className="infernal-ember infernal-ember-a" cx="34" cy="82" r="2.2" />
              <circle className="infernal-ember infernal-ember-b" cx="91" cy="72" r="1.8" />
              <circle className="infernal-ember infernal-ember-c" cx="44" cy="52" r="1.5" />
            </svg>
          </div>
        );

      case 'radiant-light':
        return (
          <div className="rift-spinner rift-spinner-radiant" aria-hidden="true">
            <span className="radiant-halo" />
            <span className="radiant-core" />
            <span className="radiant-ray radiant-ray-a" />
            <span className="radiant-ray radiant-ray-b" />
            <span className="radiant-ray radiant-ray-c" />
          </div>
        );

      case 'ocean-depths':
        return (
          <div className="rift-spinner rift-spinner-ocean" aria-hidden="true">
            <span className="ocean-vortex" />
            <span className="ocean-wave ocean-wave-a" />
            <span className="ocean-wave ocean-wave-b" />
            <span className="ocean-bubble ocean-bubble-a" />
            <span className="ocean-bubble ocean-bubble-b" />
            <span className="ocean-bubble ocean-bubble-c" />
          </div>
        );

      case 'classic':
      default:
        return (
          <div className="rift-spinner rift-spinner-classic" aria-hidden="true">
            <span className="classic-ring" />
            <span className="classic-core" />
            <span className="classic-glint" />
          </div>
        );
    }
  };

  return (
    <div
      className={compact ? 'rift-spinner-wrap rift-spinner-wrap-compact' : 'min-h-screen flex items-center justify-center'}
      style={{
        backgroundColor: compact ? 'transparent' : theme.colors.bgPrimary,
        '--spinner-size': `${size}px`,
      } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: spinnerCss }} />
      {renderAnimation()}
    </div>
  );
};

const spinnerCss = `
.rift-spinner-wrap {
  width: var(--spinner-size);
  height: var(--spinner-size);
  display: grid;
  place-items: center;
  margin: 0 auto;
}

.rift-spinner-wrap-compact {
  width: var(--spinner-size);
  height: var(--spinner-size);
}

.rift-spinner {
  position: relative;
  width: var(--spinner-size);
  height: var(--spinner-size);
  display: grid;
  place-items: center;
  transform: translateZ(0);
}

.rift-spinner *,
.rift-spinner *::before,
.rift-spinner *::after {
  box-sizing: border-box;
}

.rift-spinner-classic .classic-ring {
  position: absolute;
  width: 62%;
  height: 62%;
  border: 3px solid rgba(var(--color-accent-1-rgb), 0.2);
  border-top-color: var(--color-accent-1);
  border-right-color: var(--color-accent-3);
  border-radius: 50%;
  animation: spinnerRotate 1.05s cubic-bezier(0.55, 0.1, 0.45, 0.9) infinite;
  box-shadow: 0 0 26px rgba(var(--color-accent-1-rgb), 0.26);
}

.rift-spinner-classic .classic-core {
  position: absolute;
  width: 22%;
  height: 22%;
  border-radius: 30%;
  background: linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2));
  animation: spinnerPulse 1.8s ease-in-out infinite;
}

.rift-spinner-classic .classic-glint {
  position: absolute;
  width: 44%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.72), transparent);
  animation: spinnerRotate 1.6s linear infinite reverse;
}

.rift-spinner-arcane {
  filter: drop-shadow(0 12px 20px rgba(198, 167, 255, 0.18));
}

.arcane-fruit {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18%;
  height: 18%;
  background:
    radial-gradient(circle at 32% 28%, rgba(255,255,255,0.88) 0 12%, transparent 13%),
    var(--fruit-color);
  border: 2px solid rgba(255, 255, 255, 0.62);
  box-shadow: 0 10px 18px rgba(198, 167, 255, 0.16);
  transform: translate(-50%, -50%) rotate(var(--fruit-angle)) translateX(37%) rotate(var(--fruit-angle-inverse));
  transform-origin: center;
  animation: arcaneFruitDance 1.65s ease-in-out infinite;
  animation-delay: var(--fruit-delay);
}

.arcane-fruit::before {
  content: '';
  position: absolute;
  top: -24%;
  left: 45%;
  width: 42%;
  height: 26%;
  border-radius: 70% 20% 70% 20%;
  background: var(--fruit-leaf);
  transform: rotate(-28deg);
}

.arcane-sparkle {
  width: 18%;
  height: 18%;
  border-radius: 50%;
  background:
    radial-gradient(circle, #FFFFFF 0 14%, transparent 15%),
    conic-gradient(from 90deg, #C6A7FF, #FFB3D6, #8EFFC1, #FFE69A, #C6A7FF);
  animation: spinnerPulse 1.2s ease-in-out infinite, spinnerRotate 3s linear infinite;
  box-shadow: 0 0 24px rgba(255, 179, 214, 0.48);
}

.rift-spinner-nightshade .night-orbit {
  position: absolute;
  width: 76%;
  height: 76%;
  border-radius: 50%;
  border: 1px solid rgba(60, 239, 255, 0.28);
  border-top-color: rgba(181, 124, 255, 0.82);
  animation: spinnerRotate 2.3s linear infinite;
}

.night-moon {
  position: absolute;
  width: 44%;
  height: 44%;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #FFFFFF 0 8%, #DDE9FF 18%, #B57CFF 62%, #5F39A8 100%);
  box-shadow: 0 0 24px rgba(181, 124, 255, 0.55), 0 0 42px rgba(60, 239, 255, 0.2);
  animation: moonBreathe 2.2s ease-in-out infinite;
}

.night-moon::after {
  content: '';
  position: absolute;
  top: -6%;
  left: 30%;
  width: 88%;
  height: 88%;
  border-radius: 50%;
  background: var(--color-bg-primary);
  box-shadow: inset 8px 0 18px rgba(60, 239, 255, 0.1);
}

.night-star {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #E5EDFF;
  box-shadow: 0 0 10px rgba(60, 239, 255, 0.9);
  animation: starTwinkle 1.5s ease-in-out infinite;
}

.night-star-a { top: 19%; left: 23%; }
.night-star-b { top: 28%; right: 19%; animation-delay: -0.5s; }
.night-star-c { bottom: 23%; left: 30%; animation-delay: -0.9s; }

.infernal-flame {
  width: 96%;
  height: 96%;
  overflow: visible;
  filter: drop-shadow(0 0 18px rgba(255, 95, 31, 0.42));
}

.infernal-glow {
  animation: infernalGlow 1.05s ease-in-out infinite;
}

.infernal-flame-outer {
  transform-origin: 60px 90px;
  animation: infernalFlicker 0.92s ease-in-out infinite;
}

.infernal-flame-mid {
  transform-origin: 60px 92px;
  animation: infernalFlicker 0.76s ease-in-out infinite reverse;
}

.infernal-flame-inner {
  transform-origin: 60px 95px;
  animation: infernalInner 0.68s ease-in-out infinite;
}

.infernal-ember {
  fill: #FFB347;
  opacity: 0;
  animation: emberRise 1.5s ease-in-out infinite;
}

.infernal-ember-b { animation-delay: -0.55s; }
.infernal-ember-c { animation-delay: -1s; }

.rift-spinner-radiant .radiant-halo {
  position: absolute;
  width: 60%;
  height: 60%;
  border-radius: 50%;
  border: 3px solid rgba(51, 109, 255, 0.18);
  border-top-color: #336DFF;
  border-bottom-color: #FFB547;
  animation: spinnerRotate 1.15s linear infinite;
}

.radiant-core {
  position: absolute;
  width: 28%;
  height: 28%;
  border-radius: 50%;
  background: radial-gradient(circle, #FFFFFF 0 18%, #FFB547 30%, #336DFF 100%);
  box-shadow: 0 0 22px rgba(51, 109, 255, 0.28);
  animation: spinnerPulse 1.5s ease-in-out infinite;
}

.radiant-ray {
  position: absolute;
  width: 54%;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255, 181, 71, 0.82), transparent);
  animation: spinnerRotate 2.2s linear infinite;
}

.radiant-ray-b { transform: rotate(60deg); animation-delay: -0.5s; }
.radiant-ray-c { transform: rotate(120deg); animation-delay: -1s; }

.ocean-vortex {
  position: absolute;
  width: 68%;
  height: 68%;
  border-radius: 45% 55% 48% 52%;
  background:
    radial-gradient(circle at 48% 50%, rgba(10, 24, 40, 0.98) 0 24%, transparent 25%),
    conic-gradient(from 20deg, #0A1828, #00B8D4, #4DD0E1, #E0F7FF, #00D9FF, #0A1828);
  box-shadow: inset 0 0 18px rgba(224, 247, 255, 0.18), 0 0 30px rgba(0, 217, 255, 0.28);
  animation: oceanVortex 1.9s ease-in-out infinite;
}

.ocean-wave {
  position: absolute;
  width: 74%;
  height: 32%;
  border: 3px solid transparent;
  border-top-color: rgba(224, 247, 255, 0.72);
  border-radius: 50%;
  animation: oceanWave 1.7s ease-in-out infinite;
}

.ocean-wave-b {
  width: 54%;
  height: 24%;
  border-top-color: rgba(77, 208, 225, 0.65);
  animation-delay: -0.55s;
}

.ocean-bubble {
  position: absolute;
  bottom: 22%;
  border-radius: 50%;
  background: rgba(224, 247, 255, 0.82);
  box-shadow: 0 0 10px rgba(0, 217, 255, 0.42);
  animation: bubbleRise 2s ease-in-out infinite;
}

.ocean-bubble-a { left: 30%; width: 6px; height: 6px; }
.ocean-bubble-b { left: 58%; width: 8px; height: 8px; animation-delay: -0.7s; }
.ocean-bubble-c { left: 46%; width: 4px; height: 4px; animation-delay: -1.2s; }

@keyframes spinnerRotate {
  to { transform: rotate(360deg); }
}

@keyframes spinnerPulse {
  0%, 100% { transform: scale(0.88); opacity: 0.78; }
  50% { transform: scale(1.08); opacity: 1; }
}

@keyframes arcaneFruitDance {
  0%, 100% {
    transform: translate(-50%, -50%) rotate(var(--fruit-angle)) translateX(37%) rotate(var(--fruit-angle-inverse)) translateY(0) scale(0.95);
  }
  50% {
    transform: translate(-50%, -50%) rotate(var(--fruit-dance-angle)) translateX(39%) rotate(var(--fruit-dance-angle-inverse)) translateY(-5px) scale(1.08);
  }
}

@keyframes moonBreathe {
  0%, 100% { transform: scale(0.97); filter: brightness(0.98); }
  50% { transform: scale(1.04); filter: brightness(1.12); }
}

@keyframes starTwinkle {
  0%, 100% { transform: scale(0.6); opacity: 0.38; }
  50% { transform: scale(1.25); opacity: 1; }
}

@keyframes infernalGlow {
  0%, 100% { transform: scale(0.96); opacity: 0.62; }
  50% { transform: scale(1.08); opacity: 0.9; }
}

@keyframes infernalFlicker {
  0%, 100% { transform: skewX(0deg) scaleY(1); filter: brightness(1); }
  32% { transform: skewX(-3deg) scaleY(1.04) translateY(-1px); filter: brightness(1.12); }
  68% { transform: skewX(3deg) scaleY(0.98); filter: brightness(0.96); }
}

@keyframes infernalInner {
  0%, 100% { transform: translateY(0) scaleX(1); opacity: 0.96; }
  50% { transform: translateY(-3px) scaleX(0.9); opacity: 0.82; }
}

@keyframes emberRise {
  0% { transform: translateY(10px) scale(0.5); opacity: 0; }
  28% { opacity: 0.86; }
  100% { transform: translateY(-22px) scale(0.15); opacity: 0; }
}

@keyframes oceanVortex {
  0%, 100% { transform: rotate(0deg) scale(0.98); border-radius: 45% 55% 48% 52%; }
  50% { transform: rotate(180deg) scale(1.04); border-radius: 54% 46% 58% 42%; }
}

@keyframes oceanWave {
  0%, 100% { transform: translateY(6px) scaleX(0.78); opacity: 0.38; }
  50% { transform: translateY(-4px) scaleX(1); opacity: 0.92; }
}

@keyframes bubbleRise {
  0% { transform: translateY(14px) scale(0.25); opacity: 0; }
  30% { opacity: 0.88; }
  100% { transform: translateY(-42px) scale(1.1); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .rift-spinner *,
  .rift-spinner *::before,
  .rift-spinner *::after {
    animation-duration: 3s !important;
    animation-iteration-count: infinite !important;
  }
}
`;
