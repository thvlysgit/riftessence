// Complete Profile Page for League of Legends LFD + Social Rating Platform
// Built with Next.js, TypeScript, and Tailwind CSS
// Styled to match the Riot "Summoner Hub" dark theme

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Toast from '../../api/components/Toast';
import ConfirmModal from '../../api/components/ConfirmModal';
import { useRouter } from 'next/router';
import { LoadingSpinner } from '../../api/components/LoadingSpinner';
import { FeedbackModal } from '../../api/components/FeedbackModal';
import { ReportModal } from '../../api/components/ReportModal';
import { useGlobalUI } from '../../api/components/GlobalUI';
import { useLanguage } from '../contexts/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import { getAuthToken, getUserIdFromToken, getAuthHeader } from '../utils/auth';
import { getChampionIconUrl } from '../utils/championData';
import { DiscordIcon } from '../src/components/DiscordBrand';
import LivingBadge from '../src/components/LivingBadge';
import NoAccess from '../../api/components/NoAccess';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

// Role icon helper (League of Legends client style)
const getRoleIcon = (role: string) => {
  const r = role.toUpperCase();
  switch(r) {
    case 'TOP':
      return <svg className="w-3.5 h-3.5" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c32.06 0 64.12-.01 96.18.01-6.72 6.67-13.45 13.33-20.19 19.99H36v56c-6.66 6.73-13.33 13.46-19.99 20.18-.02-32.06 0-64.12-.01-96.18Z"/><path d="M104 44.02c5.32-5.33 10.65-10.64 15.99-15.94.02 30.64.01 61.28.01 91.92-30.64 0-61.28.01-91.93-.01 5.33-5.34 10.66-10.66 16-15.99 19.97-.01 39.95.01 59.93 0V44.02Z" opacity="0.75"/><path d="M56 56h28v28H56V56Z" opacity="0.75"/></svg>;
    case 'JUNGLE':
      return <svg className="w-3.5 h-3.5" viewBox="0 0 136 136" fill="currentColor"><path d="M72.13 57.86C78.7 41.1 90.04 26.94 99.94 12.1 93 29.47 84.31 46.87 84.04 65.97c-.73 4.81-2.83 9.31-4 14.03-2.08-7.57-4.91-14.9-7.91-22.14ZM36.21 12.35c13.06 20.19 26.67 40.61 33.61 63.87 4.77 15.49 5.42 32.94-1.8 47.8-5.58-6.1-11.08-12.29-16.71-18.34-4.97-4.72-10.26-9.1-15.32-13.71-1.55-11.73-2.97-23.87-8.72-34.42-2.75-5.24-6.71-9.72-11.19-13.55 9.67 4.75 19.18 10.41 26.23 18.72 4.37 4.98 7.46 10.94 9.69 17.15 1.15-10.29.58-20.79-2.05-30.81-3.31-12.68-8.99-24.55-13.74-36.71ZM105.84 53.83c4.13-4 8.96-7.19 14.04-9.84-4.4 3.88-8.4 8.32-11.14 13.55-5.75 10.56-7.18 22.71-8.74 34.45-5.32 5.35-10.68 10.65-15.98 16.01.15-4.37-.25-8.84 1.02-13.1 3.39-15.08 9.48-30.18 20.8-41.07Z"/></svg>;
    case 'MID':
    case 'MIDDLE':
      return <svg className="w-3.5 h-3.5" viewBox="0 0 136 136" fill="currentColor"><path d="M16 16c22.67 0 45.33 0 67.99.01C78.62 21.34 73.28 26.69 67.88 32c-11.96 0-23.92-.01-35.88 0-.01 12 .01 24-.01 36-5.32 5.3-10.64 10.6-15.98 15.89C15.99 61.26 16 38.63 16 16zm87.95 51.9c5.32-5.37 10.69-10.68 16.04-16.02.02 22.71.01 45.41 0 68.12-22.65 0-45.31.01-67.97-.01 5.33-5.33 10.65-10.67 15.99-15.99 12-.01 23.99.01 35.99 0 .04-12.04-.05-24.07-.05-36.1z" opacity="0.75"/><path d="M100.02 16H120v19.99C92 64 64 92 35.99 120H16v-19.99C44 72 72 43.99 100.02 16z"/></svg>;
    case 'ADC':
    case 'BOT':
    case 'BOTTOM':
      return <Image src="/assets/BotLane.png" alt="Bot" width={14} height={14} className="w-3.5 h-3.5" style={{ filter: 'brightness(0) saturate(100%) invert(73%) sepia(16%) saturate(1018%) hue-rotate(8deg) brightness(91%) contrast(85%)' }} />;
    case 'SUPPORT':
    case 'SUP':
      return <svg className="w-3.5 h-3.5" viewBox="0 0 136 136" fill="currentColor"><path d="M52.21 12.03c10.33-.1 20.66.06 30.99-.08 1.71 2.62 3.2 5.37 4.79 8.07C81.32 28 74.68 36.01 68 43.98 61.32 36 54.66 28 48.01 19.99c1.4-2.65 2.82-5.29 4.2-7.96ZM0 36.3c14.64-.68 29.33-.11 43.99-.3C48 40 52 44 56 48.01c-2.67 9.32-5.32 18.66-8.01 27.98-6.66-2.65-13.32-5.32-19.98-7.99 3.97-5.35 8.02-10.63 11.96-15.99-5.01-.08-10.15.4-15-1.14C15.58 48.12 7.75 42.05 0 36.34v-.04ZM92.02 36c14.66.05 29.32-.09 43.98.07v.03c-7.3 5.9-15.1 11.53-24.1 14.5-5.11 1.85-10.59 1.34-15.91 1.41 4.01 5.32 8 10.65 11.99 15.98-6.64 2.7-13.31 5.34-19.97 8-2.69-9.32-5.34-18.65-8.01-27.98C84.01 44 88 39.99 92.02 36ZM64.01 52.11c1.36 1.26 2.7 2.55 3.99 3.89 1.32-1.33 2.65-2.65 3.99-3.97 4.04 19.97 7.97 39.96 12.02 59.92-5.31 4.05-10.66 8.07-16.04 12.03-5.32-4.01-10.67-7.97-15.98-12.01 4.04-19.94 7.96-39.92 12.02-59.86Z"/></svg>;
    default:
      return null;
  }
};

