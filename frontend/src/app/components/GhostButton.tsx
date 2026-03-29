import { ReactNode } from 'react';

interface GhostButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export function GhostButton({
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}: GhostButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 bg-white rounded-[10px] border transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#f6f8fd]'
      } ${className}`}
      style={{
        color: '#274b80',
        borderColor: '#c3d3eb',
        fontFamily: 'var(--font-heading)',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}
