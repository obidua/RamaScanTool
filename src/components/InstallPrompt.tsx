import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Check conditions outside component to avoid re-renders
const getIsIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const getIsStandalone = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches 
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const isIOS = getIsIOS()
  const isStandalone = getIsStandalone()

  useEffect(() => {
    if (isStandalone) return

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return
      }
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Show iOS prompt after a delay if not installed
    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [isIOS, isStandalone])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[100] animate-slide-up">
      <div className="glass-card p-4 border-cyan-500/30 bg-gradient-to-r from-slate-900/95 to-slate-800/95 shadow-2xl">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/20">
            <Smartphone className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Install RamaScan Tools</h3>
            <p className="text-sm text-slate-400 mb-3">
              {isIOS 
                ? 'Tap the share button and "Add to Home Screen" for the best experience.'
                : 'Install our app for quick access and offline features.'}
            </p>
            
            {isIOS ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Tap</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l-2 2h4l-2-2zm0 3c-.55 0-1 .45-1 1v8.59l-2.29-2.3-1.42 1.42 4.71 4.7 4.71-4.7-1.42-1.42-2.29 2.3V6c0-.55-.45-1-1-1z"/>
                </svg>
                <span>then "Add to Home Screen"</span>
              </div>
            ) : (
              <button
                onClick={handleInstall}
                className="btn-primary flex items-center gap-2 text-sm py-2"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
