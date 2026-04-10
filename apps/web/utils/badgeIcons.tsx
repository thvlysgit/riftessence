import React from 'react';
import { IconType } from 'react-icons';
import {
  FaAnchor,
  FaAtom,
  FaAward,
  FaBell,
  FaBolt,
  FaBook,
  FaBrain,
  FaBug,
  FaBullseye,
  FaCamera,
  FaChessKnight,
  FaCloud,
  FaCode,
  FaCommentDots,
  FaCompass,
  FaCrown,
  FaCubes,
  FaDiceD20,
  FaDragon,
  FaEye,
  FaFeatherAlt,
  FaFireAlt,
  FaFlag,
  FaFlask,
  FaGamepad,
  FaGem,
  FaGhost,
  FaGlobe,
  FaHammer,
  FaHandshake,
  FaHeart,
  FaInfinity,
  FaKey,
  FaLeaf,
  FaLightbulb,
  FaLock,
  FaMagic,
  FaMedal,
  FaMoon,
  FaMountain,
  FaMusic,
  FaPaintBrush,
  FaPaperPlane,
  FaRocket,
  FaRobot,
  FaSatellite,
  FaShieldAlt,
  FaSkull,
  FaSnowflake,
  FaStar,
  FaSun,
  FaTrophy,
  FaUserAstronaut,
  FaUserNinja,
  FaVial,
} from 'react-icons/fa';

export const BADGE_ICON_OPTIONS = [
  { key: 'trophy', label: 'Trophy', category: 'Achievement' },
  { key: 'medal', label: 'Medal', category: 'Achievement' },
  { key: 'award', label: 'Award', category: 'Achievement' },
  { key: 'crown', label: 'Crown', category: 'Achievement' },
  { key: 'star', label: 'Star', category: 'Achievement' },
  { key: 'gem', label: 'Gem', category: 'Achievement' },
  { key: 'flag', label: 'Flag', category: 'Achievement' },
  { key: 'target', label: 'Target', category: 'Achievement' },

  { key: 'shield', label: 'Shield', category: 'Defense' },
  { key: 'lock', label: 'Lock', category: 'Defense' },
  { key: 'key', label: 'Key', category: 'Defense' },
  { key: 'eye', label: 'Eye', category: 'Defense' },
  { key: 'bolt', label: 'Bolt', category: 'Defense' },
  { key: 'bell', label: 'Bell', category: 'Defense' },

  { key: 'code', label: 'Code', category: 'Tech' },
  { key: 'bug', label: 'Bug', category: 'Tech' },
  { key: 'robot', label: 'Robot', category: 'Tech' },
  { key: 'cloud', label: 'Cloud', category: 'Tech' },
  { key: 'atom', label: 'Atom', category: 'Tech' },
  { key: 'cubes', label: 'Cubes', category: 'Tech' },
  { key: 'rocket', label: 'Rocket', category: 'Tech' },
  { key: 'satellite', label: 'Satellite', category: 'Tech' },

  { key: 'dragon', label: 'Dragon', category: 'Arcane' },
  { key: 'magic', label: 'Magic', category: 'Arcane' },
  { key: 'skull', label: 'Skull', category: 'Arcane' },
  { key: 'ghost', label: 'Ghost', category: 'Arcane' },
  { key: 'moon', label: 'Moon', category: 'Arcane' },
  { key: 'sun', label: 'Sun', category: 'Arcane' },
  { key: 'infinity', label: 'Infinity', category: 'Arcane' },

  { key: 'chat', label: 'Chat', category: 'Social' },
  { key: 'handshake', label: 'Handshake', category: 'Social' },
  { key: 'heart', label: 'Heart', category: 'Social' },
  { key: 'book', label: 'Book', category: 'Social' },
  { key: 'compass', label: 'Compass', category: 'Social' },
  { key: 'paper-plane', label: 'Paper Plane', category: 'Social' },

  { key: 'palette', label: 'Palette', category: 'Creative' },
  { key: 'camera', label: 'Camera', category: 'Creative' },
  { key: 'feather', label: 'Feather', category: 'Creative' },
  { key: 'paint-brush', label: 'Paint Brush', category: 'Creative' },
  { key: 'music', label: 'Music', category: 'Creative' },
  { key: 'lightbulb', label: 'Lightbulb', category: 'Creative' },

  { key: 'chess-knight', label: 'Knight', category: 'Competitive' },
  { key: 'gamepad', label: 'Gamepad', category: 'Competitive' },
  { key: 'dice-d20', label: 'Dice D20', category: 'Competitive' },
  { key: 'hammer', label: 'Hammer', category: 'Competitive' },

  { key: 'leaf', label: 'Leaf', category: 'Nature' },
  { key: 'snowflake', label: 'Snowflake', category: 'Nature' },
  { key: 'flame', label: 'Flame', category: 'Nature' },
  { key: 'vial', label: 'Vial', category: 'Nature' },
  { key: 'flask', label: 'Flask', category: 'Nature' },
  { key: 'globe', label: 'Globe', category: 'Nature' },
  { key: 'mountain', label: 'Mountain', category: 'Nature' },
  { key: 'anchor', label: 'Anchor', category: 'Nature' },

  { key: 'astronaut', label: 'Astronaut', category: 'Characters' },
  { key: 'ninja', label: 'Ninja', category: 'Characters' },
  { key: 'brain', label: 'Brain', category: 'Characters' },
] as const;

