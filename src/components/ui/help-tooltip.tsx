'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface HelpTooltipProps {
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function HelpTooltip({ text, position = 'top', className = '' }: HelpTooltipProps) {
  const [show, setShow] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLSpanElement>(null)

  const adjustPosition = useCallback(() => {
    if (!show || !tooltipRef.current) return
    const rect = tooltipRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current

    // Reset styles
    tooltip.style.left = ''
    tooltip.style.right = ''
    tooltip.style.transform = ''

    // Check if tooltip goes off-screen left
    if (rect.left < 8) {
      tooltip.style.left = '0'
      tooltip.style.transform = 'translateX(0)'
    }
    // Check if tooltip goes off-screen right
    if (rect.right > window.innerWidth - 8) {
      tooltip.style.left = 'auto'
      tooltip.style.right = '0'
      tooltip.style.transform = 'translateX(0)'
    }
  }, [show])

  useEffect(() => {
    if (show) {
      // Small delay to let the tooltip render first
      requestAnimationFrame(adjustPosition)
    }
  }, [show, adjustPosition])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <span ref={containerRef} className={`relative inline-flex ${className}`}>
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
        <div
          ref={tooltipRef}
          className={`absolute z-[60] ${positionClasses[position]} animate-fade-in`}
        >
          <div className="bg-ink-600 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg max-w-[280px] w-max leading-relaxed"
            style={{ maxWidth: 'min(280px, calc(100vw - 2rem))' }}>
            {text}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShow(false) }}
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
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!show) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShow(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [show])

  // Adjust position if overflows right
  useEffect(() => {
    if (!show || !panelRef.current) return
    requestAnimationFrame(() => {
      if (!panelRef.current) return
      const rect = panelRef.current.getBoundingClientRect()
      if (rect.right > window.innerWidth - 16) {
        panelRef.current.style.left = 'auto'
        panelRef.current.style.right = '0'
      }
    })
  }, [show])

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
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-2 z-[60] animate-slide-up"
          style={{ maxWidth: 'min(24rem, calc(100vw - 2rem))' }}
        >
          <div className="bg-white border border-surface-200 rounded-2xl shadow-card p-4">
            <div className="flex items-start justify-between mb-2 gap-2">
              <h4 className="font-semibold text-ink-700 text-sm">{title}</h4>
              <button onClick={() => setShow(false)} className="text-ink-300 hover:text-ink-500 flex-shrink-0">
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
