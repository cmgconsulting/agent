'use client'

import { ToastProvider } from '@/components/ui/toast-provider'
import { useNotificationsPoll } from '@/hooks/use-notifications-poll'

function NotificationPoller() {
  useNotificationsPoll()
  return null
}

export function LayoutProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <NotificationPoller />
      {children}
    </ToastProvider>
  )
}
