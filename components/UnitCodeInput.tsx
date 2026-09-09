'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

const LENGTH = 4
const ALLOWED = /[^A-Z0-9]/g

interface UnitCodeInputProps {
  value: string
  onChange: (value: string) => void
  /** Fired once the 4th character lands, so the portal can look it up. */
  onComplete: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  /** Focus the first box on mount. Off when the field shares a page. */
  autoFocus?: boolean
}

export default function UnitCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus = true,
}: UnitCodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  // The boxes always render a fixed-width slot array; a trailing space means
  // "empty". The value handed back out is the compact string.
  const toSlots = (raw: string) => raw.padEnd(LENGTH, ' ').slice(0, LENGTH).split('')
  const toValue = (slots: string[]) => slots.join('').trimEnd()

  const slots = toSlots(value)

  const focusBox = (index: number) => {
    inputs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus()
  }

  const commit = (next: string) => {
    onChange(next)
    if (next.length === LENGTH) onComplete(next)
  }

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.toUpperCase().replace(ALLOWED, '')
    if (cleaned === '') return

    // Typing into a box replaces that position; pasting more than one
    // character fills the boxes from here onwards.
    const next = toSlots(value)
    for (let i = 0; i < cleaned.length && index + i < LENGTH; i++) {
      next[index + i] = cleaned[i]
    }

    commit(toValue(next))
    focusBox(index + cleaned.length)
  }

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = toSlots(value)
      // Backspace on an empty box steps back and clears the previous one.
      const target = next[index].trim() ? index : index - 1
      if (target < 0) return
      next[target] = ' '
      onChange(toValue(next))
      focusBox(target)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusBox(index - 1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusBox(index + 1)
    }
  }

  const handlePaste = (
    index: number,
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    event.preventDefault()
    handleChange(index, event.clipboardData.getData('text'))
  }

  useEffect(() => {
    if (autoFocus) focusBox(0)
  }, [autoFocus])

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {slots.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el
          }}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label={`Unit code character ${index + 1}`}
          maxLength={LENGTH}
          disabled={disabled}
          value={char.trim()}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-16 w-14 rounded-lg border-2 bg-white text-center font-mono text-3xl font-bold uppercase',
            'shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30',
            'disabled:cursor-not-allowed disabled:opacity-60 sm:h-20 sm:w-16 sm:text-4xl',
            invalid
              ? 'border-red-400 text-red-700 focus:border-red-500'
              : 'border-gray-300 focus:border-primary'
          )}
        />
      ))}
    </div>
  )
}
