'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface HelpTooltipProps {
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function HelpTooltip({ text, position = 'top', className = '' }: HelpTooltipProps) {
  const [show, setShow] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-ink-200 hover:text-brand-400 transition-colors duration-200 p-0.5"
        aria-label="Aide"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {show && (
        <div className={`absolute z-50 ${positionClasses[position]} animate-fade-in`}>
          <div className="bg-ink-600 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg max-w-[240px] leading-relaxed">
            {text}
            <button
              type="button"
              onClick={() => setShow(false)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-ink-500 rounded-full flex items-center justify-center hover:bg-ink-400 md:hidden"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </span>
  )
}

interface SectionHelpProps {
  title: string
  description: string
  tips?: string[]
}

export function SectionHelp({ title, description, tips }: SectionHelpProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="flex items-center gap-1.5 text-xs text-ink-300 hover:text-brand-500 transition-colors bg-surface-100 hover:bg-brand-50 px-2.5 py-1 rounded-full"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Comment ça marche ?</span>
      </button>
      {show && (
        <div className="absolute top-full left-0 mt-2 z-50 animate-slide-up">
          <div className="bg-white border border-surface-200 rounded-2xl shadow-card p-4 max-w-sm">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-ink-700 text-sm">{title}</h4>
              <button onClick={() => setShow(false)} className="text-ink-300 hover:text-ink-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-400 leading-relaxed mb-2">{description}</p>
            {tips && tips.length > 0 && (
              <div className="space-y-1.5 mt-3 pt-3 border-t border-surface-100">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-ink-400">
                    <span className="text-brand-400 font-bold mt-0.5">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
