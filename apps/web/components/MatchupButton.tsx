import React from 'react';

type MatchupButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type MatchupButtonSize = 'sm' | 'md' | 'lg';

interface MatchupButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: MatchupButtonVariant;
  size?: MatchupButtonSize;
}

const variantStyles: Record<MatchupButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--btn-gradient)',
    color: 'var(--btn-gradient-text)',
    border: '1px solid rgba(200,170,110,0.42)',
    boxShadow: '0 10px 26px rgba(200,170,110,0.16)',
  },
  secondary: {
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid transparent',
  },
  danger: {
    backgroundColor: 'var(--color-accent-danger-bg)',
    color: 'var(--color-error)',
    border: '1px solid var(--color-accent-danger-border)',
  },
  success: {
    backgroundColor: 'var(--color-accent-success-bg)',
    color: 'var(--color-success)',
    border: '1px solid rgba(34,197,94,0.32)',
  },
};

const sizeClasses: Record<MatchupButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
};

export const MatchupButton: React.FC<MatchupButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  style,
  children,
  ...props
}) => (
  <button
    type={props.type || 'button'}
    className={[
      'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-all',
      'hover:translate-y-[-1px] hover:opacity-90 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50',
      sizeClasses[size],
      className,
    ].join(' ')}
    style={{ ...variantStyles[variant], ...style }}
    {...props}
  >
    {children}
  </button>
);