export type BadgeIconKey = (typeof BADGE_ICON_OPTIONS)[number]['key'];

const BADGE_ICON_SET = new Set<string>(BADGE_ICON_OPTIONS.map((option) => option.key));

const BADGE_ICON_COMPONENTS: Record<BadgeIconKey, IconType> = {
  trophy: FaTrophy,
  award: FaAward,
  shield: FaShieldAlt,
  lock: FaLock,
  key: FaKey,
  eye: FaEye,
  bell: FaBell,
  bolt: FaBolt,
  crown: FaCrown,
  star: FaStar,
  gem: FaGem,
  flag: FaFlag,
  flame: FaFireAlt,
  target: FaBullseye,
  medal: FaMedal,
  rocket: FaRocket,
  code: FaCode,
  bug: FaBug,
  robot: FaRobot,
  cloud: FaCloud,
  atom: FaAtom,
  cubes: FaCubes,
  satellite: FaSatellite,
  dragon: FaDragon,
  magic: FaMagic,
  skull: FaSkull,
  ghost: FaGhost,
  moon: FaMoon,
  sun: FaSun,
  infinity: FaInfinity,
  chat: FaCommentDots,
  handshake: FaHandshake,
  heart: FaHeart,
  book: FaBook,
  compass: FaCompass,
  'paper-plane': FaPaperPlane,
  palette: FaPaintBrush,
  camera: FaCamera,
  feather: FaFeatherAlt,
  'paint-brush': FaPaintBrush,
  music: FaMusic,
  lightbulb: FaLightbulb,
  'chess-knight': FaChessKnight,
  gamepad: FaGamepad,
  'dice-d20': FaDiceD20,
  hammer: FaHammer,
  leaf: FaLeaf,
  snowflake: FaSnowflake,
  vial: FaVial,
  flask: FaFlask,
  globe: FaGlobe,
  mountain: FaMountain,
  anchor: FaAnchor,
  astronaut: FaUserAstronaut,
  ninja: FaUserNinja,
  brain: FaBrain,
};

export function isKnownBadgeIcon(icon: string | null | undefined): icon is BadgeIconKey {
  return Boolean(icon && BADGE_ICON_SET.has(icon));
}

export function getBadgeIconDisplayLabel(icon: string | null | undefined): string {
  if (!icon) return 'Trophy';
  const match = BADGE_ICON_OPTIONS.find((option) => option.key === icon);
  return match ? match.label : icon;
}

type BadgeIconProps = {
  icon: string | null | undefined;
  className?: string;
  color?: string;
};

export function BadgeIcon({ icon, className = 'w-5 h-5', color = 'currentColor' }: BadgeIconProps) {
  if (!icon) {
    return <span className={className} style={{ color }}>🏆</span>;
  }

  if (!isKnownBadgeIcon(icon)) {
    return <span className={className} style={{ color }}>{icon}</span>;
  }

  const IconComponent = BADGE_ICON_COMPONENTS[icon];
  return (
    <IconComponent
      className={className}
      color={color}
      style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.22))' }}
      aria-hidden="true"
    />
  );
}
