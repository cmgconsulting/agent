'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 28, text: 'text-base', gap: 'gap-2' },
    md: { icon: 40, text: 'text-xl', gap: 'gap-3' },
    lg: { icon: 56, text: 'text-3xl', gap: 'gap-4' },
  }

  const s = sizes[size]

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {/* Logo icon - 4 yellow petals */}
      <svg width={s.icon} height={s.icon} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="20" height="20" rx="6" fill="#FEC000"/>
        <rect x="26" y="2" width="20" height="20" rx="6" fill="#FEC000"/>
        <rect x="2" y="26" width="20" height="20" rx="6" fill="#FEC000"/>
        <rect x="26" y="26" width="20" height="20" rx="6" fill="#FEC000"/>
        {/* Subtle lines on petals */}
        <line x1="7" y1="5" x2="7" y2="19" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="12" y1="5" x2="12" y2="19" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="17" y1="5" x2="17" y2="19" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="31" y1="5" x2="31" y2="19" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="36" y1="5" x2="36" y2="19" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="41" y1="5" x2="41" y2="19" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="7" y1="29" x2="7" y2="43" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="12" y1="29" x2="12" y2="43" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="17" y1="29" x2="17" y2="43" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="31" y1="29" x2="31" y2="43" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="36" y1="29" x2="36" y2="43" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
        <line x1="41" y1="29" x2="41" y2="43" stroke="#E5AC00" strokeWidth="0.8" opacity="0.6"/>
      </svg>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`${s.text} font-bold text-ink-700 tracking-tight`}>CMG</span>
          <span className={`${size === 'lg' ? 'text-lg' : size === 'md' ? 'text-sm' : 'text-xs'} font-semibold text-ink-400 tracking-widest`}>AGENT</span>
        </div>
      )}
    </div>
  )
}
