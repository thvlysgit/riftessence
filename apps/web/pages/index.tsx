import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect logged-in users to feed
  useEffect(() => {
    if (!loading && user) {
      router.push('/feed');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D12] flex items-center justify-center">
        <div className="text-[#C8AA6E] text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D12]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#C8AA6E]/10 via-transparent to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#C8AA6E] to-[#9A8352] rounded-2xl mb-8 shadow-2xl">
              <span className="text-[#1A1A1D] font-bold text-4xl">LFD</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
              Welcome to <span className="text-[#C8AA6E]">RiftEssence</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              The ultimate platform for League of Legends players to find teammates, build communities, 
              and connect with players who match your playstyle.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-gradient-to-r from-[#C8AA6E] to-[#9A8352] hover:from-[#D4B678] hover:to-[#A68F5E] text-[#1A1A1D] font-bold rounded-lg transition-all shadow-lg text-lg"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-[#2B2B2F] hover:bg-[#363639] border border-[#C8AA6E] text-[#C8AA6E] font-bold rounded-lg transition-colors text-lg"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center text-[#C8AA6E] mb-16">Why RiftEssence?</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-[#1A1A1D] border border-[#2B2B2F] rounded-xl p-8 hover:border-[#C8AA6E]/50 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-[#C8AA6E] to-[#9A8352] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#1A1A1D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Find Duo Partners</h3>
            <p className="text-gray-400">
              Connect with players who match your role, rank, and playstyle preferences. Build lasting duos and climb together.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#1A1A1D] border border-[#2B2B2F] rounded-xl p-8 hover:border-[#C8AA6E]/50 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-[#C8AA6E] to-[#9A8352] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#1A1A1D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Verified Accounts</h3>
            <p className="text-gray-400">
              Link your Riot account for instant verification. See real ranks, winrates, and champion pools of potential teammates.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#1A1A1D] border border-[#2B2B2F] rounded-xl p-8 hover:border-[#C8AA6E]/50 transition-colors">
            <div className="w-12 h-12 bg-gradient-to-br from-[#C8AA6E] to-[#9A8352] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#1A1A1D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Community Ratings</h3>
            <p className="text-gray-400">
              Build your reputation through player ratings. See who's a great teammate and who to avoid before you queue up.
            </p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-[#C8AA6E]/20 to-[#9A8352]/20 border-y border-[#C8AA6E]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to find your perfect duo?</h2>
          <p className="text-gray-300 mb-8 text-lg">Join thousands of players already on RiftEssence</p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-gradient-to-r from-[#C8AA6E] to-[#9A8352] hover:from-[#D4B678] hover:to-[#A68F5E] text-[#1A1A1D] font-bold rounded-lg transition-all shadow-lg text-lg"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
}

