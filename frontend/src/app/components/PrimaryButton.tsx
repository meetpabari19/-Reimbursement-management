import { ReactNode } from 'react';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-2.5 rounded-[10px] text-white transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
      } ${className}`}
      style={{
        background: disabled
          ? '#7a9df7'
          : 'linear-gradient(135deg, #3d7eff 0%, #2f6dff 100%)',
        fontFamily: 'var(--font-heading)',
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}