const getRankIcon = (rank: string) => {
  const rankLower = rank.toLowerCase();
  const iconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${rankLower}.png`;
  return <img src={iconUrl} alt={rank} className="inline-block w-4 h-4" />;
};

const getRankBadge = (rank: string, division?: string, lp?: number, rankColor?: (r: string) => string, t: (key: any) => string = (k) => k) => {
  const getColor = rankColor || ((r: string) => {
    // ... code omitted for brevity but logic should remain same ...
    const colors: Record<string,string> = {
      IRON: '#4A4A4A',
      BRONZE: '#CD7F32',
      SILVER: '#C0C0C0',
      GOLD: '#FFD700',
      PLATINUM: '#00CED1',
      EMERALD: '#50C878',
      DIAMOND: '#B9F2FF',
      MASTER: '#9933FF',
      GRANDMASTER: '#FF0000',
      CHALLENGER: '#F4C430',
      UNRANKED: '#6B7280',
    };
    return colors[r] || colors.UNRANKED;
  });
  // Clean rank just in case it contains division logic (it shouldn't if data is clean, but let's be safe)
  const cleanRank = rank.split(' ')[0]; 
  const color = getColor(cleanRank);
  const translatedRank = t(`common.rank.${cleanRank}`) || cleanRank;
  const displayText = division ? `${translatedRank} ${division}${lp !== undefined && lp > 0 ? ` ${lp}LP` : ''}` : translatedRank;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border" style={{ background: `${color}15`, color: color, borderColor: color }}>
      {getRankIcon(cleanRank)}
      {displayText}
    </span>
  );
};

const getWinrateColor = (winrate: number) => {
  if (winrate <= 40) return '#ef4444';
  if (winrate <= 45) return '#fb923c';
  if (winrate <= 50) return '#9ca3af';
  if (winrate <= 55) return '#3b82f6';
  if (winrate <= 65) return '#22c55e';
  if (winrate <= 80) return '#D4AF37';
  return '#a855f7';
};

const getWinrateBadge = (winrate: number, t: (key: any) => string = (k) => k) => {
  const color = getWinrateColor(winrate);
  const suffix = t('profile.winrateSuffix');
  // Helper to append suffix
  const text = (val: number) => {
      // Check if translation exists and isn't just the key
      const safeSuffix = suffix === 'profile.winrateSuffix' ? '% WR' : suffix;
      return `${val.toFixed(1)}${safeSuffix}`;
  };
  
  if (winrate <= 40) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
        style={{ 
          background: `linear-gradient(135deg, ${color}30, ${color}20)`, 
          color: color, 
          borderColor: color,
          boxShadow: `0 0 10px ${color}35, inset 0 1px 0 ${color}15`,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}>
        ◆ {text(winrate)}
      </span>
    );
  } else if (winrate <= 45) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
        style={{ 
          background: `linear-gradient(135deg, ${color}30, ${color}20)`, 
          color: color, 
          borderColor: color,
          boxShadow: `0 0 8px ${color}30, inset 0 1px 0 ${color}15`
        }}>
        ◆ {text(winrate)}
      </span>
    );
  } else if (winrate <= 50) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border-2" 
        style={{ 
          background: `linear-gradient(135deg, ${color}25, ${color}15)`, 
          color: color, 
          borderColor: color,
          boxShadow: `0 0 6px ${color}20`
        }}>
        ◆ {text(winrate)}
      </span>
    );
  } else if (winrate <= 55) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border-2" 
        style={{ 
          background: `linear-gradient(135deg, ${color}25, ${color}15)`, 
          color: color, 
          borderColor: color,
          boxShadow: `0 0 6px ${color}20`
        }}>
        ◆ {text(winrate)}
      </span>
    );
  } else if (winrate <= 65) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
        style={{ 
          background: `linear-gradient(135deg, ${color}35, ${color}25)`, 
          color: color, 
          borderColor: color,
          boxShadow: `0 2px 8px ${color}35, inset 0 1px 0 ${color}20`
        }}>
        ◇ {text(winrate)}
      </span>
    );
  } else if (winrate <= 80) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
        style={{ 
          background: `linear-gradient(135deg, ${color}40, ${color}25, ${color}30)`, 
          color: color, 
          borderColor: color,
          boxShadow: `0 3px 12px ${color}45, inset 0 1px 0 ${color}35`,
          animation: 'glow 2s ease-in-out infinite'
        }}>
        ◇ {text(winrate)}
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border-2" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3), rgba(245, 158, 11, 0.3), rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))', 
          backgroundSize: '400% 400%',
          color: '#a855f7', 
          borderColor: '#a855f7',
          borderWidth: '2px',
          boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(168, 85, 247, 0.2), 0 0 20px rgba(168, 85, 247, 0.25)',
          animation: 'rainbow 4s ease infinite, glow 2s ease-in-out infinite'
        }}>
        ◈ {text(winrate)}
      </span>
    );
  }
};

const getLanguageBadge = (language: string, t: (key: any) => string = (k) => k) => {
  const langStyles: Record<string, { background: string; color: string; border: string; textShadow?: string }> = {
    'English': { 
      background: 'linear-gradient(135deg, #012169 0%, #012169 45%, #C8102E 45%, #C8102E 55%, #012169 55%, #012169 100%)', 
      color: '#FFFFFF', 
      border: '#C8102E',
      textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 0 4px rgba(200,16,46,0.5)'
    },
    'Spanish': { 
      background: 'linear-gradient(to bottom, #C8102E 0%, #C8102E 33%, #FFC400 33%, #FFC400 66%, #C8102E 66%, #C8102E 100%)', 
      color: '#000000', 
      border: '#C8102E',
      textShadow: '0 0 3px #FFFFFF, 0 0 3px #FFFFFF'
    },
    'French': { 
      background: 'linear-gradient(to right, #002395 0%, #002395 33%, #FFFFFF 33%, #FFFFFF 66%, #ED2939 66%, #ED2939 100%)', 
      color: '#000000', 
      border: '#002395',
      textShadow: '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.3)'
    },
    'German': { 
      background: 'linear-gradient(to bottom, #000000 0%, #000000 33%, #DD0000 33%, #DD0000 66%, #FFCE00 66%, #FFCE00 100%)', 
      color: '#FFFFFF', 
      border: '#000000',
      textShadow: '0 0 3px #000000, 0 1px 2px rgba(0,0,0,0.5)'
    },
    'Italian': { 
      background: 'linear-gradient(to right, #009246 0%, #009246 33%, #FFFFFF 33%, #FFFFFF 66%, #CE2B37 66%, #CE2B37 100%)', 
      color: '#000000', 
      border: '#009246',
      textShadow: '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.3)'
    },
    'Portuguese': { 
      background: 'linear-gradient(to right, #006600 0%, #006600 40%, #FF0000 40%, #FF0000 100%)', 
      color: '#FFFFFF', 
      border: '#006600',
      textShadow: '0 1px 3px rgba(0,0,0,0.6)'
    },
    'Polish': { 
      background: 'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 50%, #DC143C 50%, #DC143C 100%)', 
      color: '#000000', 
      border: '#DC143C',
      textShadow: '0 0 3px #FFFFFF, 0 1px 2px rgba(220,20,60,0.5)'
    },
    'Russian': { 
      background: 'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 33%, #0039A6 33%, #0039A6 66%, #D52B1E 66%, #D52B1E 100%)', 
      color: '#000000', 
      border: '#0039A6',
      textShadow: '0 0 3px #FFFFFF, 0 0 3px #FFFFFF, 0 1px 2px rgba(0,0,0,0.3)'
    },
    'Turkish': { 
      background: '#E30A17', 
      color: '#FFFFFF', 
      border: '#E30A17',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
    },
    'Korean': { 
      background: '#FFFFFF', 
      color: '#003478', 
      border: '#CD121A',
      textShadow: '0 1px 1px rgba(0,0,0,0.1)'
    },
    'Japanese': { 
      background: '#FFFFFF', 
      color: '#BC002D', 
      border: '#BC002D',
      textShadow: '0 1px 1px rgba(0,0,0,0.1)'
    },
    'Chinese': { 
      background: '#DE2910', 
      color: '#FFDE00', 
      border: '#DE2910',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
    },
  };

  const style = langStyles[language] || { background: '#3b82f6', color: '#FFFFFF', border: '#3b82f6', textShadow: '0 1px 2px rgba(0,0,0,0.3)' };
  
  const transKey = `common.language.${language.toLowerCase()}` as any;
  const translated = t(transKey);
  // Fallback to original language if translation is just the key
  const displayText = translated === transKey ? language : translated;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border" 
      style={{ 
        background: style.background, 
        color: style.color, 
        borderColor: style.border,
        textShadow: style.textShadow
      }}>
      {displayText}
    </span>
  );
};

type RiotAccount = {
  id: string;
  gameName: string;
  tagLine: string;
  region: string;
  isMain: boolean;
  verified: boolean;
  hidden: boolean;
  rank?: string;
  division?: string | null;
  winrate?: number | null;
  profileIconId?: number;
};

type Community = {
  id: string;
  name: string;
  role: string;
};

type Feedback = {
  id: string;
  stars: number;
  moons: number;
  comment: string;
  date: string;
  raterUsername: string;
};

type UserProfile = {
  id: string;
  username: string;
  bio: string | null;
  anonymous: boolean;
  playstyles: string[];
  primaryRole: string | null;
  preferredRole: string | null; // Auto-detected from match history
  secondaryRole: string | null; // Second most played role
  region: string | null;
  vcPreference: string | null;
  languages: string[];
  skillStars: number;
  personalityMoons: number;
  reportCount: number;
  peakRank: string | null;
  peakDivision: string | null;
  peakLp: number | null;
  peakDate: string | null;
  badges: Array<string | { id: string; key: string; name: string; description?: string }>;
  championPoolMode: 'LIST' | 'TIERLIST';
  championList: string[];
  championTierlist: any;
  gamesPerDay: number;
  gamesPerWeek: number;
  profileIconId?: number;
  riotAccounts: RiotAccount[];
  discordLinked: boolean;
  discordUsername: string | null;
  discordDmNotifications?: boolean;
  unlockedCosmetics?: string[];
  activeUsernameDecoration?: string | null;
  activeHoverEffect?: string | null;
  activeVisualEffect?: string | null;
  activeNameplateFont?: string | null;
  adCredits?: number;
  communities: Community[];
  feedback: Feedback[];
};

function normalizeChampionTierlist(value: any): { S: string[]; A: string[]; B: string[]; C: string[] } {
  if (!value || typeof value !== 'object') {
    return { S: [], A: [], B: [], C: [] };
  }

  return {
    S: Array.isArray(value.S) ? value.S : [],
    A: Array.isArray(value.A) ? value.A : [],
    B: Array.isArray(value.B) ? value.B : [],
    C: Array.isArray(value.C) ? value.C : [],
  };
}

function normalizeProfilePayload(raw: any): UserProfile {
  const riotAccounts = Array.isArray(raw?.riotAccounts) ? raw.riotAccounts : [];

  return {
    id: String(raw?.id || ''),
    username: String(raw?.username || ''),
    bio: raw?.bio ?? null,
    anonymous: !!raw?.anonymous,
    playstyles: Array.isArray(raw?.playstyles) ? raw.playstyles : [],
    primaryRole: raw?.primaryRole || null,
    preferredRole: raw?.preferredRole || null,
    secondaryRole: raw?.secondaryRole || null,
    region: raw?.region || null,
    vcPreference: raw?.vcPreference || null,
    languages: Array.isArray(raw?.languages) ? raw.languages : [],
    skillStars: Number.isFinite(Number(raw?.skillStars)) ? Number(raw.skillStars) : 0,
    personalityMoons: Number.isFinite(Number(raw?.personalityMoons)) ? Number(raw.personalityMoons) : 0,
    reportCount: Number.isFinite(Number(raw?.reportCount)) ? Number(raw.reportCount) : 0,
    peakRank: raw?.peakRank || null,
    peakDivision: raw?.peakDivision || null,
    peakLp: Number.isFinite(Number(raw?.peakLp)) ? Number(raw.peakLp) : null,
    peakDate: raw?.peakDate || null,
    badges: Array.isArray(raw?.badges) ? raw.badges : [],
    championPoolMode: raw?.championPoolMode === 'LIST' ? 'LIST' : 'TIERLIST',
    championList: Array.isArray(raw?.championList) ? raw.championList : [],
    championTierlist: normalizeChampionTierlist(raw?.championTierlist),
    gamesPerDay: Number.isFinite(Number(raw?.gamesPerDay)) ? Number(raw.gamesPerDay) : 0,
    gamesPerWeek: Number.isFinite(Number(raw?.gamesPerWeek)) ? Number(raw.gamesPerWeek) : 0,
    profileIconId: Number.isFinite(Number(raw?.profileIconId)) ? Number(raw.profileIconId) : undefined,
    riotAccounts: riotAccounts.map((acc: any) => ({
      id: String(acc?.id || ''),
      gameName: String(acc?.gameName || acc?.summonerName || 'Unknown'),
      tagLine: String(acc?.tagLine || ''),
      region: String(acc?.region || ''),
      isMain: !!acc?.isMain,
      verified: !!acc?.verified,
      hidden: !!acc?.hidden,
      rank: acc?.rank || 'UNRANKED',
      division: acc?.division || null,
      winrate: Number.isFinite(Number(acc?.winrate)) ? Number(acc.winrate) : null,
      profileIconId: Number.isFinite(Number(acc?.profileIconId)) ? Number(acc.profileIconId) : undefined,
    })),
    discordLinked: !!raw?.discordLinked,
    discordUsername: raw?.discordUsername || null,
    discordDmNotifications: !!raw?.discordDmNotifications,
    unlockedCosmetics: Array.isArray(raw?.unlockedCosmetics) ? raw.unlockedCosmetics : [],
    activeUsernameDecoration: raw?.activeUsernameDecoration || null,
    activeHoverEffect: raw?.activeHoverEffect || null,
    activeVisualEffect: raw?.activeVisualEffect || null,
    activeNameplateFont: raw?.activeNameplateFont || null,
    adCredits: Number.isFinite(Number(raw?.adCredits)) ? Number(raw.adCredits) : 0,
    communities: Array.isArray(raw?.communities) ? raw.communities : [],
    feedback: Array.isArray(raw?.feedback) ? raw.feedback : [],
  };
}

const AVAILABLE_PLAYSTYLES = ['Controlled Chaos', 'FUNDAMENTALS', 'CoinFlips', 'Scaling', 'Snowball'];
const AVAILABLE_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish', 'Russian', 'Turkish', 'Korean', 'Japanese', 'Chinese'];

type PlaystyleTheme = {
  icon: string;
  baseBg: string;
  baseBorder: string;
  baseText: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
  glow: string;
};

const PLAYSTYLE_THEME_MAP: Record<string, PlaystyleTheme> = {
  'Controlled Chaos': {
    icon: '⚡',
    baseBg: 'radial-gradient(circle at 16% 18%, rgba(251,146,60,0.26), rgba(220,38,38,0.18) 46%, rgba(120,53,15,0.24) 100%), repeating-linear-gradient(130deg, rgba(255,255,255,0.06) 0 8px, rgba(255,255,255,0) 8px 16px)',
    baseBorder: 'rgba(249, 115, 22, 0.44)',
    baseText: '#fdba74',
    selectedBg: 'radial-gradient(circle at 16% 18%, rgba(251,146,60,0.48), rgba(220,38,38,0.36) 46%, rgba(120,53,15,0.46) 100%), repeating-linear-gradient(130deg, rgba(255,255,255,0.1) 0 8px, rgba(255,255,255,0) 8px 16px)',
    selectedBorder: '#fb923c',
    selectedText: '#ffedd5',
    glow: 'rgba(249, 115, 22, 0.36)',
  },
  FUNDAMENTALS: {
    icon: '🧭',
    baseBg: 'linear-gradient(0deg, rgba(59,130,246,0.1), rgba(30,64,175,0.08)), repeating-linear-gradient(0deg, rgba(147,197,253,0.08) 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, rgba(147,197,253,0.08) 0 1px, transparent 1px 10px)',
    baseBorder: 'rgba(59, 130, 246, 0.4)',
    baseText: '#93c5fd',
    selectedBg: 'linear-gradient(0deg, rgba(37,99,235,0.42), rgba(30,64,175,0.38)), repeating-linear-gradient(0deg, rgba(191,219,254,0.12) 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, rgba(191,219,254,0.12) 0 1px, transparent 1px 10px)',
    selectedBorder: '#3b82f6',
    selectedText: '#dbeafe',
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  CoinFlips: {
    icon: '🪙',
    baseBg: 'conic-gradient(from 210deg at 50% 50%, rgba(245,158,11,0.18), rgba(146,64,14,0.14), rgba(250,204,21,0.16), rgba(245,158,11,0.18))',
    baseBorder: 'rgba(245, 158, 11, 0.4)',
    baseText: '#fcd34d',
    selectedBg: 'conic-gradient(from 210deg at 50% 50%, rgba(245,158,11,0.42), rgba(180,83,9,0.4), rgba(250,204,21,0.38), rgba(245,158,11,0.42))',
    selectedBorder: '#f59e0b',
    selectedText: '#fef3c7',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  Scaling: {
    icon: '📈',
    baseBg: 'linear-gradient(160deg, rgba(16,185,129,0.16), rgba(5,150,105,0.12) 55%, rgba(4,120,87,0.14)), repeating-linear-gradient(-32deg, rgba(187,247,208,0.14) 0 6px, transparent 6px 14px)',
    baseBorder: 'rgba(16, 185, 129, 0.44)',
    baseText: '#6ee7b7',
    selectedBg: 'linear-gradient(160deg, rgba(16,185,129,0.44), rgba(34,197,94,0.34) 55%, rgba(4,120,87,0.46)), repeating-linear-gradient(-32deg, rgba(187,247,208,0.24) 0 6px, transparent 6px 14px)',
    selectedBorder: '#10b981',
    selectedText: '#ecfdf5',
    glow: 'rgba(16, 185, 129, 0.34)',
  },
  Snowball: {
    icon: '❄️',
    baseBg: 'radial-gradient(circle at 20% 24%, rgba(255,255,255,0.42) 0 2px, transparent 3px), radial-gradient(circle at 72% 64%, rgba(255,255,255,0.34) 0 2px, transparent 3px), linear-gradient(145deg, rgba(34,211,238,0.16), rgba(30,64,175,0.12))',
    baseBorder: 'rgba(34, 211, 238, 0.42)',
    baseText: '#67e8f9',
    selectedBg: 'radial-gradient(circle at 20% 24%, rgba(255,255,255,0.6) 0 2px, transparent 3px), radial-gradient(circle at 72% 64%, rgba(255,255,255,0.5) 0 2px, transparent 3px), linear-gradient(145deg, rgba(8,145,178,0.46), rgba(12,74,110,0.42))',
    selectedBorder: '#22d3ee',
    selectedText: '#cffafe',
    glow: 'rgba(34, 211, 238, 0.34)',
  },
};

function getPlaystyleTheme(style: string): PlaystyleTheme {
  return PLAYSTYLE_THEME_MAP[style] || {
    icon: '⭐',
    baseBg: 'rgba(148, 163, 184, 0.08)',
    baseBorder: 'rgba(148, 163, 184, 0.34)',
    baseText: '#cbd5e1',
    selectedBg: 'linear-gradient(145deg, rgba(71,85,105,0.38), rgba(51,65,85,0.38))',
    selectedBorder: '#94a3b8',
    selectedText: '#f8fafc',
    glow: 'rgba(148, 163, 184, 0.28)',
  };
}

function renderPlaystyleIllustration(style: string, isSelected: boolean): React.ReactNode {
  const opacity = isSelected ? 0.98 : 0.84;

  if (style === 'Scaling') {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 140" preserveAspectRatio="none" style={{ opacity }}>
        <g stroke="rgba(16,185,129,0.2)" strokeWidth="1">
          <line x1="20" y1="18" x2="20" y2="124" />
          <line x1="20" y1="124" x2="286" y2="124" />
          <line x1="20" y1="96" x2="286" y2="96" />
          <line x1="20" y1="68" x2="286" y2="68" />
          <line x1="20" y1="40" x2="286" y2="40" />
        </g>
        <g fill="rgba(110,231,183,0.2)">
          <rect x="38" y="104" width="16" height="20" rx="3" />
          <rect x="66" y="92" width="16" height="32" rx="3" />
          <rect x="94" y="80" width="16" height="44" rx="3" />
          <rect x="122" y="68" width="16" height="56" rx="3" />
        </g>
        <polyline
          points="28,116 62,108 98,94 134,86 170,70 206,52 242,34 280,18"
          fill="none"
          stroke="rgba(167,243,208,0.72)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 6"
          style={{ animation: 'playstyleSignalFlow 4.2s linear infinite' }}
        />
        <polyline
          points="28,116 62,108 98,94 134,86 170,70 206,52 242,34 280,18"
          fill="none"
          stroke="rgba(16,185,129,0.94)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M270 18 L286 18 L286 34" fill="none" stroke="rgba(16,185,129,0.95)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (style === 'Snowball') {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 140" preserveAspectRatio="none" style={{ opacity }}>
        <g stroke="rgba(207,250,254,0.75)" strokeWidth="1.6" strokeLinecap="round" style={{ animation: 'playstyleSnowSpin 11s linear infinite' }}>
          <line x1="60" y1="26" x2="60" y2="54" />
          <line x1="46" y1="40" x2="74" y2="40" />
          <line x1="50" y1="30" x2="70" y2="50" />
          <line x1="70" y1="30" x2="50" y2="50" />
        </g>
        <g stroke="rgba(224,242,254,0.82)" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'playstyleSnowSpin 9s linear infinite reverse' }}>
          <line x1="122" y1="22" x2="122" y2="46" />
          <line x1="110" y1="34" x2="134" y2="34" />
          <line x1="113" y1="25" x2="131" y2="43" />
          <line x1="131" y1="25" x2="113" y2="43" />
        </g>
        <g stroke="rgba(165,243,252,0.78)" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'playstyleSnowSpin 12s linear infinite' }}>
          <line x1="232" y1="30" x2="232" y2="56" />
          <line x1="219" y1="43" x2="245" y2="43" />
          <line x1="222" y1="33" x2="242" y2="53" />
          <line x1="242" y1="33" x2="222" y2="53" />
        </g>
        <path
          d="M8 126 L30 114 L46 122 L68 104 L90 116 L116 96 L140 112 L166 90 L192 108 L218 86 L244 100 L270 82 L292 92"
          fill="none"
          stroke="rgba(186,230,253,0.9)"
          strokeWidth="2.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M28 126 L42 114 M66 124 L78 110 M108 118 L120 102 M152 114 L166 98 M194 110 L206 94 M238 102 L250 88"
          fill="none"
          stroke="rgba(224,242,254,0.8)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (style === 'FUNDAMENTALS') {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 140" preserveAspectRatio="none" style={{ opacity }}>
        <g stroke="rgba(147,197,253,0.16)" strokeWidth="1">
          <line x1="18" y1="20" x2="282" y2="20" />
          <line x1="18" y1="120" x2="282" y2="120" />
          <line x1="28" y1="14" x2="28" y2="126" />
          <line x1="272" y1="14" x2="272" y2="126" />
        </g>
        <path
          d="M44 36 Q92 20 140 36 V112 Q92 96 44 112 Z"
          fill="rgba(30,64,175,0.18)"
          stroke="rgba(191,219,254,0.86)"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M156 36 Q204 20 252 36 V112 Q204 96 156 112 Z"
          fill="rgba(30,64,175,0.2)"
          stroke="rgba(191,219,254,0.86)"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <line x1="148" y1="32" x2="148" y2="114" stroke="rgba(219,234,254,0.92)" strokeWidth="2.2" />
        <line x1="152" y1="32" x2="152" y2="114" stroke="rgba(219,234,254,0.92)" strokeWidth="2.2" />
        <path d="M136 24 H164 V34 H136 Z" fill="rgba(96,165,250,0.72)" stroke="rgba(219,234,254,0.82)" strokeWidth="1.4" />
        <path d="M146 24 H154 V52 L150 48 L146 52 Z" fill="rgba(59,130,246,0.96)" />
        <g stroke="rgba(191,219,254,0.74)" strokeWidth="1.8" strokeLinecap="round">
          <line x1="58" y1="52" x2="126" y2="46" />
          <line x1="58" y1="64" x2="126" y2="58" />
          <line x1="58" y1="76" x2="118" y2="72" />
          <line x1="170" y1="52" x2="238" y2="46" />
          <line x1="170" y1="64" x2="238" y2="58" />
          <line x1="170" y1="76" x2="230" y2="72" />
        </g>
        <polyline
          points="52,98 78,90 104,94 132,84"
          fill="none"
          stroke="rgba(191,219,254,0.8)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="168,98 194,90 220,94 248,84"
          fill="none"
          stroke="rgba(191,219,254,0.8)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (style === 'CoinFlips') {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 140" preserveAspectRatio="none" style={{ opacity }}>
        <circle cx="72" cy="98" r="22" fill="rgba(250,204,21,0.24)" stroke="rgba(245,158,11,0.84)" strokeWidth="3" />
        <circle cx="72" cy="98" r="14" fill="none" stroke="rgba(254,243,199,0.86)" strokeWidth="2" />
        <text x="72" y="103" textAnchor="middle" fill="rgba(255,237,213,0.92)" fontSize="12" fontWeight="700">H</text>
        <circle cx="228" cy="52" r="22" fill="rgba(250,204,21,0.22)" stroke="rgba(245,158,11,0.8)" strokeWidth="3" />
        <circle cx="228" cy="52" r="14" fill="none" stroke="rgba(254,243,199,0.82)" strokeWidth="2" />
        <text x="228" y="57" textAnchor="middle" fill="rgba(255,237,213,0.9)" fontSize="12" fontWeight="700">T</text>
        <ellipse cx="150" cy="24" rx="15" ry="6" fill="rgba(250,204,21,0.38)" stroke="rgba(251,191,36,0.9)" strokeWidth="2.4" />
        <ellipse cx="150" cy="24" rx="9" ry="3" fill="none" stroke="rgba(254,243,199,0.72)" strokeWidth="1.6" />
        <path
          d="M72 76 Q148 4 228 30"
          fill="none"
          stroke="rgba(254,243,199,0.86)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="8 6"
          style={{ animation: 'playstyleCoinArc 3.5s linear infinite' }}
        />
        <path d="M228 30 L238 33 L230 40" fill="none" stroke="rgba(254,243,199,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M72 122 Q148 138 228 74" fill="none" stroke="rgba(245,158,11,0.74)" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="150" y1="12" x2="150" y2="126" stroke="rgba(251,191,36,0.52)" strokeWidth="1.8" strokeDasharray="6 6" />
        <text x="150" y="136" textAnchor="middle" fill="rgba(255,237,213,0.86)" fontSize="11" fontWeight="700">Heads or Tails</text>
      </svg>
    );
  }

  if (style === 'Controlled Chaos') {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 140" preserveAspectRatio="none" style={{ opacity }}>
        <g style={{ animation: 'playstyleBoltJitter 2.7s ease-in-out infinite' }}>
          <path
            d="M126 14 L94 68 H132 L104 126 L192 58 H152 L182 14 Z"
            fill="rgba(249,115,22,0.38)"
            stroke="rgba(251,146,60,0.96)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>
        <polyline points="24,30 58,20 90,36 120,22" fill="none" stroke="rgba(254,215,170,0.7)" strokeWidth="2.4" strokeLinecap="round" />
        <polyline points="178,116 208,98 236,112 272,88" fill="none" stroke="rgba(254,215,170,0.74)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="82" cy="90" r="18" fill="none" stroke="rgba(249,115,22,0.5)" strokeWidth="2" />
        <circle cx="82" cy="90" r="27" fill="none" stroke="rgba(249,115,22,0.34)" strokeWidth="1.6" />
      </svg>
    );
  }

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 140" preserveAspectRatio="none" style={{ opacity }}>
      <circle cx="150" cy="70" r="30" fill="rgba(148,163,184,0.2)" stroke="rgba(226,232,240,0.48)" strokeWidth="2" />
    </svg>
  );
}

// Badge configuration with icons and styles
type BadgeConfig = {
  icon: string;
  description?: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverBg: string;
  shape?: string;
  animation?: string;
};

const BADGE_CONFIG: Record<string, BadgeConfig> = {
  'Developer': {
    icon: 'bolt',
    description: 'Bypass cooldowns',
    bgColor: 'rgba(167, 139, 250, 0.20)',
    borderColor: '#A78BFA',
    textColor: '#A78BFA',
    hoverBg: 'rgba(167, 139, 250, 0.30)',
    shape: 'soft-hex',
    animation: 'drift',
  },
  'Admin': {
    icon: 'shield',
    description: 'Platform administrator',
    bgColor: 'rgba(239, 68, 68, 0.20)',
    borderColor: '#EF4444',
    textColor: '#F87171',
    hoverBg: 'rgba(239, 68, 68, 0.30)',
    shape: 'crest',
    animation: 'breathe',
  },
  'Support': {
    icon: 'chat',
    description: 'Support team member',
    bgColor: 'rgba(34, 211, 238, 0.20)',
    borderColor: '#22D3EE',
    textColor: '#67E8F9',
    hoverBg: 'rgba(34, 211, 238, 0.30)',
    shape: 'round',
    animation: 'glint',
  },
  'Early Supporter': {
    icon: 'star',
    description: 'Joined during beta',
    bgColor: 'rgba(96, 165, 250, 0.20)',
    borderColor: '#60A5FA',
    textColor: '#93C5FD',
    hoverBg: 'rgba(96, 165, 250, 0.30)',
    shape: 'squircle',
    animation: 'drift',
  },
  'VIP': {
    icon: 'crown',
    description: 'VIP member',
    bgColor: 'rgba(245, 158, 11, 0.20)',
    borderColor: '#F59E0B',
    textColor: '#FCD34D',
    hoverBg: 'rgba(245, 158, 11, 0.30)',
    shape: 'bevel',
    animation: 'spark',
  },
  'Partner': {
    icon: 'handshake',
    description: 'Official partner',
    bgColor: 'rgba(34, 197, 94, 0.20)',
    borderColor: '#22C55E',
    textColor: '#86EFAC',
    hoverBg: 'rgba(34, 197, 94, 0.30)',
    shape: 'soft-hex',
    animation: 'glint',
  },
  'MVP': {
    icon: 'trophy',
    description: 'Most valuable player',
    bgColor: 'rgba(200, 170, 110, 0.20)',
    borderColor: '#C8AA6E',
    textColor: '#C8AA6E',
    hoverBg: 'rgba(200, 170, 110, 0.30)',
    shape: 'squircle',
    animation: 'breathe',
  },
  'GOAT': {
    icon: '🐐',
    description: 'Greatest of all time',
    bgColor: 'rgba(251, 146, 60, 0.20)',
    borderColor: '#FB923C',
    textColor: '#FDBA74',
    hoverBg: 'rgba(251, 146, 60, 0.30)',
    shape: 'crest',
    animation: 'spark',
  },
};

const PRESTIGE_BADGE_CONFIG: Record<string, BadgeConfig> = {
  shop_fortune_coin: {
    icon: 'gem',
    description: 'Fortune Badge I',
    bgColor: 'linear-gradient(140deg, rgba(146,64,14,0.38), rgba(180,83,9,0.34))',
    borderColor: '#F97316',
    textColor: '#FED7AA',
    hoverBg: 'rgba(249, 115, 22, 0.28)',
    shape: 'squircle',
    animation: 'glint',
  },
  shop_oracle_dice: {
    icon: 'gem',
    description: 'Fortune Badge II',
    bgColor: 'linear-gradient(140deg, rgba(180,83,9,0.42), rgba(217,119,6,0.36), rgba(234,179,8,0.3))',
    borderColor: '#F59E0B',
    textColor: '#FEF3C7',
    hoverBg: 'rgba(245, 158, 11, 0.32)',
    shape: 'squircle',
    animation: 'drift',
  },
  shop_jackpot_crown: {
    icon: 'gem',
    description: 'Fortune Badge III',
    bgColor: 'linear-gradient(140deg, rgba(180,83,9,0.44), rgba(217,119,6,0.4), rgba(251,191,36,0.34))',
    borderColor: '#FBBF24',
    textColor: '#FEF9C3',
    hoverBg: 'rgba(251, 191, 36, 0.36)',
    shape: 'squircle',
    animation: 'spark',
  },
  shop_vault_ascendant: {
    icon: 'gem',
    description: 'Fortune Badge IV',
    bgColor: 'linear-gradient(140deg, rgba(146,64,14,0.5), rgba(217,119,6,0.44), rgba(251,191,36,0.38), rgba(168,85,247,0.32))',
    borderColor: '#EAB308',
    textColor: '#FEFCE8',
    hoverBg: 'rgba(234, 179, 8, 0.42)',
    shape: 'squircle',
    animation: 'breathe',
  },
};

const PRESTIGE_BADGE_LABELS: Record<string, string> = {
  shop_fortune_coin: 'Novice',
  shop_oracle_dice: 'Advanced',
  shop_jackpot_crown: 'Expert',
  shop_vault_ascendant: 'Ascendant',
};

const PRESTIGE_BADGE_ALIASES: Record<string, keyof typeof PRESTIGE_BADGE_CONFIG> = {
  novice: 'shop_fortune_coin',
  advanced: 'shop_oracle_dice',
  expert: 'shop_jackpot_crown',
  ascendant: 'shop_vault_ascendant',
  fortunebadgei: 'shop_fortune_coin',
  fortunebadgeii: 'shop_oracle_dice',
  fortunebadgeiii: 'shop_jackpot_crown',
  fortunebadgeiv: 'shop_vault_ascendant',
  fortunesigili: 'shop_fortune_coin',
  fortunesigiliembersigil: 'shop_fortune_coin',
  fortunesigiliembermark: 'shop_fortune_coin',
  fortunesigilii: 'shop_oracle_dice',
  fortunesigiliiembersigilprime: 'shop_oracle_dice',
  fortunesigiliiembercrest: 'shop_oracle_dice',
  fortunesigiliii: 'shop_jackpot_crown',
  fortunesigiliiiembersigilsovereign: 'shop_jackpot_crown',
  fortunesigiliiisovereigncrest: 'shop_jackpot_crown',
  fortunesigiliv: 'shop_vault_ascendant',
  fortunesigilivembersigilascendant: 'shop_vault_ascendant',
  fortunesigilivascendantcrown: 'shop_vault_ascendant',
};

const resolvePrestigeBadgeKey = (badgeLookupKey: string): keyof typeof PRESTIGE_BADGE_CONFIG | null => {
  const normalizedKey = badgeLookupKey.trim().toLowerCase();
  if (PRESTIGE_BADGE_CONFIG[normalizedKey]) {
    return normalizedKey as keyof typeof PRESTIGE_BADGE_CONFIG;
  }

  const compactKey = normalizedKey.replace(/[^a-z0-9]+/g, '');
  return PRESTIGE_BADGE_ALIASES[compactKey] || null;
};

const USERNAME_DECORATION_STYLES: Record<string, React.CSSProperties> = {
  username_gilded_edge: {
    textShadow: '0 0 10px rgba(251, 191, 36, 0.34)',
    WebkitTextStroke: '0.6px rgba(245, 158, 11, 0.65)',
  },
  username_prismatic_slash: {
    backgroundImage: 'linear-gradient(92deg, #67e8f9, #93c5fd 35%, #a78bfa 68%, #f9a8d4)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 12px rgba(103, 232, 249, 0.28)',
  },
  username_solar_flare: {
    color: '#fde68a',
    WebkitTextStroke: '0.65px rgba(194, 65, 12, 0.72)',
    textShadow: '0 0 7px rgba(251, 146, 60, 0.52), 0 0 18px rgba(239, 68, 68, 0.35)',
    letterSpacing: '0.015em',
  },
  username_void_glass: {
    color: '#dbeafe',
    WebkitTextStroke: '0.55px rgba(99, 102, 241, 0.55)',
    textShadow: '0 0 8px rgba(96, 165, 250, 0.42), 0 0 20px rgba(147, 51, 234, 0.28)',
    filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.28))',
  },
};

const USERNAME_FONT_FAMILIES: Record<string, string> = {
  font_orbitron: 'Orbitron, "Segoe UI", sans-serif',
  font_cinzel: 'Cinzel, Georgia, serif',
  font_exo2: '"Exo 2", "Segoe UI", sans-serif',
  font_rajdhani: 'Rajdhani, "Segoe UI", sans-serif',
  font_audiowide: 'Audiowide, "Segoe UI", sans-serif',
  font_unbounded: 'Unbounded, "Segoe UI", sans-serif',
  font_bebas_neue: '"Bebas Neue", "Segoe UI", sans-serif',
};

const USERNAME_HOVER_EFFECT_CLASSES: Record<string, string> = {
  hover_aurora_ring: 'username-hover-aurora-ring',
  hover_ember_trail: 'username-hover-ember-trail',
  hover_eclipse_gleam: 'username-hover-eclipse-gleam',
};

const PROFILE_VISUAL_EFFECT_CLASSES: Record<string, string> = {
  visual_stardust: 'profile-visual-stardust',
  visual_scanlines: 'profile-visual-scanlines',
  visual_nebula_pulse: 'profile-visual-nebula-pulse',
};

// Popular League champions for quick selection
const POPULAR_CHAMPIONS = [
  'Ahri', 'Akali', 'Ashe', 'Caitlyn', 'Darius', 'Ekko', 'Ezreal', 'Garen', 'Jax', 'Jinx',
  'Kai\'Sa', 'Katarina', 'Lee Sin', 'Lux', 'Malphite', 'Master Yi', 'Morgana', 'Nasus',
  'Orianna', 'Riven', 'Thresh', 'Vayne', 'Yasuo', 'Yone', 'Zed', 'Zyra'
];

import { useTheme } from '../contexts/ThemeContext';

const useRankColor = () => {
  const { theme } = useTheme();
  const isLightTheme = (() => {
    const hex = theme.colors.bgPrimary.replace('#','');
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return lum > 0.7;
  })();
  const map: Record<string, string> = {
    IRON: '#4A4A4A',
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#00CED1',
    EMERALD: '#50C878',
    DIAMOND: isLightTheme ? '#4FA3FF' : '#B9F2FF',
    MASTER: '#9933FF',
    GRANDMASTER: '#FF0000',
    CHALLENGER: '#F4C430',
    UNRANKED: '#6B7280',
  };
  return (rank: string) => map[rank || 'UNRANKED'] || map.UNRANKED;
};

const RANK_ORDER = [
  'UNRANKED',
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
];

export default function ProfilePage() {
  const router = useRouter();
  const routeUsername = typeof router.query?.username === 'string' ? router.query.username : null;
  const isViewingOther = !!routeUsername;
  const rankColor = useRankColor();
  const { t } = useLanguage();
  const { openConversation } = useChat();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPlaystyles, setSelectedPlaystyles] = useState<string[]>([]);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [editedUsername, setEditedUsername] = useState<string>('');
  const [editedBio, setEditedBio] = useState<string>('');
  const [editedLanguages, setEditedLanguages] = useState<string[]>([]);
  const [pendingMainAccountId, setPendingMainAccountId] = useState<string | null>(null);
  const [_championPoolMode, setChampionPoolMode] = useState<'LIST' | 'TIERLIST'>('TIERLIST');
  const [championInput, setChampionInput] = useState('');
  const [champions, setChampions] = useState<string[]>([]);
  const [championTierlist, setChampionTierlist] = useState<{ S: string[]; A: string[]; B: string[]; C: string[] }>({ S: [], A: [], B: [], C: [] });
  const [userMasteryChampions, setUserMasteryChampions] = useState<string[]>([]);
  const [draggedChampion, setDraggedChampion] = useState<{ name: string; fromTier: 'S' | 'A' | 'B' | 'C' | 'suggestions' | null } | null>(null);
  const [dragOverTier, setDragOverTier] = useState<'S' | 'A' | 'B' | 'C' | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserBadges, setCurrentUserBadges] = useState<{ key: string; name: string }[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCheckingBlock, setIsCheckingBlock] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; type?: 'success'|'error'|'info' }>({ open: false, message: '', type: 'info' });
  const [confirmState, setConfirmState] = useState<{ open: boolean; feedbackId: string | null }>({ open: false, feedbackId: null });
  const [badgeConfigs, setBadgeConfigs] = useState<Record<string, BadgeConfig>>({});
  const championPoolSectionRef = useRef<HTMLDivElement | null>(null);
  const hasHandledChampionPoolOnboarding = useRef(false);
  const { showToast, confirm } = useGlobalUI();
  const isAdmin = useMemo(() => currentUserBadges.some(b => b.key === 'admin'), [currentUserBadges]);

  // Load current user ID and badges from auth context
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = getAuthToken();
        const uid = token ? getUserIdFromToken(token) : null;
        setCurrentUserId(uid);
        
        // Fetch current user's badges to check admin status
        if (uid) {
          const res = await fetch(`${API_URL}/api/user/profile`, {
            headers: getAuthHeader()
          });
          if (res.ok) {
            const data = await res.json();
            if (data.badges) {
              setCurrentUserBadges(data.badges);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load current user:', err);
      }
    };
    loadCurrentUser();
  }, []);

  // Load badge configurations from API
  useEffect(() => {
    const loadBadgeConfigs = async () => {
      try {
        const res = await fetch(`${API_URL}/api/badges`);
        if (res.ok) {
          const data = await res.json();
          const configs: Record<string, BadgeConfig> = {};
          (data.badges || []).forEach((badge: any) => {
            configs[badge.key] = {
              icon: badge.icon,
              description: badge.description || '',
              bgColor: badge.bgColor,
              borderColor: badge.borderColor,
              textColor: badge.textColor,
              hoverBg: badge.hoverBg,
              shape: badge.shape || 'squircle',
              animation: badge.animation || 'breathe',
            };
          });
          setBadgeConfigs(configs);
        }
      } catch (err) {
        console.error('Failed to load badge configurations:', err);
        // Fallback to hardcoded configs if API fails
      }
    };
    loadBadgeConfigs();
  }, []);

  const normalize = (s: string) => s.trim().toLowerCase();
  const findChampionByName = (input: string) => champions.find((c) => normalize(c) === normalize(input)) || null;
  const isValidChampion = (name: string) => !!findChampionByName(name);
  const isInAnyTier = (name: string) => ['S','A','B','C'].some((t) => (championTierlist as any)[t].includes(name));
  const addToTier = (tier: 'S'|'A'|'B'|'C', name: string) => {
    setChampionTierlist((prev) => {
      const next = { S: [...prev.S], A: [...prev.A], B: [...prev.B], C: [...prev.C] };
      (['S','A','B','C'] as const).forEach((t) => {
        next[t] = next[t].filter((c) => c !== name);
      });
      if (!next[tier].includes(name)) next[tier].push(name);
      return next;
    });
  };
  const removeFromTier = (tier: 'S'|'A'|'B'|'C', name: string) => {
    setChampionTierlist((prev) => ({ ...prev, [tier]: prev[tier].filter((c) => c !== name) }));
  };
  const getBestAccount = (accounts: RiotAccount[]) => {
    if (!accounts || accounts.length === 0) return null;
    return accounts.reduce((best, a) => {
      const br = RANK_ORDER.indexOf(best.rank || 'UNRANKED');
      const ar = RANK_ORDER.indexOf(a.rank || 'UNRANKED');
      if (ar > br) return a;
      if (ar < br) return best;
      // Same rank, compare divisions (I > II > III > IV)
      const divOrder = ['IV', 'III', 'II', 'I'];
      const bd = best.division ? divOrder.indexOf(best.division) : -1;
      const ad = a.division ? divOrder.indexOf(a.division) : -1;
      return ad > bd ? a : best;
    }, accounts[0]);
  };

  // Update browser tab title when user data loads
  useEffect(() => {
    if (user?.username) {
      document.title = isViewingOther
        ? `${user.username}'s Profile | RiftEssence`
        : 'My Profile | RiftEssence';
    }
  }, [user?.username, isViewingOther]);

  // Fetch user profile from API (supports viewing other profiles via ?username=)
  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        
        // Step 1: Fetch initial profile to get userId
        let profileUrl: string;
        const fetchOptions: RequestInit = {};
        
        if (isViewingOther && routeUsername) {
          // When viewing others, don't include hidden accounts
          profileUrl = `${API_URL}/api/user/profile?username=${encodeURIComponent(routeUsername)}`;
        } else {
          // When viewing own profile, require auth token
          const token = getAuthToken();
          if (!token) {
            throw new Error('AUTH_ERROR');
          }
          // When viewing own profile, include hidden accounts - use auth header
          profileUrl = `${API_URL}/api/user/profile?includeHidden=true`;
          fetchOptions.headers = getAuthHeader();
        }
        
        const initialResponse = await fetch(profileUrl, fetchOptions);
        if (!initialResponse.ok) {
          // Check for auth errors
          if (initialResponse.status === 401 || initialResponse.status === 403) {
            throw new Error('AUTH_ERROR');
          }
          throw new Error('Failed to fetch profile');
        }
        const data = await initialResponse.json();
        const normalizedData = normalizeProfilePayload(data);
        
        // PERFORMANCE FIX: Render UI immediately with cached data
        setUser(normalizedData);
        setSelectedPlaystyles(normalizedData.playstyles);
        setAnonymousMode(normalizedData.anonymous);
        setEditedUsername(normalizedData.username);
        setEditedBio(normalizedData.bio || '');
        setEditedLanguages(normalizedData.languages);
        setChampionPoolMode(normalizedData.championPoolMode || 'TIERLIST');
        setChampionTierlist(normalizedData.championTierlist || { S: [], A: [], B: [], C: [] });
        const initialMainAccount = normalizedData.riotAccounts.find((acc: RiotAccount) => acc.isMain);
        setPendingMainAccountId(initialMainAccount?.id || normalizedData.riotAccounts[0]?.id || null);
        setLoading(false);
        
        // Step 2: Refresh Riot stats in background (non-blocking)
        if (data.id && !isViewingOther) {
          fetch(`${API_URL}/api/user/refresh-riot-stats`, { method: 'POST', headers: getAuthHeader() })
            .then(() => fetch(profileUrl, fetchOptions))
            .then(res => res.ok ? res.json() : null)
            .then(refreshedData => {
              if (refreshedData) {
                const normalizedRefreshedData = normalizeProfilePayload(refreshedData);
                setUser(normalizedRefreshedData);
                setEditedBio(normalizedRefreshedData.bio || '');
                const updatedMainAccount = normalizedRefreshedData.riotAccounts.find((acc: RiotAccount) => acc.isMain);
                setPendingMainAccountId(updatedMainAccount?.id || normalizedRefreshedData.riotAccounts[0]?.id || null);
              }
            })
            .catch(() => {}); // Silently fail background refresh
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      }
    }
    fetchProfile();
  }, [routeUsername, isViewingOther]);

  // Handle Discord OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('discord') === 'linked') {
      showToast('Discord account linked successfully!', 'success');
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
      // Trigger profile refresh
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !user || isViewingOther || hasHandledChampionPoolOnboarding.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding') !== 'champion-pool') return;

    hasHandledChampionPoolOnboarding.current = true;
    setIsEditMode(true);
    showToast('Set your champion pool, then click Save Changes to finish setup.', 'info');

    const scrollTimeout = window.setTimeout(() => {
      championPoolSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    window.history.replaceState({}, '', '/profile');
    return () => window.clearTimeout(scrollTimeout);
  }, [user, isViewingOther, showToast]);

  // Check if viewing user is blocked
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!isViewingOther || !currentUserId || !user) return;
      
      setIsCheckingBlock(true);
      try {
        const res = await fetch(`${API_URL}/api/user/block/status/${user.id}`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          setIsBlocked(data.isBlocked);
        }
      } catch (err) {
        console.error('Failed to check block status:', err);
      } finally {
        setIsCheckingBlock(false);
      }
    };
    checkBlockStatus();
  }, [isViewingOther, currentUserId, user]);

  // Fetch full champions list from Data Dragon
  useEffect(() => {
    async function fetchChampions() {
      // Start with a known-good recent version; try to refresh from versions.json in background
      const FALLBACK_VERSION = '15.13.1';
      let version = FALLBACK_VERSION;

      try {
        const versionsRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        if (versionsRes.ok) {
          const versions = await versionsRes.json();
          if (Array.isArray(versions) && versions[0]) version = versions[0];
        }
      } catch {
        // Ignore — use fallback version
      }

      try {
        const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        const names = Object.values<any>(json.data || {}).map((c: any) => c.name as string).sort();
        if (names.length > 0) {
          setChampions(names);
          return;
        }
        throw new Error('empty');
      } catch {
        // Try the fallback version explicitly if the detected version failed
        if (version !== FALLBACK_VERSION) {
          try {
            const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${FALLBACK_VERSION}/data/en_US/champion.json`);
            if (res.ok) {
              const json = await res.json();
              const names = Object.values<any>(json.data || {}).map((c: any) => c.name as string).sort();
              if (names.length > 0) { setChampions(names); return; }
            }
          } catch { /* ignore */ }
        }
        // Final fallback to popular list
        setChampions(POPULAR_CHAMPIONS);
      }
    }
    fetchChampions();
  }, []);

  // Fetch user's most played champions from mastery data
  useEffect(() => {
    const fetchMasteryData = async () => {
      if (isViewingOther) return; // Only for own profile
      try {
        const res = await fetch(`${API_URL}/api/user/champion-mastery`, {
          headers: getAuthHeader()
        });
        if (res.ok) {
          const data = await res.json();
          if (data.champions && data.champions.length > 0) {
            setUserMasteryChampions(data.champions);
          }
        }
      } catch (err) {
        console.error('Failed to fetch mastery data:', err);
        // Silently fail - will fall back to popular champions
      }
    };
    fetchMasteryData();
  }, [isViewingOther]);

  // Save all profile changes (playstyles + main account + champion pool)
  const handleSaveAllChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const token = getAuthToken();
      const _userId = token ? getUserIdFromToken(token) : null;

      // Save username if changed (only when viewing own profile)
      try {
        if (!isViewingOther && editedUsername && editedUsername !== user?.username) {
          const usernameRes = await fetch(`${API_URL}/api/user/username`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              ...getAuthHeader(),
            },
            body: JSON.stringify({ username: editedUsername }),
          });
          if (!usernameRes.ok) {
            const err = await usernameRes.json().catch(() => ({ error: 'Failed to update username' }));
            throw new Error(err.error || 'Failed to update username');
          }
          const data = await usernameRes.json();
          if (data.bypassedCooldown) {
            showToast(`${t('profile.save.usernameSuccess')} ${data.bypassedCooldown}`, 'success');
          }
        }
      } catch (err: any) {
        console.error('Username save error:', err);
        showToast(t('profile.save.usernameError').replace('{error}', err.message), 'error');
        setIsSaving(false);
        return;
      }

      // Save bio if changed (only when viewing own profile)
      try {
        const normalizedEditedBio = (editedBio || '').trim();
        const normalizedCurrentBio = (user?.bio || '').trim();
        if (!isViewingOther && normalizedEditedBio !== normalizedCurrentBio) {
          const bioRes = await fetch(`${API_URL}/api/user/bio`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ bio: normalizedEditedBio }),
          });
          if (!bioRes.ok) {
            const err = await bioRes.json().catch(() => ({ error: 'Failed to update bio' }));
            throw new Error(err.error || 'Failed to update bio');
          }
        }
      } catch (err: any) {
        console.error('Bio save error:', err);
        showToast(`Failed to update bio: ${err.message}`, 'error');
        setIsSaving(false);
        return;
      }

      // Save languages if changed (only when viewing own profile)
      try {
        const sortedEditedLangs = [...editedLanguages].sort();
        const sortedUserLangs = [...(user?.languages || [])].sort();
        if (!isViewingOther && JSON.stringify(sortedEditedLangs) !== JSON.stringify(sortedUserLangs)) {
          const langRes = await fetch(`${API_URL}/api/user/languages`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ languages: editedLanguages }),
          });
          if (!langRes.ok) {
            const err = await langRes.json().catch(() => ({ error: 'Failed to update languages' }));
            throw new Error(err.error || 'Failed to update languages');
          }
        }
      } catch (err: any) {
        console.error('Languages save error:', err);
        showToast(t('profile.save.languagesError').replace('{error}', err.message), 'error');
        setIsSaving(false);
        return;
      }

      // Save playstyles (only when viewing own profile)
      try {
        if (selectedPlaystyles.length > 2) {
          showToast(t('profile.save.maxPlaystyles'), 'error');
          setIsSaving(false);
          return;
        }
        if (!isViewingOther) {
          await fetch(`${API_URL}/api/user/playstyles`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({ playstyles: selectedPlaystyles }),
          });
        }
      } catch (err: any) {
        console.error('Playstyles save error:', err);
        showToast(t('profile.save.playstylesError').replace('{error}', err.message),'error');
        setIsSaving(false);
        return;
      }

      // Validate and save champion pool
      const allTierChamps = [...championTierlist.S, ...championTierlist.A, ...championTierlist.B, ...championTierlist.C];
      const invalid = allTierChamps.filter((c) => !isValidChampion(c));
      if (champions.length > 0 && invalid.length > 0) {
        showToast(t('profile.champion.invalid').replace('{champs}', invalid.join(', ')), 'error');
        setIsSaving(false);
        return;
      }
      // Ensure uniqueness across tiers by deduping when saving (UI enforces, but double-check)
      const seen = new Set<string>();
      const uniqueTierlist = { S: [] as string[], A: [] as string[], B: [] as string[], C: [] as string[] };
      (['S', 'A', 'B', 'C'] as const).forEach((t) => {
        for (const champ of championTierlist[t]) {
          if (!seen.has(champ)) {
            seen.add(champ);
            uniqueTierlist[t].push(champ);
          }
        }
      });
      setChampionTierlist(uniqueTierlist);

      // Update champion pool using auth headers — always send TIERLIST mode
      const cpRes = !isViewingOther ? await fetch(`${API_URL}/api/user/champion-pool`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          mode: 'TIERLIST',
          championList: [],
          championTierlist: uniqueTierlist,
        }),
      }) : null;
      if (cpRes && !cpRes.ok) {
        const errData = await cpRes.json().catch(() => ({ error: 'Failed to save champion pool' }));
        showToast(errData.error || 'Failed to save champion pool', 'error');
        setIsSaving(false);
        return;
      }
      if (cpRes && cpRes.ok) {
        const cpData = await cpRes.json().catch(() => null);
        if (cpData && user) {
          setUser({
            ...user,
            championPoolMode: cpData.championPoolMode ?? 'TIERLIST',
            championList: cpData.championList ?? [],
            championTierlist: cpData.championTierlist ?? championTierlist,
          });
        }
      }

      // Save main account if changed (only when viewing own profile)
      if (!isViewingOther && pendingMainAccountId && pendingMainAccountId !== user?.riotAccounts.find(acc => acc.isMain)?.id) {
        const response = await fetch(`${API_URL}/api/user/riot-accounts/${pendingMainAccountId}/set-main`, {
          method: 'PATCH',
        });
        if (!response.ok) throw new Error('Failed to set main account');
      }

      // Refresh Riot stats, then profile data
      // Attempt to refresh Riot stats if we have auth
      if (!isViewingOther) {
        await fetch(`${API_URL}/api/user/refresh-riot-stats`, { 
          method: 'POST',
          headers: getAuthHeader() 
        }).catch(err => console.error('Failed to refresh stats:', err));
      }
      const url = isViewingOther
        ? `${API_URL}/api/user/profile?username=${encodeURIComponent(routeUsername as string)}`
        : `${API_URL}/api/user/profile?includeHidden=true`;
      const profileResponse = await fetch(url, {
        headers: isViewingOther ? {} : getAuthHeader()
      });
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        const normalizedData = normalizeProfilePayload(data);
        setUser(normalizedData);
        setSelectedPlaystyles(normalizedData.playstyles);
        setEditedUsername(normalizedData.username);
        setEditedBio(normalizedData.bio || '');
        setEditedLanguages(normalizedData.languages);
        setChampionPoolMode(normalizedData.championPoolMode || 'TIERLIST');
        setChampionTierlist(normalizedData.championTierlist || { S: [], A: [], B: [], C: [] });
        const mainAccount = normalizedData.riotAccounts.find((acc: RiotAccount) => acc.isMain);
        setPendingMainAccountId(mainAccount?.id || normalizedData.riotAccounts[0]?.id || null);
      }

      setIsEditMode(false);
      setIsSaving(false);
    } catch (err: any) {
      console.error('Error saving changes:', err);
      showToast(`Failed to save changes: ${err.message || 'Unknown error'}`, 'error');
      setIsSaving(false);
    }
  };

  // Toggle anonymous mode via API
  const handleToggleAnonymous = async () => {
    const newMode = !anonymousMode;
    try {
      const response = await fetch(`${API_URL}/api/user/anonymous`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ anonymous: newMode }),
      });
      if (!response.ok) throw new Error('Failed to update anonymous mode');
      setAnonymousMode(newMode);
      if (user) {
        setUser({ ...user, anonymous: newMode });
      }
    } catch (err) {
      console.error('Error updating anonymous mode:', err);
      showToast('Failed to update anonymous mode', 'error');
    }
  };

  // Switch main Riot account (now just sets pending state in edit mode)
  const handleSwitchMain = (accountId: string) => {
    setPendingMainAccountId(accountId);
  };

  // Toggle hidden status of Riot account
  const handleToggleHidden = async (accountId: string, currentHidden: boolean) => {
    try {
      const response = await fetch(`${API_URL}/api/user/riot-accounts/${accountId}/toggle-hidden`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !currentHidden }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update account visibility');
      }
      
      // Update local state
      setUser(prev => prev ? {
        ...prev,
        riotAccounts: prev.riotAccounts.map(acc => 
          acc.id === accountId ? { ...acc, hidden: !currentHidden } : acc
        )
      } : prev);
    } catch (err: any) {
      console.error('Error toggling account visibility:', err);
      showToast(err.message || 'Failed to update account visibility', 'error');
    }
  };

  // Remove Riot account via API
  const handleRemoveAccount = async (accountId: string) => {
    const ok = await confirm({ title: 'Remove Account', message: 'Are you sure you want to remove this Riot account? This action cannot be undone.', confirmText: 'Remove' });
    if (!ok) return;
    try {
      const response = await fetch(`${API_URL}/api/user/riot-accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove account');
      }
      
      // Refresh profile after deletion
      const url = `${API_URL}/api/user/profile?includeHidden=true`;
      const profileResponse = await fetch(url, {
        headers: getAuthHeader()
      });
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        const normalizedData = normalizeProfilePayload(data);
        setUser(normalizedData);
        const mainAccount = normalizedData.riotAccounts.find((acc: RiotAccount) => acc.isMain);
        setPendingMainAccountId(mainAccount?.id || normalizedData.riotAccounts[0]?.id || null);
      }
    } catch (err: any) {
      console.error('Error removing account:', err);
      showToast(err.message || 'Failed to remove account', 'error');
    }
  };

  // Feedback submission handler
  const handleSubmitFeedback = async (data: { stars: number; moons: number; comment: string }) => {
    if (!user) return;
    
    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          receiverId: user.id,
          stars: data.stars,
          moons: data.moons,
          comment: data.comment,
        }),
      });
      
      if (res.ok) {
        showToast('Feedback submitted successfully!', 'success');
        setShowFeedbackModal(false);
        // Reload user data to show new feedback
        window.location.reload();
      } else {
        const errorData = await res.json();
        showToast(`Error: ${errorData.error || 'Failed to submit feedback'}`, 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleSubmitReport = async (reason: string) => {
    if (!user) return;
    
    try {
      const res = await fetch(`${API_URL}/api/report`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          reportedUserId: user.id,
          reason,
        }),
      });
      
      if (res.ok) {
        showToast('Report submitted successfully!', 'success');
        setShowReportModal(false);
      } else {
        const errorData = await res.json();
        showToast(`Error: ${errorData.error || 'Failed to submit report'}`, 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleToggleBlock = async () => {
    if (!user || !currentUserId) return;
    
    const action = isBlocked ? 'unblock' : 'block';
    const confirmMessage = isBlocked 
      ? `Are you sure you want to unblock ${user.username}? You will be able to see their posts again.`
      : `Are you sure you want to block ${user.username}? You will no longer see their posts and they won't see yours.`;
    
    const confirmed = await confirm({
      title: isBlocked ? 'Unblock User' : 'Block User',
      message: confirmMessage,
      confirmText: isBlocked ? 'Unblock' : 'Block',
    });
    
    if (!confirmed) return;
    
    try {
      const method = isBlocked ? 'DELETE' : 'POST';
      const res = await fetch(`${API_URL}/api/user/block`, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      
      if (res.ok) {
        setIsBlocked(!isBlocked);
        showToast(
          isBlocked ? `${user.username} has been unblocked` : `${user.username} has been blocked`,
          'success'
        );
      } else {
        const errorData = await res.json();
        showToast(`Error: ${errorData.error || `Failed to ${action} user`}`, 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!user) return;
    
    
    try {
      const res = await fetch(`${API_URL}/api/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      
      if (res.ok) {
        // Optimistically remove from UI
        setUser(prev => prev ? {
          ...prev,
          feedback: prev.feedback.filter(fb => fb.id !== feedbackId)
        } : prev);
        showToast('Feedback deleted successfully!', 'success');
      } else {
        const errorData = await res.json();
        showToast(`Error: ${errorData.error || 'Failed to delete feedback'}`, 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  if (error || !user) {
    // Check if error is auth-related
    const isAuthError = error === 'AUTH_ERROR' || error?.includes('401') || error?.includes('403');
    
    if (isAuthError || (!user && !loading && !error)) {
      return (
        <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
            <NoAccess 
              action="view"
              onClose={() => router.push('/')}
              closeIcon="home"
            />
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="flex items-center justify-center h-full">
          <div style={{ color: 'var(--text-error)', fontSize: '1.25rem' }}>{error || 'Failed to load profile'}</div>
        </div>
      </div>
    );
  }

  // Get main Riot account for display
  const mainAccount = user.riotAccounts.find(acc => acc.isMain) || user.riotAccounts[0];
  const usernameDecorationStyle = user.activeUsernameDecoration
    ? USERNAME_DECORATION_STYLES[user.activeUsernameDecoration]
    : undefined;
  const usernameFontFamily = user.activeNameplateFont
    ? USERNAME_FONT_FAMILIES[user.activeNameplateFont]
    : undefined;
  const usernameHoverEffectClass = user.activeHoverEffect
    ? USERNAME_HOVER_EFFECT_CLASSES[user.activeHoverEffect] || ''
    : '';
  const profileVisualEffectClass = user.activeVisualEffect
    ? PROFILE_VISUAL_EFFECT_CLASSES[user.activeVisualEffect] || ''
    : '';
  
  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--color-bg-primary)' }}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @keyframes rainbow {
          0% { background-position: 0% 50%; }
          25% { background-position: 50% 50%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 50% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 3px 10px currentColor, inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 15px currentColor;
          }
          50% { 
            box-shadow: 0 3px 15px currentColor, inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 30px currentColor;
          }
        }
      `}</style>
        <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Edit Mode Toggle + Refresh Stats */}
        <div className="flex flex-wrap justify-end gap-2">
          {!isViewingOther && (
            <button
              onClick={async () => {
                try {
                  await fetch(`${API_URL}/api/user/refresh-riot-stats`, {
                    method: 'POST',
                    headers: getAuthHeader()
                  });
                  showToast('League statistics refreshed!', 'success');
                  // Reload profile data
                  window.location.reload();
                } catch (error) {
                  console.error('Failed to refresh stats:', error);
                  showToast('Failed to refresh stats', 'error');
                }
              }}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                background: 'var(--btn-gradient)',
                color: 'var(--btn-gradient-text)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              title="Refresh your League of Legends ranked statistics from Riot API"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('profile.refreshStats')}
            </button>
          )}
          {!isViewingOther && isEditMode && (
            <button
              onClick={handleSaveAllChanges}
              disabled={isSaving}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                background: isSaving ? 'var(--btn-disabled-bg)' : 'var(--btn-gradient)',
                color: isSaving ? 'var(--btn-disabled-text)' : 'var(--btn-gradient-text)',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isSaving ? t('profile.saving') : t('profile.saveChanges')}
            </button>
          )}
          {!isViewingOther && (
          <button
            onClick={() => {
              if (isEditMode) {
                setSelectedPlaystyles(user.playstyles || []);
                setEditedUsername(user.username || '');
                setEditedBio(user.bio || '');
                setEditedLanguages(user.languages || []);
                const mainAccount = user.riotAccounts.find(acc => acc.isMain);
                setPendingMainAccountId(mainAccount?.id || user.riotAccounts[0]?.id || null);
              }
              setIsEditMode(!isEditMode);
            }}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: 600,
              background: isEditMode ? 'var(--btn-cancel-bg)' : 'var(--btn-gradient)',
              color: isEditMode ? 'var(--btn-cancel-text)' : 'var(--btn-gradient-text)',
              transition: 'all 0.2s',
            }}
          >
            {isEditMode ? `✕ ${t('common.cancel')}` : `✏️ ${t('profile.editProfile')}`}
          </button>
          )}
        </div>

        {/* Profile Header */}
        <div
          className={`rounded-xl p-4 sm:p-6 profile-card-shell ${profileVisualEffectClass}`.trim()}
          style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                      <img
                        src={user.profileIconId
                          ? `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${user.profileIconId}.png`
                          : `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/29.png`
                        }
                        alt="Summoner Icon"
                        className="w-[72px] h-[72px] rounded-xl border-2 shadow-lg"
                        style={{ borderColor: 'var(--accent-primary)' }}
                      />
                      {user.anonymous && (
                        <div
                          className="absolute -top-1 -right-1 rounded-full font-bold px-1.5 py-0.5 text-[10px]"
                          style={{ background: 'var(--accent-danger)', color: 'var(--text-main)' }}
                        >
                          🕶️
                        </div>
                      )}
                    </div>

                    <div
                      className="min-w-0 flex-1 rounded-xl border px-4 py-3"
                      style={{
                        background: 'linear-gradient(140deg, rgba(15,23,42,0.72), rgba(30,41,59,0.58))',
                        borderColor: 'var(--accent-primary-border)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                      }}
                    >
                      <p className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-secondary)' }}>
                        In-app username
                      </p>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editedUsername}
                          onChange={(e) => setEditedUsername(e.target.value)}
                          className="w-full text-3xl sm:text-4xl font-extrabold px-2 py-1 rounded-lg border-2 focus:outline-none"
                          style={{
                            color: 'var(--accent-primary)',
                            background: 'var(--bg-input)',
                            borderColor: 'var(--accent-primary)',
                            fontFamily: usernameFontFamily || undefined,
                          }}
                          placeholder={t('profile.usernamePlaceholder')}
                        />
                      ) : (
                        <h1
                          className={`text-3xl sm:text-4xl font-extrabold leading-tight break-all username-hover-base ${usernameHoverEffectClass}`.trim()}
                          style={{
                            color: 'var(--accent-primary)',
                            fontFamily: usernameFontFamily || undefined,
                            ...(usernameDecorationStyle || {}),
                          }}
                        >
                          {user.username}
                        </h1>
                      )}
                    </div>
                  </div>

                  {!isViewingOther && !isEditMode && (
                    <button
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/rate/${user.username}`;
                        navigator.clipboard.writeText(shareUrl).then(() => {
                          showToast('Rating page link copied! Share it with players you\'ve met in-game.', 'success');
                        }).catch(() => {
                          showToast('Failed to copy link', 'error');
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-85"
                      style={{
                        background: 'linear-gradient(140deg, rgba(51,65,85,0.42), rgba(30,41,59,0.66))',
                        border: '1px solid var(--accent-primary-border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share Rating Page
                    </button>
                  )}
                </div>

                {user.badges && user.badges.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {user.badges.map((badge) => {
                      const badgeLookupKey = typeof badge === 'string' ? badge : (badge.key || badge.name);
                      const badgeDisplayName = typeof badge === 'string' ? badge : (badge.name || badge.key);
                      const prestigeBadgeKey = resolvePrestigeBadgeKey(badgeLookupKey);
                      const prestigeConfig = prestigeBadgeKey ? PRESTIGE_BADGE_CONFIG[prestigeBadgeKey] : null;
                      const config = prestigeConfig || badgeConfigs[badgeLookupKey] || badgeConfigs[badgeLookupKey.toLowerCase()] || BADGE_CONFIG[badgeLookupKey] || BADGE_CONFIG[badgeDisplayName] || {
                        icon: 'trophy',
                        bgColor: 'var(--badge-bg)',
                        borderColor: 'var(--badge-border)',
                        textColor: 'var(--badge-text)',
                        hoverBg: 'var(--badge-hover-bg)',
                        shape: 'squircle',
                        animation: 'breathe',
                      };
                      const badgeKeyNorm = badgeLookupKey.toLowerCase().replace(/\s+/g, '');
                      const tKey = `profile.badge.${badgeKeyNorm}.desc` as any;
                      const translatedDesc = t(tKey);
                      const displayLabel = prestigeBadgeKey ? PRESTIGE_BADGE_LABELS[prestigeBadgeKey] : badgeDisplayName;
                      const description = prestigeConfig
                        ? (prestigeConfig.description || displayLabel)
                        : (translatedDesc === tKey ? (config.description || badgeDisplayName) : translatedDesc);

                      return (
                        <LivingBadge
                          key={typeof badge === 'string' ? badge : badge.id}
                          badgeKey={badgeLookupKey}
                          icon={config.icon}
                          bgColor={config.bgColor}
                          borderColor={config.borderColor}
                          textColor={config.textColor}
                          hoverBg={config.hoverBg}
                          shape={config.shape}
                          animation={config.animation}
                          label={displayLabel}
                          description={description}
                          className="w-9 h-9 md:w-10 md:h-10"
                          iconClassName="w-5 h-5 md:w-6 md:h-6"
                          tooltipIconClassName="w-4 h-4"
                        />
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="rounded-lg border px-3 py-2.5" style={{ background: 'rgba(15,23,42,0.42)', borderColor: 'var(--border-card)' }}>
                    <p className="text-xs mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Skill ({user.feedback.length} ratings)</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className="w-5 h-5"
                            style={{ color: star <= user.skillStars ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>{user.skillStars}/5</span>
                    </div>
                  </div>

                  <div className="rounded-lg border px-3 py-2.5" style={{ background: 'rgba(15,23,42,0.42)', borderColor: 'var(--border-card)' }}>
                    <p className="text-xs mb-1 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Personality ({user.feedback.length} ratings)</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((moon) => (
                          <svg
                            key={moon}
                            className="w-5 h-5"
                            style={{ color: moon <= user.personalityMoons ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                            fill={moon <= user.personalityMoons ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                          >
                            <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>{user.personalityMoons}/5</span>
                    </div>
                  </div>

                  {user.reportCount > 0 && (
                    <div className="rounded-lg border px-3 py-2.5" style={{ background: 'rgba(127,29,29,0.22)', borderColor: 'rgba(239,68,68,0.38)' }}>
                      <p className="text-xs mb-1 uppercase tracking-wide" style={{ color: '#fca5a5' }}>Status</p>
                      <div className="flex items-center gap-2">
                        {user.reportCount > 3 ? (
                          <span className="text-sm font-medium px-2 py-1 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>⚠️ Flagged</span>
                        ) : (
                          <>
                            <span className="text-2xl">💀</span>
                            <span className="text-sm font-semibold" style={{ color: 'var(--accent-danger)' }}>{user.reportCount} report{user.reportCount !== 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <aside className="w-full xl:w-auto">
                <div
                  className="rounded-xl border p-4 sm:p-5"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-card)',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Competitive Snapshot
                  </p>

                  <div className="space-y-3">
                    {mainAccount ? (
                      <div className="rounded-lg border p-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                        <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Riot Main</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                          {mainAccount.gameName}#{mainAccount.tagLine}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {mainAccount.region}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border p-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No Riot account linked.</p>
                      </div>
                    )}

                    <div className="rounded-lg border p-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                      <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>{t('profile.bestRank')}</p>
                      {user.riotAccounts && user.riotAccounts.length > 0 ? (
                        (() => {
                          const best = getBestAccount(user.riotAccounts);
                          if (!best) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Unranked</p>;
                          const rankKey = best.rank || 'UNRANKED';
                          return (
                            <div className="flex flex-wrap items-center gap-2">
                              {getRankBadge(rankKey, best.division || undefined, undefined, rankColor, t)}
                              {best.winrate !== null && best.winrate !== undefined && getWinrateBadge(best.winrate, t)}
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No ranked data.</p>
                      )}
                    </div>

                    <div className="rounded-lg border p-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
                      <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>{t('profile.peakElo')}</p>
                      {user.peakRank && user.peakRank !== 'UNRANKED' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {getRankBadge(user.peakRank, user.peakDivision || undefined, user.peakLp || undefined, rankColor, t)}
                          {user.peakDate && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(user.peakDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No peak rank recorded.</p>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div
                className="rounded-xl border p-4 sm:p-5"
                style={{
                  background: 'linear-gradient(150deg, rgba(15,23,42,0.72), rgba(30,41,59,0.56))',
                  border: '1px solid var(--accent-primary-border)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-7 10-7-10" />
                    </svg>
                    <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: 'var(--text-main)' }}>
                      {t('profile.bio')}
                    </p>
                  </div>
                  {!isEditMode && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ color: 'var(--accent-primary)', background: 'var(--accent-primary-bg)', border: '1px solid var(--accent-primary-border)' }}
                    >
                      {(user.bio || '').length}/220
                    </span>
                  )}
                </div>

                <div className="rounded-lg border px-3 py-3 min-h-[148px]" style={{ background: 'rgba(15,23,42,0.52)', borderColor: 'var(--border-card)' }}>
                  {isEditMode ? (
                    <>
                      <textarea
                        value={editedBio}
                        onChange={(event) => setEditedBio(event.target.value.slice(0, 220))}
                        rows={8}
                        maxLength={220}
                        className="w-full px-3 py-2 rounded-lg border focus:outline-none"
                        style={{
                          background: 'var(--bg-card)',
                          borderColor: 'var(--border-card)',
                          color: 'var(--text-main)',
                        }}
                        placeholder="Write a short bio."
                      />
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {editedBio.length}/220
                      </p>
                    </>
                  ) : user.bio ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-main)' }}>
                      {user.bio}
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      No bio set yet.
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-card)' }}>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />
                      </svg>
                      Discord DMs
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        color: user.discordDmNotifications ? '#86efac' : 'var(--text-muted)',
                        background: user.discordDmNotifications ? 'rgba(34,197,94,0.18)' : 'var(--bg-card)',
                        border: `1px solid ${user.discordDmNotifications ? 'var(--accent-success-border)' : 'var(--border-card)'}`,
                      }}
                    >
                      {user.discordDmNotifications ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl border p-4 sm:p-5"
                style={{
                  background: 'linear-gradient(150deg, rgba(30,41,59,0.7), rgba(15,23,42,0.58))',
                  border: '1px solid rgba(250,204,21,0.28)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent-primary)' }}>{t('profile.activity.title')}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                    Match Rhythm
                  </span>
                </div>

                {user.riotAccounts && user.riotAccounts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg p-3 border" style={{ background: 'linear-gradient(140deg, rgba(37,99,235,0.18), rgba(15,23,42,0.45))', borderColor: 'rgba(59,130,246,0.35)' }}>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#bfdbfe' }}>{t('profile.activity.24h')}</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold" style={{ color: '#dbeafe' }}>{user.gamesPerDay || 0}</span>
                          <span className="text-xs" style={{ color: '#bfdbfe' }}>{t('profile.activity.games')}</span>
                        </div>
                      </div>
                      <div className="rounded-lg p-3 border" style={{ background: 'linear-gradient(140deg, rgba(217,119,6,0.18), rgba(15,23,42,0.45))', borderColor: 'rgba(245,158,11,0.35)' }}>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#fde68a' }}>{t('profile.activity.7d')}</p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold" style={{ color: '#fef3c7' }}>{user.gamesPerWeek || 0}</span>
                          <span className="text-xs" style={{ color: '#fde68a' }}>{t('profile.activity.games')}</span>
                        </div>
                      </div>
                    </div>

                    {user.preferredRole && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                            {user.secondaryRole ? t('profile.mostPlayedRoles') : t('profile.mostPlayedRole')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold px-2 py-1 rounded-lg border inline-flex items-center gap-1" style={{
                              background: 'linear-gradient(140deg, rgba(200,170,109,0.22), rgba(120,53,15,0.24))',
                              color: '#FDE68A',
                              borderColor: 'rgba(245,158,11,0.45)'
                            }}>
                              {getRoleIcon(user.preferredRole)}
                              {user.preferredRole}
                            </span>
                            {user.secondaryRole && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-lg border inline-flex items-center gap-1" style={{
                                background: 'linear-gradient(140deg, rgba(99,102,241,0.2), rgba(30,64,175,0.24))',
                                color: '#BFDBFE',
                                borderColor: 'rgba(96,165,250,0.45)'
                              }}>
                                {getRoleIcon(user.secondaryRole)}
                                {user.secondaryRole}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>{t('profile.acrossAccounts')}</p>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Link a Riot account to unlock activity stats.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Playstyles Section */}
        <div className="rounded-xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold flex items-center mb-4" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('profile.playstyles')}
          </h2>

          {isEditMode ? (
            <div>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{t('profile.selectUpTo2Playstyles')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {AVAILABLE_PLAYSTYLES.map((style) => {
                  const isSelected = selectedPlaystyles.includes(style);
                  const isLocked = !isSelected && selectedPlaystyles.length >= 2;
                  const theme = getPlaystyleTheme(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPlaystyles(selectedPlaystyles.filter((s) => s !== style));
                        } else if (selectedPlaystyles.length < 2) {
                          setSelectedPlaystyles([...selectedPlaystyles, style]);
                        }
                      }}
                      className="relative min-h-[96px] p-3 rounded-lg border text-left transition-all overflow-hidden"
                      style={{
                        background: isSelected ? theme.selectedBg : theme.baseBg,
                        borderColor: isSelected ? theme.selectedBorder : theme.baseBorder,
                        color: isSelected ? theme.selectedText : theme.baseText,
                        boxShadow: isSelected ? `0 10px 20px ${theme.glow}` : 'none',
                        opacity: isLocked ? 0.72 : 1,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <div className="absolute inset-0 pointer-events-none">
                        {renderPlaystyleIllustration(style, isSelected)}
                        <div
                          className="absolute inset-0"
                          style={{
                            background: isSelected
                              ? 'linear-gradient(180deg, rgba(2,6,23,0.04), rgba(2,6,23,0.36))'
                              : 'linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.46))',
                          }}
                        />
                      </div>
                      <span className="relative z-10 inline-flex items-center gap-2 text-sm font-semibold">
                        <span className="text-base drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]">{theme.icon}</span>
                        <span>{style}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {user.playstyles.length > 0 ? (
                user.playstyles.map((style) => {
                  const theme = getPlaystyleTheme(style);
                  return (
                    <div
                      key={style}
                      className="relative min-h-[96px] px-3 py-2.5 border rounded-lg overflow-hidden"
                      style={{
                        background: theme.selectedBg,
                        borderColor: theme.selectedBorder,
                        boxShadow: `0 10px 20px ${theme.glow}`,
                      }}
                    >
                      <div className="absolute inset-0 pointer-events-none">
                        {renderPlaystyleIllustration(style, true)}
                        <div
                          className="absolute inset-0"
                          style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0.06), rgba(2,6,23,0.36))' }}
                        />
                      </div>
                      <p className="relative z-10 text-sm font-semibold" style={{ color: theme.selectedText }}>
                        {theme.icon} {style}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('profile.noPlaystyles')}</p>
              )}
            </div>
          )}
        </div>

        {/* Languages Section */}
        <div className="rounded-xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold flex items-center mb-4" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {t('profile.languages')}
          </h2>

          {isEditMode ? (
            <div>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{t('profile.selectLanguages')}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const isSelected = editedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => {
                        if (isSelected) {
                          setEditedLanguages(editedLanguages.filter((l) => l !== lang));
                        } else {
                          setEditedLanguages([...editedLanguages, lang]);
                        }
                      }}
                      className="p-3 rounded-lg border-2 font-medium text-sm transition-all"
                      style={{
                        background: isSelected ? 'var(--accent-primary-bg)' : 'var(--bg-input)',
                        borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-card)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.languages && user.languages.length > 0 ? (
                user.languages.map((lang) => (
                  <span key={lang}>{getLanguageBadge(lang)}</span>
                ))
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('profile.noLanguages')}</p>
              )}
            </div>
          )}
        </div>

        {/* Champions Section */}
        <div ref={championPoolSectionRef} id="champion-pool-section" className="rounded-xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            {t('profile.championPool')}
          </h2>
          
          {isEditMode ? (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
                <span className="text-xl">💡</span>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  <strong>Drag & Drop:</strong> Drag champions from suggestions or between tiers. Click × to remove.
                </p>
              </div>

              {/* Search input */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={championInput}
                    onChange={(e) => setChampionInput(e.target.value)}
                    placeholder="Search champion..."
                    className="w-full px-4 py-3 rounded-lg border-2 transition-colors pr-12"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                </div>

                {/* Search results */}
                {championInput.trim().length > 0 && (
                  <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-card)' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                      Search Results - Drag to a tier
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
                      {champions
                        .filter((c) => normalize(c).includes(normalize(championInput)))
                        .filter((c) => !isInAnyTier(c))
                        .slice(0, 20)
                        .map((c) => (
                          <div
                            key={c}
                            draggable
                            onDragStart={(e) => {
                              setDraggedChampion({ name: c, fromTier: 'suggestions' });
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => setDraggedChampion(null)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-grab active:cursor-grabbing transition-all hover:scale-105"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}
                          >
                            <img 
                              src={getChampionIconUrl(c)} 
                              alt={c}
                              className="w-8 h-8 rounded pointer-events-none"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span style={{ color: 'var(--text-main)' }}>{c}</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⋮⋮</span>
                          </div>
                        ))}
                      {champions
                        .filter((c) => normalize(c).includes(normalize(championInput)))
                        .filter((c) => !isInAnyTier(c))
                        .length === 0 && (
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No champions found</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Suggestions - User's most played or Popular */}
                <div className="pt-3" style={{ borderTop: '1px solid var(--border-card)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✨</span>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {userMasteryChampions.length > 0 ? 'Your Most Played Champions' : 'Popular Champions'} - Drag to add
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(userMasteryChampions.length > 0 ? userMasteryChampions : POPULAR_CHAMPIONS)
                      .filter((c) => !isInAnyTier(c) && isValidChampion(c))
                      .slice(0, 12)
                      .map((c) => (
                        <div
                          key={c}
                          draggable
                          onDragStart={(e) => {
                            setDraggedChampion({ name: c, fromTier: 'suggestions' });
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => setDraggedChampion(null)}
                          className="group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-grab active:cursor-grabbing transition-all hover:scale-105"
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}
                        >
                          <img 
                            src={getChampionIconUrl(c)} 
                            alt={c}
                            className="w-6 h-6 rounded pointer-events-none"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span style={{ color: 'var(--text-secondary)' }}>{c}</span>
                          <span className="text-xs opacity-50 group-hover:opacity-100" style={{ color: 'var(--text-muted)' }}>⋮⋮</span>
                        </div>
                      ))}
                    {(userMasteryChampions.length > 0 ? userMasteryChampions : POPULAR_CHAMPIONS)
                      .filter((c) => !isInAnyTier(c) && isValidChampion(c)).length === 0 && (
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>All suggested champions have been added!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tier lists with drop zones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['S','A','B','C'] as const).map((tier) => {
                  const tierColors = {
                    S: { bg: '#FFD700', border: '#FFD700', text: '#FFD700', gradient: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)' },
                    A: { bg: '#C0C0C0', border: '#C0C0C0', text: '#C0C0C0', gradient: 'linear-gradient(135deg, rgba(192,192,192,0.15) 0%, rgba(192,192,192,0.05) 100%)' },
                    B: { bg: '#CD7F32', border: '#CD7F32', text: '#CD7F32', gradient: 'linear-gradient(135deg, rgba(205,127,50,0.15) 0%, rgba(205,127,50,0.05) 100%)' },
                    C: { bg: '#808080', border: '#808080', text: '#808080', gradient: 'linear-gradient(135deg, rgba(128,128,128,0.15) 0%, rgba(128,128,128,0.05) 100%)' },
                  };
                  const colors = tierColors[tier];
                  const isDragOver = dragOverTier === tier;
                  return (
                    <div 
                      key={tier} 
                      className="rounded-xl overflow-hidden transition-all"
                      style={{ 
                        background: isDragOver ? `${colors.bg}30` : colors.gradient, 
                        border: isDragOver ? `2px dashed ${colors.border}` : `1px solid ${colors.border}40`,
                        boxShadow: isDragOver ? `0 0 20px ${colors.bg}40` : (championTierlist[tier].length > 0 ? `0 0 20px ${colors.bg}10` : 'none'),
                        transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverTier(tier);
                      }}
                      onDragLeave={() => setDragOverTier(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTier(null);
                        if (draggedChampion) {
                          // Remove from previous tier if moving between tiers
                          if (draggedChampion.fromTier && draggedChampion.fromTier !== 'suggestions' && draggedChampion.fromTier !== tier) {
                            removeFromTier(draggedChampion.fromTier, draggedChampion.name);
                          }
                          // Add to new tier
                          if (!championTierlist[tier].includes(draggedChampion.name)) {
                            addToTier(tier, draggedChampion.name);
                          }
                          setDraggedChampion(null);
                        }
                      }}
                    >
                      <div 
                        className="flex items-center gap-3 px-4 py-2"
                        style={{ borderBottom: `1px solid ${colors.border}30`, background: `${colors.bg}15` }}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                          style={{ background: colors.bg, color: '#1a1a1a', boxShadow: `0 2px 8px ${colors.bg}50` }}
                        >
                          {tier}
                        </div>
                        <span className="font-semibold text-sm" style={{ color: colors.text }}>
                          {tier} Tier
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: `${colors.bg}20`, color: colors.text }}>
                          {championTierlist[tier].length}
                        </span>
                      </div>
                      <div className="p-3 min-h-[80px]">
                        <div className="flex flex-wrap gap-2">
                          {championTierlist[tier].map((c) => (
                            <div 
                              key={c}
                              draggable
                              onDragStart={(e) => {
                                setDraggedChampion({ name: c, fromTier: tier });
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => setDraggedChampion(null)}
                              className="group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:scale-105" 
                              style={{ 
                                background: 'var(--bg-main)', 
                                border: `1px solid ${colors.border}40`,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              }}
                            >
                              <img 
                                src={getChampionIconUrl(c)} 
                                alt={c}
                                className="w-8 h-8 rounded pointer-events-none"
                                style={{ border: `2px solid ${colors.border}60`, boxShadow: `0 0 8px ${colors.bg}30` }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <span className="font-medium text-sm pointer-events-none" style={{ color: 'var(--text-main)' }}>{c}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeFromTier(tier, c); }} 
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: 'var(--accent-danger)', color: 'white' }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {championTierlist[tier].length === 0 && (
                            <span className="text-sm py-2 px-3 rounded-lg" style={{ color: 'var(--text-muted)', background: isDragOver ? 'transparent' : 'var(--bg-input)' }}>
                              {isDragOver ? '⬇️ Drop here' : 'Drag a champion here'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="space-y-3">
                {(['S','A','B','C'] as const).map((tier) => {
                    const tierColors = {
                      S: { bg: '#ef4444', border: '#ef4444', text: '#ef4444' },
                      A: { bg: '#C8AA6E', border: '#C8AA6E', text: '#C8AA6E' },
                      B: { bg: '#3b82f6', border: '#3b82f6', text: '#3b82f6' },
                      C: { bg: '#22c55e', border: '#22c55e', text: '#22c55e' },
                    };
                    const colors = tierColors[tier];
                    return (
                      <div key={tier}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: `${colors.bg}20`, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.border, color: colors.text }}>{tier}</span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tier</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {user.championTierlist && Array.isArray(user.championTierlist[tier]) && user.championTierlist[tier].length > 0 ? (
                            user.championTierlist[tier].map((c: string, i: number) => (
                              <div key={`${tier}-${i}`} className="px-3 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: `${colors.bg}20`, borderWidth: '1px', borderStyle: 'solid', borderColor: colors.border, color: colors.text }}>
                                <img 
                                  src={getChampionIconUrl(c)} 
                                  alt={c}
                                  className="w-8 h-8"
                                  onError={(e) => {
                                    // Hide icon on error
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                {c}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No champions</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          )}
        </div>

        {/* Linked Riot Accounts */}
        <div className="rounded-xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {t('profile.linkedRiotAccounts')}
          </h2>
          {user.riotAccounts.length > 0 ? (
            <>
              <div className="space-y-3 mb-4">
                {user.riotAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 rounded-lg border-2 flex flex-wrap items-center justify-between gap-2"
                    style={{
                      background: (isEditMode ? pendingMainAccountId === account.id : account.isMain) ? 'var(--accent-primary-bg)' : 'var(--bg-input)',
                      borderColor: (isEditMode ? pendingMainAccountId === account.id : account.isMain) ? 'var(--accent-primary)' : 'var(--border-card)'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: account.verified ? 'var(--accent-success)' : 'var(--text-muted)' }}></div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Show username only if not hidden or if viewing own profile */}
                          {(!account.hidden || !isViewingOther) ? (
                            <p className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                              <img width="16" height="16" src="https://img.icons8.com/color/48/riot-games.png" alt="riot-games" />
                              {account.gameName}#{account.tagLine}
                              {(isEditMode ? pendingMainAccountId === account.id : account.isMain) && (
                                <span className="ml-2 text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'var(--accent-primary)', color: 'var(--btn-gradient-text)' }}>
                                  MAIN
                                </span>
                              )}
                              {account.hidden && !isViewingOther && (
                                <span className="ml-2 text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'var(--accent-info-bg)', color: 'var(--accent-info)', border: '1px solid var(--accent-info-border)' }}>
                                  🔒 Hidden
                                </span>
                              )}
                            </p>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="font-semibold italic" style={{ color: 'var(--text-muted)' }}>
                                Hidden Account
                              </p>
                              {account.isMain && (
                                <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: 'var(--accent-primary)', color: 'var(--btn-gradient-text)' }}>
                                  MAIN
                                </span>
                              )}
                            </div>
                          )}
                          {(() => {
                            const rankKey = account.rank || 'UNRANKED';
                            return getRankBadge(rankKey, account.division || undefined, undefined, rankColor, t);
                          })()}
                          {account.winrate !== null && account.winrate !== undefined ? getWinrateBadge(account.winrate, t) : (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>N/A WR</span>
                          )}
                        </div>
                        {(!account.hidden || !isViewingOther) && (
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{account.region}</p>
                        )}
                      </div>
                    </div>
                    {isEditMode && (
                      <div className="flex items-center space-x-2">
                        {pendingMainAccountId !== account.id && (
                          <>
                            <button
                              onClick={() => handleToggleHidden(account.id, account.hidden)}
                              className="px-3 py-1 rounded text-xs font-medium transition-colors"
                              style={{
                                background: account.hidden ? 'var(--accent-info-bg)' : 'var(--btn-disabled-bg)',
                                color: account.hidden ? 'var(--accent-info)' : 'var(--text-secondary)'
                              }}
                            >
                              {account.hidden ? t('profile.show') : t('profile.hide')}
                            </button>
                            <button
                              onClick={() => handleSwitchMain(account.id)}
                              className="px-3 py-1 rounded text-xs font-medium transition-colors"
                              style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary)' }}
                            >
                              {t('profile.setAsMain')}
                            </button>
                            <button
                              onClick={() => handleRemoveAccount(account.id)}
                              className="px-3 py-1 rounded text-xs font-medium transition-colors"
                              style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}
                            >
                              {t('common.remove')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!isViewingOther && (
                <Link
                  href="/authenticate"
                  className="inline-flex items-center px-4 py-2 font-bold rounded-lg transition-all text-sm"
                  style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Riot Account
                </Link>
              )}
            </>
          ) : (
            <div className="p-4 rounded-lg text-center" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{t('profile.noRiotAccounts')}</p>
              {!isViewingOther && (
                <Link
                  href="/authenticate"
                  className="inline-flex items-center px-4 py-2 font-semibold rounded-lg text-sm transition-colors"
                  style={{ background: 'var(--btn-gradient)', color: 'var(--btn-gradient-text)' }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('profile.addRiotAccount')}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Discord Account */}
        <div className="rounded-xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
            <DiscordIcon className="w-6 h-6 mr-2" style={{ color: 'var(--accent-discord)' }} />
            {t('profile.discordAccount')}
          </h2>
          {user.discordLinked ? (
            <div className="p-4 rounded-lg flex items-center justify-between" style={{ background: 'var(--accent-discord-bg)', border: '1px solid var(--accent-discord-border)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-main)' }}>{user.discordUsername}</p>
              {!isViewingOther && (
                <button 
                  onClick={async () => {
                    const unlinkOk = await confirm({ title: 'Unlink Discord', message: 'Are you sure you want to unlink your Discord account?', confirmText: 'Unlink' });
                    if (!unlinkOk) return;
                    try {
                      const response = await fetch(`${API_URL}/api/auth/discord/unlink`, {
                        method: 'DELETE',
                        headers: getAuthHeader(),
                      });
                      if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        throw new Error(data.error || 'Failed to unlink Discord');
                      }
                      // Refresh profile
                      const profileUrl = `${API_URL}/api/user/profile?includeHidden=true`;
                      const profileResponse = await fetch(profileUrl, {
                        headers: getAuthHeader(),
                      });
                      if (profileResponse.ok) {
                        const data = await profileResponse.json();
                        setUser(normalizeProfilePayload(data));
                      }
                    } catch (err: any) {
                      console.error('Error unlinking Discord:', err);
                      showToast(err.message || 'Failed to unlink Discord account', 'error');
                    }
                  }}
                  className="px-3 py-1 rounded text-xs font-medium transition-colors"
                  style={{ background: 'var(--accent-danger-bg)', color: 'var(--accent-danger)' }}
                >
                  {t('profile.unlink')}
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg text-center" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{t('profile.noDiscordAccount')}</p>
              {!isViewingOther && (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_URL}/api/auth/discord/login`, {
                        headers: getAuthHeader(),
                      });
                      if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        throw new Error(data.error || 'Failed to get Discord auth URL');
                      }
                      const data = await response.json();
                      window.location.href = data.url;
                    } catch (err: any) {
                      console.error('Error initiating Discord link:', err);
                      showToast(err.message || 'Failed to start Discord linking', 'error');
                    }
                  }}
                  className="discord-cta inline-flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-sm"
                >
                  <DiscordIcon className="w-4 h-4" />
                  Link Discord
                </button>
              )}
            </div>
          )}
        </div>

        {/* Servers & Anonymous Mode */}
        <div className={`grid grid-cols-1 ${!isViewingOther ? 'md:grid-cols-2' : ''} gap-6`}>
          {/* Servers */}
          <div className="rounded-xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
            <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Region
            </h2>
            {user.region ? (
              <span className="px-3 py-1 rounded-full font-medium text-sm" style={{ background: 'var(--accent-primary-bg)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                {user.region}
              </span>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No region set</p>
            )}
          </div>

          {/* Anonymous Mode - Only show when viewing own profile */}
          {!isViewingOther && (
            <div className="rounded-xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
              <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                Anonymous Mode
              </h2>
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {anonymousMode ? 'Profile is hidden from public searches' : 'Profile is visible to everyone'}
                </p>
                <button
                  onClick={handleToggleAnonymous}
                  className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors"
                  style={{ background: anonymousMode ? 'var(--accent-primary)' : 'var(--btn-disabled-bg)' }}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full transition-transform border ${
                      anonymousMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                    style={{ background: anonymousMode ? 'var(--color-bg-primary)' : 'var(--btn-disabled-bg)', borderColor: anonymousMode ? 'var(--accent-primary)' : 'var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Communities */}
        <div className="rounded-xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t('profile.communities')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {user.communities.map((community) => (
              <Link
                key={community.id}
                href={`/communities/${community.id}`}
                className="group p-3 rounded-lg flex items-center space-x-3 transition-all"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--accent-primary-border)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-lg font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96,165,250,0.18), rgba(167,139,250,0.18))',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-primary-border)'
                  }}
                >
                  {community.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold" style={{ color: 'var(--text-main)' }}>{community.name}</p>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: 'rgba(96,165,250,0.18)',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--accent-primary-border)'
                      }}
                    >
                      {community.role.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {t('profile.clickToViewCommunity')}
                  </p>
                </div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Feedback Section */}
        {isViewingOther && (
          <div className="flex gap-3 mb-4">
            <button
              className="px-4 py-2 rounded bg-[var(--accent-primary)] text-[var(--btn-gradient-text)] font-bold shadow"
              onClick={() => setShowFeedbackModal(true)}
            >
              {t('profile.giveFeedback')}
            </button>
            <button
              className="px-4 py-2 rounded font-bold shadow transition-colors flex items-center gap-2"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-card)',
                color: 'var(--text-primary)',
                border: '2px solid',
              }}
              onClick={() => openConversation(user.id)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message
            </button>
            <button
              className="px-4 py-2 rounded bg-[var(--accent-danger)] text-[var(--btn-gradient-text)] font-bold shadow"
              onClick={() => setShowReportModal(true)}
            >
              {t('profile.report')}
            </button>
            <button
              className="px-4 py-2 rounded font-bold shadow transition-opacity disabled:opacity-50"
              style={{
                background: isBlocked ? 'var(--color-bg-tertiary)' : '#6B7280',
                color: '#fff',
                border: isBlocked ? '1px solid var(--color-border)' : 'none',
              }}
              onClick={handleToggleBlock}
              disabled={isCheckingBlock}
            >
              {isCheckingBlock ? t('common.loading') : isBlocked ? t('profile.unblock') : t('profile.block')}
            </button>
          </div>
        )}
        {showFeedbackModal && (
          <FeedbackModal
            username={user.username}
            open={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            onSubmit={handleSubmitFeedback}
          />
        )}
        {showReportModal && (
          <ReportModal
            username={user.username}
            open={showReportModal}
            onClose={() => setShowReportModal(false)}
            onSubmit={handleSubmitReport}
          />
        )}
        {/* Feedback Section */}
        <div className="rounded-xl p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '2px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--accent-primary)' }}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Feedback ({user.feedback.length})
          </h2>
          <div className="space-y-3">
            {user.feedback.length > 0 ? (
              user.feedback.map((fb) => (
                <div key={fb.id} className="p-4 rounded-lg relative" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Skill:</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className="w-4 h-4"
                                style={{ color: star <= fb.stars ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Personality:</span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((moon) => (
                              <svg
                                key={moon}
                                className="w-4 h-4"
                                style={{ color: moon <= fb.moons ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium">
                        by{' '}
                        <Link
                          href={`/profile/${fb.raterUsername}`}
                          className="hover:underline"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {fb.raterUsername}
                        </Link>
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{fb.date}</span>
                    </div>
                  </div>
                  {fb.comment && <p className="text-sm mt-2" style={{ color: 'var(--text-main)' }}>{fb.comment}</p>}
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmState({ open: true, feedbackId: fb.id })}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-[var(--accent-danger-bg)] transition-colors"
                      title="Delete feedback"
                    >
                      <svg className="w-4 h-4" fill="var(--accent-danger)" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No feedback yet</p>
            )}
          </div>
        </div>
      </div>
      {/* Confirm delete feedback */}
      <ConfirmModal
        open={confirmState.open}
        title="Delete Feedback"
        message="Are you sure you want to delete this feedback? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setConfirmState({ open: false, feedbackId: null })}
        onConfirm={() => {
          if (confirmState.feedbackId) {
            const id = confirmState.feedbackId;
            setConfirmState({ open: false, feedbackId: null });
            handleDeleteFeedback(id);
          }
        }}
      />

      {/* Toast notifications */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}

// Keep default export of ProfilePage

// ============================================================================
// INTEGRATION NOTES FOR FUTURE DEVELOPMENT
// ============================================================================

/*
1. DATA FETCHING:
   - Replace MOCK_USER with real API call
   - Example with SWR:
     import useSWR from 'swr';
     const { data: user, mutate } = useSWR('/api/user/profile');
   - Or React Query:
     const { data: user } = useQuery(['profile'], fetchUserProfile);

2. UPDATE OPERATIONS:
   - Wire all state changes to API mutations
   - Example for playstyles:
     const updatePlaystyles = async (playstyles) => {
       await fetch('/api/user/playstyles', {
         method: 'PATCH',
         body: JSON.stringify({ playstyles })
       });
       mutate(); // Refresh data
     };

3. RIOT ACCOUNT MANAGEMENT:
   - handleSwitchMain → PATCH /api/user/riot-accounts/:id/set-main
   - handleRemoveAccount → DELETE /api/user/riot-accounts/:id
   - Add account → Redirect to /verify-test with return URL

4. ANONYMOUS MODE:
   - Toggle → PATCH /api/user/settings with { anonymousMode: boolean }
   - Should update user privacy settings in database

5. CHAMPIONS EDITOR:
   - Add modal or inline editor for champion list
   - Support tierlist mode toggle
   - Validate max 5 champions in list mode

6. DISCORD INTEGRATION:
   - OAuth flow for Discord linking
   - Store Discord ID and username
   - Unlink should revoke permissions

7. FEEDBACK SYSTEM:
   - Paginate feedback if count is high
   - Add filter by rating
   - Add report/flag functionality

8. LOADING STATES:
   - Show skeletons while fetching user data
   - Disable buttons during mutations
   - Show error states for failed operations
*/
