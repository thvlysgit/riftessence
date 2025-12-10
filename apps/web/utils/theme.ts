// Utility functions to generate themed className strings
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Helper to get themed background classes
export function bgPrimary() {
  return 'bg-[var(--color-bg-primary)]';
}

export function bgSecondary() {
  return 'bg-[var(--color-bg-secondary)]';
}

export function bgTertiary() {
  return 'bg-[var(--color-bg-tertiary)]';
}

// Helper to get themed text classes
export function textPrimary() {
  return 'text-[var(--color-text-primary)]';
}

export function textSecondary() {
  return 'text-[var(--color-text-secondary)]';
}

export function textMuted() {
  return 'text-[var(--color-text-muted)]';
}

export function textAccent() {
  return 'text-[var(--color-accent-1)]';
}

// Helper to get themed border classes
export function borderThemed() {
  return 'border-[var(--color-border)]';
}

export function borderHoverThemed() {
  return 'hover:border-[var(--color-border-hover)]';
}

// Compound helpers
export function cardClasses() {
  return cn(
    bgSecondary(),
    borderThemed(),
    'border',
    'rounded-[var(--border-radius)]',
    'shadow-[var(--shadow)]',
    'p-6'
  );
}

export function buttonPrimaryClasses() {
  return 'bg-gradient-to-r from-[var(--color-accent-1)] to-[var(--color-accent-2)] text-[var(--color-bg-primary)] font-bold px-6 py-3 rounded-[var(--border-radius)] transition-all hover:opacity-90';
}

export function buttonSecondaryClasses() {
  return cn(
    bgTertiary(),
    'border border-[var(--color-accent-1)]',
    'text-[var(--color-accent-1)]',
    'font-bold px-6 py-3',
    'rounded-[var(--border-radius)]',
    'transition-colors',
    'hover:bg-[var(--color-bg-secondary)]'
  );
}

export function inputClasses() {
  return cn(
    bgTertiary(),
    borderThemed(),
    textSecondary(),
    'border',
    'rounded-[var(--border-radius)]',
    'px-4 py-3',
    'transition-all',
    'focus:border-[var(--color-border-hover)]',
    'focus:outline-none'
  );
}
