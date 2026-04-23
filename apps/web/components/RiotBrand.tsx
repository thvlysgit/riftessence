import Link from 'next/link';
import { SiRiotgames } from 'react-icons/si';

type RiotAuthButtonProps = {
  href?: string;
  label: string;
  className?: string;
};

export function RiotAuthButton({ href = '/authenticate', label, className = '' }: RiotAuthButtonProps) {
  return (
    <Link
      href={href}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 border font-semibold transition-colors ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(209, 54, 57, 0.18), rgba(209, 54, 57, 0.08))',
        borderColor: 'rgba(209, 54, 57, 0.45)',
        color: '#fca5a5',
        borderRadius: 'var(--border-radius)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(209, 54, 57, 0.28), rgba(209, 54, 57, 0.14))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(209, 54, 57, 0.18), rgba(209, 54, 57, 0.08))';
      }}
    >
      <SiRiotgames className="w-5 h-5" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}