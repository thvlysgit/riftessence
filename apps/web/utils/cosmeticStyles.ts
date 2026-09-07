import { CSSProperties } from 'react';

export const USERNAME_DECORATION_STYLES: Record<string, CSSProperties> = {
  username_gilded_edge: { color: '#d8b773', textShadow: '0 1px 1px #6a5229' },
  username_prismatic_slash: {
    backgroundImage: 'linear-gradient(92deg, #67e8f9, #93c5fd 35%, #a78bfa 68%, #f9a8d4)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
  },
  username_solar_flare: {
    color: '#fde68a',
    WebkitTextStroke: '0.65px rgba(194,65,12,.72)',
    textShadow: '0 0 7px rgba(251,146,60,.35)',
  },
  username_void_glass: {
    color: '#dbeafe',
    WebkitTextStroke: '0.55px rgba(99,102,241,.55)',
    textShadow: '0 0 8px rgba(96,165,250,.3)',
  },
  username_tidal_ink: { color: '#86c9bd', letterSpacing: '.025em' },
  username_rose_quartz: { color: '#deb0bd', letterSpacing: '.02em' },
  username_moonlit: { color: '#e3e6ef', textShadow: '1px 1px 0 #647089', letterSpacing: '.035em' },
};
export const USERNAME_FONT_FAMILIES: Record<string, string> = {
  font_orbitron: 'Orbitron, "Segoe UI", sans-serif',
  font_cinzel: 'Cinzel, Georgia, serif',
  font_exo2: '"Exo 2", "Segoe UI", sans-serif',
  font_rajdhani: 'Rajdhani, "Segoe UI", sans-serif',
  font_audiowide: 'Audiowide, "Segoe UI", sans-serif',
  font_unbounded: 'Unbounded, "Segoe UI", sans-serif',
  font_bebas_neue: '"Bebas Neue", "Segoe UI", sans-serif',
};
export const USERNAME_HOVER_EFFECT_CLASSES: Record<string, string> = {
  hover_aurora_ring: 'username-hover-aurora-ring',
  hover_ember_trail: 'username-hover-ember-trail',
  hover_eclipse_gleam: 'username-hover-eclipse-gleam',
};
