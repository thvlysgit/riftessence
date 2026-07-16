import React, { forwardRef, useId } from 'react';

type CheckboxTone = 'theme' | 'amber' | 'blue' | 'success' | 'danger';
type CheckboxSize = 'sm' | 'md';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  tone?: CheckboxTone;
  size?: CheckboxSize;
  selected?: boolean;
  inputClassName?: string;
  indicatorClassName?: string;
  labelClassName?: string;
}

const toneStyles: Record<CheckboxTone, React.CSSProperties> = {
  theme: {},
  amber: {
    '--checkbox-accent': '#F59E0B',
    '--checkbox-accent-strong': '#D97706',
    '--checkbox-accent-soft': 'rgba(245, 158, 11, 0.24)',
  } as React.CSSProperties,
  blue: {
    '--checkbox-accent': '#3B82F6',
    '--checkbox-accent-strong': '#2563EB',
    '--checkbox-accent-soft': 'rgba(59, 130, 246, 0.22)',
  } as React.CSSProperties,
  success: {
    '--checkbox-accent': 'var(--color-success)',
    '--checkbox-accent-strong': '#16a34a',
    '--checkbox-accent-soft': 'var(--accent-success-bg)',
  } as React.CSSProperties,
  danger: {
    '--checkbox-accent': 'var(--color-error)',
    '--checkbox-accent-strong': '#dc2626',
    '--checkbox-accent-soft': 'var(--accent-danger-bg)',
  } as React.CSSProperties,
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    children,
    className = '',
    inputClassName = '',
    indicatorClassName = '',
    labelClassName = '',
    style,
    tone = 'theme',
    size = 'md',
    selected,
    id,
    disabled,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hasCustomChildren = children !== undefined && children !== null;

  return (
    <label
      className={[
        'themed-checkbox',
        `themed-checkbox-${size}`,
        disabled ? 'themed-checkbox-disabled' : '',
        className,
      ].join(' ')}
      style={{ ...toneStyles[tone], ...style }}
      htmlFor={inputId}
      data-selected={selected ? 'true' : undefined}
    >
      <span className={['themed-checkbox-field', indicatorClassName].join(' ')}>
        <input
          {...props}
          ref={ref}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          className={['themed-checkbox-input', inputClassName].join(' ')}
        />
        <span className="themed-checkbox-control" aria-hidden="true" />
      </span>
      {hasCustomChildren ? children : (label || description) && (
        <span className={['themed-checkbox-copy', labelClassName].join(' ')}>
          {label && <span className="themed-checkbox-label">{label}</span>}
          {description && <span className="themed-checkbox-description">{description}</span>}
        </span>
      )}
    </label>
  );
});
