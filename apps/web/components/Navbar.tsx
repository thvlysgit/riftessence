// Full-featured responsive Navbar for League of Legends LFD + Social Rating Platform
// Built with Next.js, TypeScript, and Tailwind CSS
// Styled to match the Riot "Summoner Hub" dark theme

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getAuthHeader } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type SearchResult = {
  id: string;
  username: string;
  verified: boolean;
  badges: Array<{ key: string; name: string }>;
  profileIconId?: number;
};

export default function Navbar() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { currentTheme } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Theme-based logo SVG icon
  const getThemeLogo = () => {
    switch (currentTheme) {
      case 'arcane-pastel':
        // Lavender flower
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <defs>
              <linearGradient id="gradient-pastel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-accent-1)" />
                <stop offset="100%" stopColor="var(--color-accent-2)" />
              </linearGradient>
            </defs>
            <path d="M12 2C12 2 8 4 8 8C8 10 9 11 10 11.5C9 12 8 13 8 15C8 17 10 19 12 22C14 19 16 17 16 15C16 13 15 12 14 11.5C15 11 16 10 16 8C16 4 12 2 12 2Z" fill="url(#gradient-pastel)" />
            <circle cx="12" cy="8" r="1.5" fill="var(--color-bg-primary)" opacity="0.3" />
            <circle cx="12" cy="15" r="1.5" fill="var(--color-bg-primary)" opacity="0.3" />
          </svg>
        );
      case 'infernal-ember':
        // Flame
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <defs>
              <linearGradient id="gradient-ember" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-accent-1)" />
                <stop offset="100%" stopColor="var(--color-accent-2)" />
              </linearGradient>
            </defs>
            <path d="M12 2C12 2 8 6 8 10C8 13 10 15 12 15C12 15 11 12 13 10C15 8 16 6 16 10C16 14 14 16 12 22C12 22 18 18 18 12C18 6 12 2 12 2Z" fill="url(#gradient-ember)" />
            <path d="M12 8C12 8 10 10 10 12C10 13.5 11 14.5 12 14.5C12 14.5 13 12 12 8Z" fill="var(--color-bg-primary)" opacity="0.25" />
          </svg>
        );
      case 'nightshade':
        // Crescent moon with stars
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <defs>
              <linearGradient id="gradient-night" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-accent-1)" />
                <stop offset="100%" stopColor="var(--color-accent-2)" />
              </linearGradient>
            </defs>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="url(#gradient-night)" />
            <circle cx="18" cy="6" r="1" fill="var(--color-accent-1)" />
            <circle cx="20" cy="9" r="0.8" fill="var(--color-accent-2)" />
            <circle cx="16" cy="4" r="0.6" fill="var(--color-accent-1)" />
          </svg>
        );
      case 'radiant-light':
        // Sun with rays
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <defs>
              <linearGradient id="gradient-light" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-accent-1)" />
                <stop offset="100%" stopColor="var(--color-accent-2)" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="4" fill="url(#gradient-light)" />
            <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12M19.07 19.07l-2.12-2.12M7.05 7.05L4.93 4.93" stroke="url(#gradient-light)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'classic':
      default:
        // Crossed swords
        return (
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <defs>
              <linearGradient id="gradient-classic" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-accent-1)" />
                <stop offset="100%" stopColor="var(--color-accent-2)" />
              </linearGradient>
            </defs>
            <path d="M6.2 3L3 6.2L10.8 14L8 16.8L4.8 13.6L2 16.4L7.6 22L10.4 19.2L7.2 16L10 13.2L17.8 21L21 17.8L13.2 10L16 7.2L19.2 10.4L22 7.6L16.4 2L13.6 4.8L16.8 8L14 10.8L6.2 3Z" fill="url(#gradient-classic)" />
          </svg>
        );
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        if (!user.id) return;

        const res = await fetch(`${API_URL}/api/notifications?userId=${encodeURIComponent(user.id)}`);
        if (res.ok) {
          const data = await res.json();
          const unread = data.notifications?.filter((n: any) => !n.read).length || 0;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchUnreadCount();
    // Poll every 30 seconds to keep count updated
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        if (!user.id) {
          setIsAdmin(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/user/check-admin?userId=${encodeURIComponent(user.id)}`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin || false);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Search users with debouncing
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/user/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
          setShowSearchResults(true);
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  const navigateToProfile = (username: string) => {
    setSearchQuery('');
    setShowSearchResults(false);
    router.push(`/profile/${username}`);
  };

  return (
    <nav 
      className="sticky top-0 z-50 border-b shadow-lg"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Left: Logo + Main Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/feed" className="flex items-center space-x-2 group">
              <div 
                className="w-10 h-10 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-105"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: 'var(--border-radius)',
                  border: '2px solid var(--color-accent-1)',
                }}
              >
                {getThemeLogo()}
              </div>
              <span className="hidden sm:block font-bold text-lg" style={{ color: 'var(--color-accent-1)' }}>RiftEssence</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <NavLink href="/feed">LFD</NavLink>
              <NavLink href="/lft">LFT</NavLink>
              <NavLink href="/matchups">Matchups</NavLink>
              <NavLink href="/coaching">Coaching</NavLink>
              <NavLink href="/profile">Profile</NavLink>
            </div>
          </div>

          {/* Center: Search Bar (Desktop + Tablet) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8" ref={searchRef}>
            <div className="relative w-full">
              <input
                type="text"
                placeholder={t('navbar.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                  searchQuery.length >= 2 && setShowSearchResults(true);
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
                className="w-full px-4 py-2 pl-10 border transition-colors text-sm"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div 
                  className="absolute top-full mt-2 w-full border py-2 z-50"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    borderRadius: 'var(--border-radius)',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => navigateToProfile(result.username)}
                      className="w-full px-4 py-2 text-left transition-colors flex items-center gap-3"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {result.profileIconId ? (
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${result.profileIconId}.png`}
                          alt={result.username}
                          className="w-8 h-8 rounded-full"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                          style={{
                            background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
                            color: 'var(--color-bg-primary)',
                          }}
                        >
                          {result.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{result.username}</p>
                        {result.verified && (
                          <span className="text-xs text-green-400">✓ Verified</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div 
                  className="absolute top-full mt-2 w-full border py-4 px-4 z-50"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    borderRadius: 'var(--border-radius)',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>No users found</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Notifications, User Menu */}
          <div className="flex items-center space-x-3">

            {/* Language Beta Badge */}
            {currentLanguage === 'fr' && (
              <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded text-xs font-semibold" style={{
                backgroundColor: 'rgba(251, 146, 60, 0.15)',
                color: '#fb923c',
                border: '1px solid rgba(251, 146, 60, 0.3)'
              }}>
                <span>🇫🇷</span>
                <span>BETA</span>
              </div>
            )}

            {/* Notifications Bell */}
            {user && (
              <Link
                href="/notifications"
                className="hidden md:block relative p-2 rounded-lg transition-colors"
                title="Notifications"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-accent-1)';
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Notification badge - show when there are unread notifications */}
                {unreadCount > 0 && (
                  <span 
                    className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full"
                    style={{
                      backgroundColor: '#C84040',
                      color: '#fff',
                      padding: '0 4px'
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Menu or Login Button */}
            {loading ? (
              // Avoid flashing login button while auth state loads
              <div className="w-20 h-8" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* User Avatar */}
                  {user.profileIconId ? (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/${user.profileIconId}.png`}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
                        color: 'var(--color-bg-primary)',
                      }}
                    >
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  {/* Username (hidden on mobile) */}
                  <span className="hidden md:block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{user.username}</span>
                  {/* Dropdown icon */}
                  <svg className="hidden md:block w-4 h-4" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-48 border py-1 z-10"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--border-radius)',
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-accent-1)' }}>{user.username}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>View Profile</p>
                    </div>
                    <DropdownLink href="/profile">My Profile</DropdownLink>
                    <DropdownLink href="/notifications">
                      <div className="flex items-center justify-between">
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <span 
                            className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full"
                            style={{
                              backgroundColor: '#C84040',
                              color: '#fff',
                              padding: '0 4px'
                            }}
                          >
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </DropdownLink>
                    <DropdownLink href="/settings">Settings</DropdownLink>
                    <DropdownLink href="/communities">Communities</DropdownLink>
                    <DropdownLink href="/leaderboards">Leaderboards</DropdownLink>
                    {isAdmin && <DropdownLink href="/admin">🛡️ Admin Dashboard</DropdownLink>}
                    <hr className="my-1" style={{ borderColor: 'var(--color-border)' }} />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm transition-colors"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                        e.currentTarget.style.color = '#C84040';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Login Button for logged-out users */
              <Link
                href="/login"
                className="px-4 py-2 font-bold transition-all shadow-md text-sm"
                style={{
                  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))',
                  color: 'var(--color-bg-primary)',
                  borderRadius: 'var(--border-radius)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-accent-1)';
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden border-t shadow-lg"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="px-4 py-4 space-y-1">
            {/* Mobile Search */}
            <div className="mb-4" ref={searchRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('navbar.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                    searchQuery.length >= 2 && setShowSearchResults(true);
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                  className="w-full px-4 py-2 pl-10 border transition-colors text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    borderRadius: 'var(--border-radius)',
                  }}
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                {/* Mobile Search Results */}
                {showSearchResults && searchResults.length > 0 && (
                  <div 
                    className="absolute top-full mt-2 w-full border py-2 z-50"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--border-radius)',
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          navigateToProfile(result.username);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left transition-colors flex items-center gap-3"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                          style={{
                            background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
                            color: 'var(--color-bg-primary)',
                          }}
                        >
                          {result.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{result.username}</p>
                          {result.verified && (
                            <span className="text-xs text-green-400">✓ Verified</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div 
                    className="absolute top-full mt-2 w-full border py-4 px-4 z-50"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--border-radius)',
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>No users found</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile Navigation Links */}
            <MobileNavLink href="/feed">LFD</MobileNavLink>
            <MobileNavLink href="/lft">LFT</MobileNavLink>
            <MobileNavLink href="/matchups">Matchups</MobileNavLink>
            <MobileNavLink href="/coaching">Coaching</MobileNavLink>
            <MobileNavLink href="/profile">Profile</MobileNavLink>
            <MobileNavLink href="/communities">Communities</MobileNavLink>
            <MobileNavLink href="/leaderboards">Leaderboards</MobileNavLink>
            {user && (
              <MobileNavLink href="/notifications">
                <div className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span 
                      className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full"
                      style={{
                        backgroundColor: '#C84040',
                        color: '#fff',
                        padding: '0 4px'
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              </MobileNavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// Desktop Navigation Link Component
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm font-medium transition-colors"
      style={{
        color: 'var(--color-text-secondary)',
        borderRadius: 'var(--border-radius)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--color-accent-1)';
        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--color-text-secondary)';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </Link>
  );
}

// Dropdown Menu Link Component
function DropdownLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-sm transition-colors"
      style={{ color: 'var(--color-text-secondary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
        e.currentTarget.style.color = 'var(--color-accent-1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-secondary)';
      }}
    >
      {children}
    </Link>
  );
}

// Mobile Navigation Link Component
function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 text-sm font-medium transition-colors"
      style={{
        color: 'var(--color-text-secondary)',
        borderRadius: 'var(--border-radius)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--color-accent-1)';
        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--color-text-secondary)';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </Link>
  );
}

// ============================================================================
// INTEGRATION NOTES FOR FUTURE DEVELOPMENT
// ============================================================================

/*
1. AUTH INTEGRATION:
   - Replace MOCK_USER with your auth context/hook
   - Example with NextAuth:
     import { useSession, signOut } from 'next-auth/react';
     const { data: session } = useSession();
     const user = session?.user;
   - Update handleLogout to call your auth logout function

2. SEARCH FUNCTIONALITY:
   - Wire the search input onChange to a search handler
   - Add debouncing for API calls
   - Show search results dropdown below input
   - Example:
     const [searchQuery, setSearchQuery] = useState('');
     const debouncedSearch = useDebounce(searchQuery, 300);

3. NOTIFICATIONS:
   - Fetch notification count from API
   - Show badge with count: <span>{notificationCount}</span>
   - Add dropdown panel with notification list
   - Mark as read functionality

4. THEME TOGGLE:
   - Wire to theme context (e.g., next-themes)
   - Example:
     import { useTheme } from 'next-themes';
     const { theme, setTheme } = useTheme();
     onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}

5. ACTIVE LINK HIGHLIGHTING:
   - Use Next.js useRouter to get current path
   - Add conditional className for active state
   - Example:
     const router = useRouter();
     const isActive = router.pathname === href;
     className={isActive ? 'text-[#C8AA6E] bg-[#2B2B2F]' : '...'}

6. ANIMATIONS:
   - Add framer-motion for smooth dropdown animations
   - Add page transition effects
   - Stagger mobile menu item animations

7. ACCESSIBILITY:
   - Add aria-labels to icon buttons
   - Add keyboard navigation for dropdowns
   - Add focus trap for mobile menu
   - Test with screen readers
*/
