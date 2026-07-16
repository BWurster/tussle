import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Gender } from '../types'

interface Props {
  active: Gender
  onChange: (g: Gender) => void
}

const OPTIONS: { value: Gender; icon: string; label: string; color: string }[] = [
  { value: 'boy',  icon: '♂︎', label: 'Boy',  color: 'text-blue-500' },
  { value: 'girl', icon: '♀︎', label: 'Girl', color: 'text-pink-500' },
]

export function GenderToggle({ active, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = OPTIONS.find(o => o.value === active)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <span className={`text-base font-bold ${current.color}`}>{current.icon}</span>
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden min-w-[90px]">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold transition-colors
                ${active === opt.value
                  ? 'bg-gray-50 dark:bg-gray-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
              <span className={`text-base ${opt.color}`}>{opt.icon}</span>
              <span className="text-gray-700 dark:text-gray-200">{opt.label}</span>
              {active === opt.value && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full ${opt.value === 'boy' ? 'bg-blue-500' : 'bg-pink-500'}`} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
