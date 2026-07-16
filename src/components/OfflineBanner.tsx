import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  return (
    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/90 text-white text-xs font-medium">
      <WifiOff size={12} />
      <span>Offline — AI features disabled</span>
    </div>
  )
}
